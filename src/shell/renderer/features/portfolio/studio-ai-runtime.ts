import {
  createNimiRuntimeAIModel,
  runNimiTextGenerate,
  type NimiGenerateTextRequest,
} from '@nimiplatform/sdk/ai';
import type { NimiJsonObject, NimiMessage } from '@nimiplatform/sdk/contracts';
import {
  createNimiRuntimeRouteOptionsHostDeps,
  listNimiRuntimeRouteOptionsWithHost,
  type NimiRuntimeRouteBinding,
  type NimiRuntimeRouteOptionsSnapshot,
  type Runtime,
} from '@nimiplatform/sdk/runtime';
import {
  ExecutionMode,
  FallbackPolicy,
  RoutePolicy,
  ScenarioType,
  SpeechTimingMode,
  type ExecuteScenarioRequest,
  type ExecuteScenarioResponse,
  type ImageGenerateScenarioSpec,
  type SpeechSynthesizeScenarioSpec,
} from '@nimiplatform/sdk/runtime/generated';
import type { CoreMetadata } from '@nimiplatform/sdk/types';

/**
 * Studio AI runtime route resolver. No env model ids, no Runtime implicit
 * "auto" dispatch: every call is rebound to a concrete Runtime route before it
 * reaches ScenarioService.
 */

export const STUDIO_APP_ID = 'app.nimi.realm-agent-studio' as const;

export type StudioAISurfaceId =
  | 'realm-agent-studio.agent-seed'
  | 'realm-agent-studio.agent-reference-image'
  | 'realm-agent-studio.settings-proposal'
  | 'realm-agent-studio.post-copy'
  | 'realm-agent-studio.visual-image-candidate'
  | 'realm-agent-studio.voice-demo-candidate'
  | 'realm-agent-studio.world-context-projection';

/**
 * Call metadata stamped on every runtime call so the Runtime broker can
 * attribute traces + apply per-surface routing rules.
 */
export function buildStudioRuntimeMetadata(surfaceId: StudioAISurfaceId) {
  return {
    callerKind: 'third-party-app' as const,
    callerId: STUDIO_APP_ID,
    surfaceId,
  };
}

function toStudioCoreMetadata(
  surfaceId: StudioAISurfaceId,
  metadata: NimiJsonObject | undefined,
): CoreMetadata {
  const projected: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (typeof value === 'string') {
      projected[key] = value;
    }
  }
  return {
    ...buildStudioRuntimeMetadata(surfaceId),
    ...projected,
  };
}

function toRuntimeRoutePolicy(route: 'local' | 'cloud' | undefined): RoutePolicy {
  if (route === 'local') return RoutePolicy.LOCAL;
  if (route === 'cloud') return RoutePolicy.CLOUD;
  return RoutePolicy.UNSPECIFIED;
}

export function studioTextMessage(role: NimiMessage['role'], text: string): NimiMessage {
  return {
    role,
    content: [{ type: 'text', text }],
  };
}

