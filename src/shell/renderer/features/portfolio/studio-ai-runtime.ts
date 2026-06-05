import {
  createNimiRuntimeAIModel,
  runNimiTextGenerate,
  type NimiGenerateTextRequest,
  type NimiRuntimeAIModelOptions,
} from '@nimiplatform/sdk/ai';
import type { NimiJsonObject, NimiMessage } from '@nimiplatform/sdk/contracts';
import type { Runtime } from '@nimiplatform/sdk/runtime';
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
 * Studio AI runtime call-params resolver.
 *
 * Mirrors the parentos pattern (apps/parentos/src/shell/renderer/features/settings/parentos-ai-runtime.ts):
 *
 *   1. The app does **not** read `VITE_RUNTIME_*_MODEL` env vars to pick a model.
 *      Model selection lives in the Runtime layer; the app just asks for `'auto'`.
 *   2. When a future Studio AI-settings store admits an explicit per-capability
 *      binding (model/route/connectorId), this helper is the single point that
 *      reads it and merges it into call params. Until that store lands, all
 *      Studio surfaces use `{ model: 'auto' }` — Runtime applies its default
 *      route + model per capability.
 *   3. The returned shape is designed to spread directly into SDK calls:
 *      `runtime.ai.text.generate({ ...params, system, input })`.
 *
 * This file intentionally has zero env reads. If a build pipeline wants to
 * pin a model for development, do it at the Runtime layer, not in Studio JS.
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
  /** `'auto'` = let Runtime pick. Future: real model id from AIConfig store. */
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

export type StudioRuntimeAIClient = NimiRuntimeAIModelOptions['runtime'];

export type StudioTextGenerationOutput = {
  readonly text: string;
  readonly finishReason?: string;
  readonly trace?: {
    readonly traceId?: string;
    readonly modelResolved?: string;
  };
};

/**
 * Default text-generate call params. Returns `{ model: 'auto', ...defaults }`
 * today; will read user AIConfig binding for `surfaceId` once that store
 * lands. Callers spread the result into `runtime.ai.text.generate({ ... })`.
 */
export function resolveStudioTextCallParams(
  // surfaceId reserved for future per-surface AIConfig binding lookup
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

export async function runStudioTextGenerate(
  payload: StudioTextGeneratePayload,
  runtime: StudioRuntimeAIClient,
): Promise<StudioTextGenerationOutput> {
  const model = createNimiRuntimeAIModel({
    runtime,
    appId: STUDIO_APP_ID,
    model: payload.request.model,
    routePolicy: payload.params.route,
    connectorId: payload.params.connectorId,
    timeoutMs: payload.params.timeoutMs,
    metadata: toStudioCoreMetadata(payload.surfaceId, payload.request.parameters?.metadata),
  });
  const result = await runNimiTextGenerate({
    runtime: { model },
    request: payload.request,
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

/**
 * Default image-generate call params.
 */
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

export async function executeStudioImageGenerate(
  payload: StudioImageGeneratePayload,
  runtime: Runtime,
): Promise<ExecuteScenarioResponse> {
  return runtime.ai.executeScenario(payload.request, {
    timeoutMs: payload.params.timeoutMs,
    metadata: toStudioCoreMetadata(payload.surfaceId, undefined),
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

/**
 * Default speech-synthesize call params.
 */
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

export async function executeStudioSpeechSynthesize(
  payload: StudioSpeechSynthesizePayload,
  runtime: Runtime,
): Promise<ExecuteScenarioResponse> {
  return runtime.ai.executeScenario(payload.request, {
    timeoutMs: payload.params.timeoutMs,
    metadata: toStudioCoreMetadata(payload.surfaceId, undefined),
  });
}

export const STUDIO_DEFAULT_SPEECH_TIMING_MODE = SpeechTimingMode.UNSPECIFIED;
