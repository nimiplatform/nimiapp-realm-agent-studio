import { useEffect, useMemo, useState } from 'react';
import { InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import {
  ModelConfigAiModelHub,
  defaultModelConfigProfileCopy,
  useModelConfigProfileController,
  type AppModelConfigSurface,
  type LocalAssetEntry,
  type ModelConfigProjectionStatus,
} from '@nimiplatform/kit/features/model-config';
import { listNimiRuntimeLocalAssetEntries } from '@nimiplatform/sdk/runtime';
import type {
  NimiAICapabilityRequirementDeclaration,
  NimiAIConfig,
  NimiAIConfigTargetRef,
  NimiAIScopeRef,
} from '@nimiplatform/sdk/ai';
import { createStudioRuntimeClient } from '@renderer/data/runtime-client.js';
import { ensureStudioRuntimeClientReady } from '@renderer/infra/studio-bootstrap.js';
import { createStudioRuntimeModelPickerProviderCache } from './studio-runtime-model-provider.js';
import {
  createStudioAIConfigService,
  createStudioAIScopeRef,
} from './studio-ai-config-store.js';
import { translateStudioModelConfigCopy } from './studio-ai-config-copy.js';

const STUDIO_ENABLED_AI_CAPABILITIES = [
  'text.generate',
  'image.generate',
  'audio.synthesize',
] as const;

function createRequirementDeclaration(scopeRef: NimiAIScopeRef): NimiAICapabilityRequirementDeclaration {
  return {
    requirementId: `${scopeRef.ownerId}:${scopeRef.surfaceId || 'default'}:studio-ai`,
    scopeRef,
    requiredSlices: STUDIO_ENABLED_AI_CAPABILITIES.map((capability) => ({
      requirementSliceId: `studio-ai.${capability}`,
      capability,
      profileSliceRef: `studio-ai.${capability}`,
      readinessPolicy: 'required',
    })),
    setupProjectionPolicy: 'sdk-ai-config-setup-projection',
  };
}

function targetRefDetail(targetRef: NimiAIConfigTargetRef): string | null {
  if (targetRef.kind === 'cloud-connector') {
    return [targetRef.provider || targetRef.connectorId, targetRef.providerModelId]
      .filter(Boolean)
      .join(' / ');
  }
  if (targetRef.kind === 'local-runtime') {
    return targetRef.profileId || targetRef.targetId || targetRef.readinessRef || null;
  }
  return `${targetRef.sourceProfileId}:${targetRef.sliceId}`;
}

function bindingStatus(
  config: NimiAIConfig,
  capabilityId: string,
  runtimeReady: boolean,
  runtimeDetail: string | null,
): ModelConfigProjectionStatus {
  if (!runtimeReady) {
    return {
      supported: false,
      tone: 'attention',
      badgeLabel: 'Runtime unavailable',
      title: 'Runtime unavailable',
      detail: runtimeDetail || 'Runtime readiness has not succeeded.',
    };
  }
  const targetRef = config.capabilities.targetRefs[capabilityId] || null;
  if (!targetRef) {
    return {
      supported: false,
      tone: 'attention',
      badgeLabel: 'Needs target',
      title: 'Target required',
      detail: 'Runtime calls fail closed until this capability has an AIConfig target.',
    };
  }
  return {
    supported: true,
    tone: 'ready',
    badgeLabel: 'Bound',
    title: 'Target configured',
    detail: targetRefDetail(targetRef),
  };
}

function useLiveAIConfig(service: ReturnType<typeof createStudioAIConfigService>, scopeRef: NimiAIScopeRef): NimiAIConfig {
  const [config, setConfig] = useState<NimiAIConfig>(() => service.aiConfig.get(scopeRef));
  useEffect(() => {
    setConfig(service.aiConfig.get(scopeRef));
    return service.aiConfig.subscribe(scopeRef, setConfig);
  }, [service, scopeRef]);
  return config;
}

function useStudioRuntimeReadiness(): { ready: boolean; detail: string | null } {
  const [state, setState] = useState<{ ready: boolean; detail: string | null }>({
    ready: false,
    detail: 'Runtime readiness pending.',
  });

  useEffect(() => {
    let cancelled = false;
    void ensureStudioRuntimeClientReady()
      .then(async () => {
        const runtime = await createStudioRuntimeClient();
        if (cancelled) return;
        setState(runtime
          ? { ready: true, detail: null }
          : { ready: false, detail: 'Runtime client unavailable.' });
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            ready: false,
            detail: error instanceof Error ? error.message : String(error),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function useStudioRuntimeLocalAssetSource(runtimeReady: boolean): AppModelConfigSurface['localAssetSource'] {
  const [assets, setAssets] = useState<LocalAssetEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!runtimeReady) {
      setAssets([]);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    void ensureStudioRuntimeClientReady()
      .then(() => createStudioRuntimeClient())
      .then(async (runtime) => {
        if (!runtime) {
          return [];
        }
        return listNimiRuntimeLocalAssetEntries(runtime);
      })
      .then((next) => {
        if (cancelled) return;
        setAssets(next.map((asset) => ({
          localAssetId: asset.localAssetId,
          assetId: asset.assetId,
          kind: asset.kind,
          engine: asset.engine,
          status: asset.status,
        })));
      })
      .catch(() => {
        if (!cancelled) {
          setAssets([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [runtimeReady]);

  return useMemo(() => ({
    list: () => assets,
    loading,
  }), [assets, loading]);
}

export function StudioAIConfigPage() {
  const scopeRef = useMemo(() => createStudioAIScopeRef(), []);
  const service = useMemo(() => createStudioAIConfigService(), []);
  const config = useLiveAIConfig(service, scopeRef);
  const runtime = useStudioRuntimeReadiness();
  const localAssetSource = useStudioRuntimeLocalAssetSource(runtime.ready);
  const providerResolver = useMemo(() => createStudioRuntimeModelPickerProviderCache(), []);

  const surface: AppModelConfigSurface = useMemo(() => ({
    scopeRef,
    aiConfigService: service,
    requirementDeclaration: createRequirementDeclaration(scopeRef),
    providerResolver: (capabilityId: string) => (runtime.ready ? providerResolver(capabilityId) : null),
    projectionResolver: (capabilityId: string) => bindingStatus(config, capabilityId, runtime.ready, runtime.detail),
    localAssetSource,
    runtimeNotReadyLabel: runtime.detail || 'Runtime unavailable',
    i18n: { t: translateStudioModelConfigCopy },
  }), [config, localAssetSource, providerResolver, runtime.detail, runtime.ready, scopeRef, service]);

  const profileCopy = useMemo(() => defaultModelConfigProfileCopy(translateStudioModelConfigCopy), []);
  const currentOrigin = useMemo(
    () => (config.profileOrigin
      ? { profileId: config.profileOrigin.profileId, title: config.profileOrigin.title }
      : null),
    [config.profileOrigin],
  );
  const profile = useModelConfigProfileController({
    scopeRef,
    aiConfigService: service,
    requirementDeclaration: surface.requirementDeclaration,
    copy: profileCopy,
    currentOrigin,
  });

  return (
    <div className="ras-page">
      <Surface tone="panel" material="glass-regular" padding="lg" className="ras-radius-xl">
        <div className="mb-5 flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="m-0 text-2xl font-semibold">AI model config</h2>
            <p className="m-0 mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
              Bind Runtime targets for Studio text, image, and voice generation.
            </p>
          </div>
          <StatusBadge tone={runtime.ready ? 'success' : 'warning'} shape="dot">
            {runtime.ready ? 'Runtime ready' : 'Runtime unavailable'}
          </StatusBadge>
        </div>
        {runtime.ready ? null : (
          <InlineAlert tone="warning" className="mb-4">
            {runtime.detail || 'Runtime unavailable.'}
          </InlineAlert>
        )}
        <ModelConfigAiModelHub surface={surface} profile={profile} />
      </Surface>
    </div>
  );
}