export type StudioTextCallDefaults = {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

export type StudioTextCallParams = {
  model: string;
  route?: 'local' | 'cloud';
  connectorId?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

export type StudioTextGeneratePayload = {
  readonly surfaceId: StudioAISurfaceId;
  readonly params: StudioTextCallParams;
  readonly request: NimiGenerateTextRequest;
};

export type StudioRuntimeAIClient = Runtime;

export type StudioTextGenerationOutput = {
  readonly text: string;
  readonly submitted: StudioTextGeneratePayload;
  readonly finishReason?: string;
  readonly trace?: {
    readonly traceId?: string;
    readonly modelResolved?: string;
  };
};

export function resolveStudioTextCallParams(
  _surfaceId: StudioAISurfaceId,
  defaults: StudioTextCallDefaults = {},
): StudioTextCallParams {
  return {
    model: 'auto',
    ...(defaults.temperature !== undefined ? { temperature: defaults.temperature } : {}),
    ...(defaults.topP !== undefined ? { topP: defaults.topP } : {}),
    ...(defaults.maxTokens !== undefined ? { maxTokens: defaults.maxTokens } : {}),
    ...(defaults.timeoutMs !== undefined ? { timeoutMs: defaults.timeoutMs } : {}),
  };
}

type StudioResolvedRuntimeRouteBinding = {
  readonly model: string;
  readonly route: 'local' | 'cloud';
  readonly connectorId?: string;
  readonly localModelId?: string;
  readonly provider?: string;
  readonly snapshot: NimiRuntimeRouteOptionsSnapshot;
};

type StudioRuntimeRouteCapability = 'text.generate' | 'image.generate' | 'audio.synthesize';

function normalizeStudioRouteText(value: unknown): string {
  return String(value || '').trim();
}

function isAutoStudioRouteModel(value: unknown): boolean {
  const normalized = normalizeStudioRouteText(value).toLowerCase();
  return !normalized || normalized === 'auto';
}

function bindingModel(binding: NimiRuntimeRouteBinding): string {
  return normalizeStudioRouteText(binding.modelId || binding.model);
}

function bindingToResolved(
  binding: NimiRuntimeRouteBinding,
  snapshot: NimiRuntimeRouteOptionsSnapshot,
): StudioResolvedRuntimeRouteBinding | null {
  const model = bindingModel(binding);
  if (!model) return null;
  if (binding.source === 'cloud') {
    const connectorId = normalizeStudioRouteText(binding.connectorId);
    if (!connectorId) return null;
    return {
      model,
      route: 'cloud',
      connectorId,
      provider: normalizeStudioRouteText(binding.provider) || undefined,
      snapshot,
    };
  }
  const localModelId = normalizeStudioRouteText(binding.localModelId || binding.goRuntimeLocalModelId);
  return {
    model,
    route: 'local',
    ...(localModelId ? { localModelId } : {}),
    provider: normalizeStudioRouteText(binding.provider || binding.engine) || undefined,
    snapshot,
  };
}

function routeCandidates(snapshot: NimiRuntimeRouteOptionsSnapshot): NimiRuntimeRouteBinding[] {
  return [
    ...snapshot.local.models.map((model): NimiRuntimeRouteBinding => ({
      source: 'local',
      connectorId: '',
      model: normalizeStudioRouteText(model.modelId || model.model),
      modelId: normalizeStudioRouteText(model.modelId || model.model) || undefined,
      provider: normalizeStudioRouteText(model.provider || model.engine) || undefined,
      localModelId: normalizeStudioRouteText(model.localModelId) || undefined,
      engine: normalizeStudioRouteText(model.engine) || undefined,
      endpoint: normalizeStudioRouteText(model.endpoint || snapshot.local.defaultEndpoint) || undefined,
      goRuntimeLocalModelId: normalizeStudioRouteText(model.goRuntimeLocalModelId) || undefined,
      goRuntimeStatus: normalizeStudioRouteText(model.goRuntimeStatus || model.status) || undefined,
    })),
    ...snapshot.connectors.flatMap((connector) =>
      connector.models.map((model): NimiRuntimeRouteBinding => ({
        source: 'cloud',
        connectorId: connector.id,
        model,
        modelId: model,
        provider: normalizeStudioRouteText(connector.provider) || undefined,
      }))),
  ].filter((binding) => bindingModel(binding));
}

function findPreferredRouteCandidate(
  candidates: readonly NimiRuntimeRouteBinding[],
  preferredModel: string,
): NimiRuntimeRouteBinding | null {
  const normalized = preferredModel.toLowerCase();
  const matches = candidates.filter((candidate) => {
    const tokens = [
      candidate.model,
      candidate.modelId,
      candidate.localModelId,
      candidate.goRuntimeLocalModelId,
    ].map((value) => normalizeStudioRouteText(value).toLowerCase()).filter(Boolean);
    return tokens.includes(normalized);
  });
  return matches.length === 1 ? matches[0]! : null;
}

function routeFailureMessage(
  capability: StudioRuntimeRouteCapability,
  snapshot: NimiRuntimeRouteOptionsSnapshot,
  preferredModel: string,
): string {
  const candidates = routeCandidates(snapshot);
  if (!isAutoStudioRouteModel(preferredModel)) {
    return `Runtime ${capability} route binding is missing or ambiguous for model ${preferredModel}.`;
  }
  if (snapshot.selected) {
    return `Runtime ${capability} selected route binding is invalid.`;
  }
  if (candidates.length === 0) {
    return `Runtime ${capability} route binding unavailable.`;
  }
  return `Runtime ${capability} route binding is ambiguous; ${candidates.length} candidates are available and no selected binding was provided.`;
}

export async function resolveStudioRuntimeRouteBinding(input: {
  readonly runtime: Runtime;
  readonly capability: StudioRuntimeRouteCapability;
  readonly preferredModel?: string;
}): Promise<StudioResolvedRuntimeRouteBinding> {
  const preferredModel = normalizeStudioRouteText(input.preferredModel);
  const snapshot = await listNimiRuntimeRouteOptionsWithHost(
    { capability: input.capability },
    createNimiRuntimeRouteOptionsHostDeps(input.runtime),
  );
  const selected = snapshot.selected ? bindingToResolved(snapshot.selected, snapshot) : null;
  if (selected && isAutoStudioRouteModel(preferredModel)) {
    return selected;
  }
  const candidates = routeCandidates(snapshot);
  const preferred = isAutoStudioRouteModel(preferredModel)
    ? (candidates.length === 1 ? candidates[0]! : null)
    : findPreferredRouteCandidate(candidates, preferredModel);
  const resolved = preferred ? bindingToResolved(preferred, snapshot) : null;
  if (!resolved) {
    throw new Error(routeFailureMessage(input.capability, snapshot, preferredModel));
  }
  return resolved;
}

function bindTextPayloadToRoute(
  payload: StudioTextGeneratePayload,
  binding: StudioResolvedRuntimeRouteBinding,
): StudioTextGeneratePayload {
  return {
    ...payload,
    params: {
      ...payload.params,
      model: binding.model,
      route: binding.route,
      ...(binding.connectorId ? { connectorId: binding.connectorId } : {}),
    },
    request: {
      ...payload.request,
      model: {
        modelId: binding.model,
        ...(binding.connectorId ? { providerId: binding.connectorId } : {}),
      },
    },
  };
}

export async function bindStudioTextGeneratePayload(
  payload: StudioTextGeneratePayload,
  runtime: Runtime,
): Promise<StudioTextGeneratePayload> {
  const binding = await resolveStudioRuntimeRouteBinding({
    runtime,
    capability: 'text.generate',
    preferredModel: payload.params.model,
  });
  return bindTextPayloadToRoute(payload, binding);
}

export async function runStudioTextGenerate(
  payload: StudioTextGeneratePayload,
  runtime: StudioRuntimeAIClient,
): Promise<StudioTextGenerationOutput> {
  const boundPayload = await bindStudioTextGeneratePayload(payload, runtime);
  const model = createNimiRuntimeAIModel({
    runtime,
    appId: STUDIO_APP_ID,
    model: boundPayload.request.model,
    routePolicy: boundPayload.params.route,
    connectorId: boundPayload.params.connectorId,
    timeoutMs: boundPayload.params.timeoutMs,
    metadata: toStudioCoreMetadata(boundPayload.surfaceId, boundPayload.request.parameters?.metadata),
  });
  const result = await runNimiTextGenerate({
    runtime: { model },
    request: boundPayload.request,
  });
  if (!result.ok) {
    throw result.error.cause instanceof Error
      ? result.error.cause
      : new Error(result.error.message);
  }
  const raw = result.result.raw && typeof result.result.raw === 'object' && !Array.isArray(result.result.raw)
    ? result.result.raw as { readonly traceId?: unknown; readonly modelResolved?: unknown }
    : {};
  return {
    text: result.text,
    submitted: boundPayload,
    finishReason: result.result.finishReason,
    trace: {
      ...(typeof raw.traceId === 'string' && raw.traceId ? { traceId: raw.traceId } : {}),
      ...(typeof raw.modelResolved === 'string' && raw.modelResolved ? { modelResolved: raw.modelResolved } : {}),
    },
  };
}

export type StudioImageCallDefaults = {
  aspectRatio?: string;
  timeoutMs?: number;
};

export type StudioImageCallParams = {
  model: string;
  route?: 'local' | 'cloud';
  connectorId?: string;
  aspectRatio?: string;
  timeoutMs?: number;
};

export type StudioImageGeneratePayload = {
  readonly surfaceId: StudioAISurfaceId;
  readonly params: StudioImageCallParams;
  readonly request: ExecuteScenarioRequest;
};

export function resolveStudioImageCallParams(
  _surfaceId: StudioAISurfaceId,
  defaults: StudioImageCallDefaults = {},
): StudioImageCallParams {
  return {
    model: 'auto',
    ...(defaults.aspectRatio !== undefined ? { aspectRatio: defaults.aspectRatio } : {}),
    ...(defaults.timeoutMs !== undefined ? { timeoutMs: defaults.timeoutMs } : {}),
  };
}

function createScenarioRequestHead(params: {
  readonly model: string;
  readonly route?: 'local' | 'cloud';
  readonly connectorId?: string;
  readonly timeoutMs?: number;
}) {
  return {
    appId: STUDIO_APP_ID,
    subjectUserId: '',
    modelId: params.model,
    routePolicy: toRuntimeRoutePolicy(params.route),
    fallback: FallbackPolicy.DENY,
    timeoutMs: Number(params.timeoutMs ?? 0),
    connectorId: String(params.connectorId || ''),
  };
}

export function createStudioImageGeneratePayload(input: {
  readonly surfaceId: StudioAISurfaceId;
  readonly params: StudioImageCallParams;
  readonly spec: ImageGenerateScenarioSpec;
}): StudioImageGeneratePayload {
  return {
    surfaceId: input.surfaceId,
    params: input.params,
    request: {
      head: createScenarioRequestHead(input.params),
      scenarioType: ScenarioType.IMAGE_GENERATE,
      executionMode: ExecutionMode.SYNC,
      spec: {
        spec: {
          oneofKind: 'imageGenerate',
          imageGenerate: input.spec,
        },
      },
      extensions: [],
    },
  };
}

function bindScenarioPayloadToRoute<TPayload extends StudioImageGeneratePayload | StudioSpeechSynthesizePayload>(
  payload: TPayload,
  binding: StudioResolvedRuntimeRouteBinding,
): TPayload {
  return {
    ...payload,
    params: {
      ...payload.params,
      model: binding.model,
      route: binding.route,
      ...(binding.connectorId ? { connectorId: binding.connectorId } : {}),
    },
    request: {
      ...payload.request,
      head: createScenarioRequestHead({
        ...payload.params,
        model: binding.model,
        route: binding.route,
        connectorId: binding.connectorId,
      }),
    },
  };
}

export async function bindStudioImageGeneratePayload(
  payload: StudioImageGeneratePayload,
  runtime: Runtime,
): Promise<StudioImageGeneratePayload> {
  const binding = await resolveStudioRuntimeRouteBinding({
    runtime,
    capability: 'image.generate',
    preferredModel: payload.params.model,
  });
  return bindScenarioPayloadToRoute(payload, binding);
}

export async function executeStudioImageGenerate(
  payload: StudioImageGeneratePayload,
  runtime: Runtime,
): Promise<ExecuteScenarioResponse> {
  const boundPayload = await bindStudioImageGeneratePayload(payload, runtime);
  return runtime.ai.executeScenario(boundPayload.request, {
    timeoutMs: boundPayload.params.timeoutMs,
    metadata: toStudioCoreMetadata(boundPayload.surfaceId, undefined),
  });
}

export type StudioSpeechCallDefaults = {
  voice?: string;
  speed?: number;
  timeoutMs?: number;
};

export type StudioSpeechCallParams = {
  model: string;
  route?: 'local' | 'cloud';
  connectorId?: string;
  voice?: string;
  speed?: number;
  timeoutMs?: number;
};

export type StudioSpeechSynthesizePayload = {
  readonly surfaceId: StudioAISurfaceId;
  readonly params: StudioSpeechCallParams;
  readonly request: ExecuteScenarioRequest;
};

export function resolveStudioSpeechCallParams(
  _surfaceId: StudioAISurfaceId,
  defaults: StudioSpeechCallDefaults = {},
): StudioSpeechCallParams {
  return {
    model: 'auto',
    ...(defaults.voice !== undefined ? { voice: defaults.voice } : {}),
    ...(defaults.speed !== undefined ? { speed: defaults.speed } : {}),
    ...(defaults.timeoutMs !== undefined ? { timeoutMs: defaults.timeoutMs } : {}),
  };
}

export function createStudioSpeechSynthesizePayload(input: {
  readonly surfaceId: StudioAISurfaceId;
  readonly params: StudioSpeechCallParams;
  readonly spec: SpeechSynthesizeScenarioSpec;
}): StudioSpeechSynthesizePayload {
  return {
    surfaceId: input.surfaceId,
    params: input.params,
    request: {
      head: createScenarioRequestHead(input.params),
      scenarioType: ScenarioType.SPEECH_SYNTHESIZE,
      executionMode: ExecutionMode.SYNC,
      spec: {
        spec: {
          oneofKind: 'speechSynthesize',
          speechSynthesize: input.spec,
        },
      },
      extensions: [],
    },
  };
}

export async function bindStudioSpeechSynthesizePayload(
  payload: StudioSpeechSynthesizePayload,
  runtime: Runtime,
): Promise<StudioSpeechSynthesizePayload> {
  const binding = await resolveStudioRuntimeRouteBinding({
    runtime,
    capability: 'audio.synthesize',
    preferredModel: payload.params.model,
  });
  return bindScenarioPayloadToRoute(payload, binding);
}

export async function executeStudioSpeechSynthesize(
  payload: StudioSpeechSynthesizePayload,
  runtime: Runtime,
): Promise<ExecuteScenarioResponse> {
  const boundPayload = await bindStudioSpeechSynthesizePayload(payload, runtime);
  return runtime.ai.executeScenario(boundPayload.request, {
    timeoutMs: boundPayload.params.timeoutMs,
    metadata: toStudioCoreMetadata(boundPayload.surfaceId, undefined),
  });
}

export const STUDIO_DEFAULT_SPEECH_TIMING_MODE = SpeechTimingMode.UNSPECIFIED;
