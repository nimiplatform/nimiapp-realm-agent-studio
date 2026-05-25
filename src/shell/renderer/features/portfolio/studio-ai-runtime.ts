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

/**
 * Default text-generate call params. Returns `{ model: 'auto', ...defaults }`
 * today; will read user AIConfig binding for `surfaceId` once that store
 * lands. Callers spread the result into `runtime.ai.text.generate({ ... })`.
 */
export function resolveStudioTextCallParams(
  // surfaceId reserved for future per-surface AIConfig binding lookup
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

/**
 * Default image-generate call params.
 */
export function resolveStudioImageCallParams(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _surfaceId: StudioAISurfaceId,
  defaults: StudioImageCallDefaults = {},
): StudioImageCallParams {
  return {
    model: 'auto',
    ...(defaults.aspectRatio !== undefined ? { aspectRatio: defaults.aspectRatio } : {}),
    ...(defaults.timeoutMs !== undefined ? { timeoutMs: defaults.timeoutMs } : {}),
  };
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

/**
 * Default audio.synthesize / media.tts.synthesize call params.
 */
export function resolveStudioSpeechCallParams(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
