import type {
  RealmAgentControllerSelectAvatarOperationRequest,
  RealmAgentControllerSelectAvatarOperationResponse,
} from '@nimiplatform/sdk/realm/generated';
import type { Runtime } from '@nimiplatform/sdk/runtime';
import type { ExecuteScenarioResponse, ScenarioArtifact } from '@nimiplatform/sdk/runtime/generated';
import { createStudioRealmClient, type StudioRealmSurface } from '@renderer/data/realm-client.js';
import { createStudioRuntimeClient } from '@renderer/data/runtime-client.js';
import {
  bindStudioImageGeneratePayload,
  bindStudioSpeechSynthesizePayload,
  executeStudioImageGenerate,
  executeStudioSpeechSynthesize,
  isStudioAIRouteBindingFailure,
} from './studio-ai-runtime.js';
import type { OwnerPortfolioAgentDetail } from './portfolio-data.js';
import {
  VISUAL_IMAGE_GENERATION_SOURCE,
  VOICE_DEMO_SYNTHESIS_SOURCE,
  buildReviewedAvatarPackageCandidatePayload,
  buildReviewedAvatarPackageImageGenerationPayload,
  buildReviewedVisualImageCandidatePayload,
  buildReviewedVisualImageGenerationPayload,
  buildReviewedVoiceDemoCandidatePayload,
  buildReviewedVoiceSynthesisPayload,
  type AvatarPackageCandidateInput,
  type ReviewedAvatarPackageCandidatePayload,
  type ReviewedVisualImageCandidatePayload,
  type ReviewedVoiceDemoCandidatePayload,
  type VisualImageGenerationInput,
  type VoiceDemoCandidateInput,
} from './media-voice-candidate.js';
import {
  projectStudioRuntimeArtifacts,
  type StudioRuntimeArtifactProjection,
} from './runtime-artifact-projection.js';

type StudioRealmClient = StudioRealmSurface;

type RealmSelectAvatarInput = RealmAgentControllerSelectAvatarOperationRequest['body'];
type RealmSelectAvatarResponse = RealmAgentControllerSelectAvatarOperationResponse;

export const REALM_AGENT_AVATAR_SELECT_SOURCE = 'Realm AgentsService.agentControllerSelectAvatar';
export const FORGE_IMPORTED_PROFILE_MEDIA_SOURCE =
  'Realm AgentCuratedSystemService.updateForgeImportedSystemAgentProfileMedia';
export const FORGE_IMPORTED_VOICE_SOURCE =
  'Realm AgentCuratedSystemService.updateForgeImportedSystemAgentVoice';

type RuntimeVoiceClient = Runtime;
type RuntimeImageClient = Runtime;

export type RealmAgentAvatarSelectResult =
  | {
    ok: true;
    source: typeof REALM_AGENT_AVATAR_SELECT_SOURCE;
    publicTruth: true;
    submitted: RealmSelectAvatarInput;
    realm: {
      success: true;
    };
  }
  | {
    ok: false;
    source: typeof REALM_AGENT_AVATAR_SELECT_SOURCE;
    publicTruth: false;
    failure: 'avatar-url-invalid' | 'realm-select-avatar-failed' | 'realm-select-avatar-rejected';
    message: string;
    submitted: RealmSelectAvatarInput | null;
  };

export type ForgeImportedProfileMediaInput = {
  avatarUrl?: string;
  profileCoverUrl?: string;
};

export type ForgeImportedVoiceInput = {
  voiceId?: string;
  description?: string;
  emotionEnabled?: boolean;
  speed?: number;
  pitch?: number;
  speechModelId?: string;
  speechRoutePolicy?: 'local' | 'cloud';
};

type ForgeImportedProfileMediaFailure =
  | 'profile-media-scope-unsupported'
  | 'profile-media-no-reviewed-changes'
  | 'avatar-url-invalid'
  | 'profile-cover-url-invalid'
  | 'realm-update-profile-media-failed';

export type ForgeImportedProfileMediaPromotionResult =
  | {
    ok: true;
    source: typeof FORGE_IMPORTED_PROFILE_MEDIA_SOURCE;
    publicTruth: true;
    submitted: ForgeImportedProfileMediaInput;
    agent: unknown;
  }
  | {
    ok: false;
    source: typeof FORGE_IMPORTED_PROFILE_MEDIA_SOURCE;
    publicTruth: false;
    failure: ForgeImportedProfileMediaFailure;
    message: string;
    submitted: ForgeImportedProfileMediaInput | null;
  };

type ForgeImportedVoiceFailure =
  | 'voice-scope-unsupported'
  | 'voice-no-reviewed-changes'
  | 'voice-id-invalid'
  | 'voice-description-invalid'
  | 'voice-speed-invalid'
  | 'voice-pitch-invalid'
  | 'voice-speech-model-invalid'
  | 'voice-speech-route-invalid'
  | 'realm-update-voice-failed';

export type ForgeImportedVoicePromotionResult =
  | {
    ok: true;
    source: typeof FORGE_IMPORTED_VOICE_SOURCE;
    publicTruth: true;
    submitted: ForgeImportedVoiceInput;
    agent: unknown;
  }
  | {
    ok: false;
    source: typeof FORGE_IMPORTED_VOICE_SOURCE;
    publicTruth: false;
    failure: ForgeImportedVoiceFailure;
    message: string;
    submitted: ForgeImportedVoiceInput | null;
  };
export type RuntimeVisualImageGenerationResult =
  | {
    ok: true;
    source: typeof VISUAL_IMAGE_GENERATION_SOURCE;
    candidate: true;
    publicTruth: false;
    draft: ReviewedVisualImageCandidatePayload | ReviewedAvatarPackageCandidatePayload;
    runtime: {
      jobId?: string;
      artifactIds: string[];
      artifactUris: string[];
      previewUrls: string[];
      artifacts: StudioRuntimeArtifactProjection[];
      traceId?: string;
      modelResolved?: string;
    };
  }
  | {
    ok: false;
    source: typeof VISUAL_IMAGE_GENERATION_SOURCE;
    failure:
      | 'runtime-payload-invalid'
      | 'runtime-transport-unavailable'
      | 'runtime-route-unbound'
      | 'runtime-generate-failed'
      | 'runtime-output-missing';
    message: string;
    draft: ReviewedVisualImageCandidatePayload | ReviewedAvatarPackageCandidatePayload | null;
  };

export type RuntimeVoiceDemoSynthesisResult =
  | {
    ok: true;
    source: typeof VOICE_DEMO_SYNTHESIS_SOURCE;
    candidate: true;
    publicTruth: false;
    draft: ReviewedVoiceDemoCandidatePayload;
    runtime: {
      jobId?: string;
      artifactIds: string[];
      previewUrls: string[];
      artifacts: StudioRuntimeArtifactProjection[];
      traceId?: string;
      modelResolved?: string;
    };
  }
  | {
    ok: false;
    source: typeof VOICE_DEMO_SYNTHESIS_SOURCE;
    failure:
      | 'runtime-payload-invalid'
      | 'runtime-transport-unavailable'
      | 'runtime-route-unbound'
      | 'runtime-synthesize-failed'
      | 'runtime-output-missing';
    message: string;
    draft: ReviewedVoiceDemoCandidatePayload | null;
  };

function normalizeAvatarUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

async function normalizeRuntimeVoiceDemoSynthesisOutput(
  runtime: Runtime,
  output: ExecuteScenarioResponse,
  draft: ReviewedVoiceDemoCandidatePayload,
): Promise<RuntimeVoiceDemoSynthesisResult> {
  const scenarioOutput = output.output?.output;
  const artifacts: readonly ScenarioArtifact[] = scenarioOutput?.oneofKind === 'speechSynthesize'
    ? scenarioOutput.speechSynthesize.artifacts
    : [];
  const projectedArtifacts = await projectStudioRuntimeArtifacts(runtime, artifacts);
  const artifactIds = projectedArtifacts
    .map((artifact) => artifact.artifactId)
    .filter((artifactId): artifactId is string => Boolean(artifactId));
  const previewUrls = projectedArtifacts
    .map((artifact) => artifact.previewUrl)
    .filter((previewUrl): previewUrl is string => Boolean(previewUrl));

  if (artifactIds.length === 0) {
    return {
      ok: false,
      source: VOICE_DEMO_SYNTHESIS_SOURCE,
      failure: 'runtime-output-missing',
      message: 'Runtime speechSynthesize scenario output missing artifact id.',
      draft,
    };
  }

  return {
    ok: true,
    source: VOICE_DEMO_SYNTHESIS_SOURCE,
    candidate: true,
    publicTruth: false,
    draft,
    runtime: {
      artifactIds,
      previewUrls,
      artifacts: projectedArtifacts,
      ...(output.traceId ? { traceId: output.traceId } : {}),
      ...(output.modelResolved ? { modelResolved: output.modelResolved } : {}),
    },
  };
}

async function normalizeRuntimeVisualImageGenerationOutput(
  runtime: Runtime,
  output: ExecuteScenarioResponse,
  draft: ReviewedVisualImageCandidatePayload | ReviewedAvatarPackageCandidatePayload,
): Promise<RuntimeVisualImageGenerationResult> {
  const scenarioOutput = output.output?.output;
  const artifacts: readonly ScenarioArtifact[] = scenarioOutput?.oneofKind === 'imageGenerate'
    ? scenarioOutput.imageGenerate.artifacts
    : [];
  const projectedArtifacts = await projectStudioRuntimeArtifacts(runtime, artifacts);
  const artifactIds = projectedArtifacts
    .map((artifact) => artifact.artifactId)
    .filter((artifactId): artifactId is string => Boolean(artifactId));
  const artifactUris = projectedArtifacts
    .map((artifact) => artifact.publicUri)
    .filter((uri): uri is string => Boolean(uri));
  const previewUrls = projectedArtifacts
    .map((artifact) => artifact.previewUrl)
    .filter((previewUrl): previewUrl is string => Boolean(previewUrl));

  if (projectedArtifacts.length === 0) {
    return {
      ok: false,
      source: VISUAL_IMAGE_GENERATION_SOURCE,
      failure: 'runtime-output-missing',
      message: 'Runtime imageGenerate scenario output missing readable artifact.',
      draft,
    };
  }

  return {
    ok: true,
    source: VISUAL_IMAGE_GENERATION_SOURCE,
    candidate: true,
    publicTruth: false,
    draft,
    runtime: {
      artifactIds,
      artifactUris,
      previewUrls,
      artifacts: projectedArtifacts,
      ...(output.traceId ? { traceId: output.traceId } : {}),
      ...(output.modelResolved ? { modelResolved: output.modelResolved } : {}),
    },
  };
}
export function buildRealmSelectAvatarInput(avatarUrl: string): RealmSelectAvatarInput | null {
  const normalizedAvatarUrl = normalizeAvatarUrl(avatarUrl);
  if (!normalizedAvatarUrl) {
    return null;
  }

  return {
    avatarUrl: normalizedAvatarUrl,
  };
}

export function buildForgeImportedProfileMediaInput(
  input: ForgeImportedProfileMediaInput,
): {
  input: ForgeImportedProfileMediaInput | null;
  failure?: Exclude<ForgeImportedProfileMediaFailure, 'profile-media-scope-unsupported' | 'realm-update-profile-media-failed'>;
  message?: string;
} {
  const built: ForgeImportedProfileMediaInput = {};
  if (Object.prototype.hasOwnProperty.call(input, 'avatarUrl')) {
    const avatarUrl = normalizeAvatarUrl(String(input.avatarUrl || ''));
    if (!avatarUrl) {
      return {
        input: null,
        failure: 'avatar-url-invalid',
        message: 'Reviewed avatar promotion requires a valid http(s) URL.',
      };
    }
    built.avatarUrl = avatarUrl;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'profileCoverUrl')) {
    const profileCoverUrl = normalizeAvatarUrl(String(input.profileCoverUrl || ''));
    if (!profileCoverUrl) {
      return {
        input: null,
        failure: 'profile-cover-url-invalid',
        message: 'Reviewed profile-cover promotion requires a valid http(s) URL.',
      };
    }
    built.profileCoverUrl = profileCoverUrl;
  }
  if (!Object.prototype.hasOwnProperty.call(built, 'avatarUrl')
    && !Object.prototype.hasOwnProperty.call(built, 'profileCoverUrl')) {
    return {
      input: null,
      failure: 'profile-media-no-reviewed-changes',
      message: 'Reviewed profile media promotion requires avatarUrl or profileCoverUrl.',
    };
  }
  return { input: built };
}

function normalizeVoiceText(value: unknown): string | null {
  const text = String(value || '').trim();
  return text ? text : null;
}

function normalizeVoiceNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function buildForgeImportedVoiceInput(
  input: ForgeImportedVoiceInput,
): {
  input: ForgeImportedVoiceInput | null;
  failure?: Exclude<ForgeImportedVoiceFailure, 'voice-scope-unsupported' | 'realm-update-voice-failed'>;
  message?: string;
} {
  const built: ForgeImportedVoiceInput = {};
  if (Object.prototype.hasOwnProperty.call(input, 'voiceId')) {
    const voiceId = normalizeVoiceText(input.voiceId);
    if (!voiceId) {
      return {
        input: null,
        failure: 'voice-id-invalid',
        message: 'Reviewed voice promotion requires a non-empty voiceId.',
      };
    }
    built.voiceId = voiceId;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'description')) {
    const description = normalizeVoiceText(input.description);
    if (!description) {
      return {
        input: null,
        failure: 'voice-description-invalid',
        message: 'Reviewed voice promotion requires a non-empty voice description.',
      };
    }
    built.description = description;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'emotionEnabled')) {
    built.emotionEnabled = Boolean(input.emotionEnabled);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'speed')) {
    const speed = normalizeVoiceNumber(input.speed);
    if (speed === null || speed < -50 || speed > 100) {
      return {
        input: null,
        failure: 'voice-speed-invalid',
        message: 'Reviewed voice speed must be between -50 and 100.',
      };
    }
    built.speed = speed;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'pitch')) {
    const pitch = normalizeVoiceNumber(input.pitch);
    if (pitch === null || pitch < -12 || pitch > 12) {
      return {
        input: null,
        failure: 'voice-pitch-invalid',
        message: 'Reviewed voice pitch must be between -12 and 12.',
      };
    }
    built.pitch = pitch;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'speechModelId')) {
    const speechModelId = normalizeVoiceText(input.speechModelId);
    if (!speechModelId) {
      return {
        input: null,
        failure: 'voice-speech-model-invalid',
        message: 'Reviewed voice speech route requires a non-empty speech model id.',
      };
    }
    built.speechModelId = speechModelId;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'speechRoutePolicy')) {
    const speechRoutePolicy = normalizeVoiceText(input.speechRoutePolicy);
    if (speechRoutePolicy !== 'local' && speechRoutePolicy !== 'cloud') {
      return {
        input: null,
        failure: 'voice-speech-route-invalid',
        message: 'Reviewed voice speech route policy must be local or cloud.',
      };
    }
    built.speechRoutePolicy = speechRoutePolicy;
  }
  if (Object.keys(built).length === 0) {
    return {
      input: null,
      failure: 'voice-no-reviewed-changes',
      message: 'Reviewed voice promotion requires voiceId, description, emotionEnabled, speed, pitch, speechModelId, or speechRoutePolicy.',
    };
  }
  return { input: built };
}

export function normalizeRealmAgentAvatarSelectResult(
  response: RealmSelectAvatarResponse,
  submitted: RealmSelectAvatarInput,
): RealmAgentAvatarSelectResult {
  if (!response || typeof response !== 'object' || (response as unknown as Record<string, unknown>).success !== true) {
    return {
      ok: false,
      source: REALM_AGENT_AVATAR_SELECT_SOURCE,
      publicTruth: false,
      failure: 'realm-select-avatar-rejected',
      message: 'Realm avatar selection did not confirm success.',
      submitted,
    };
  }

  return {
    ok: true,
    source: REALM_AGENT_AVATAR_SELECT_SOURCE,
    publicTruth: true,
    submitted,
    realm: {
      success: true,
    },
  };
}

export async function promoteReviewedForgeImportedProfileMedia(
  agent: OwnerPortfolioAgentDetail,
  input: ForgeImportedProfileMediaInput,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<ForgeImportedProfileMediaPromotionResult> {
  if (agent.ownerScope !== 'forge-imported-system') {
    return {
      ok: false,
      source: FORGE_IMPORTED_PROFILE_MEDIA_SOURCE,
      publicTruth: false,
      failure: 'profile-media-scope-unsupported',
      message: 'Forge-imported profile media promotion requires a curated system-agent target.',
      submitted: null,
    };
  }
  const built = buildForgeImportedProfileMediaInput(input);
  if (!built.input) {
    return {
      ok: false,
      source: FORGE_IMPORTED_PROFILE_MEDIA_SOURCE,
      publicTruth: false,
      failure: built.failure || 'profile-media-no-reviewed-changes',
      message: built.message || 'Reviewed profile media payload invalid.',
      submitted: null,
    };
  }
  try {
    const updatedAgent = await realm.updateForgeImportedSystemAgentProfileMedia({
      path: { agentId: agent.id },
      body: built.input,
    });
    return {
      ok: true,
      source: FORGE_IMPORTED_PROFILE_MEDIA_SOURCE,
      publicTruth: true,
      submitted: built.input,
      agent: updatedAgent,
    };
  } catch (error) {
    return {
      ok: false,
      source: FORGE_IMPORTED_PROFILE_MEDIA_SOURCE,
      publicTruth: false,
      failure: 'realm-update-profile-media-failed',
      message: error instanceof Error ? error.message : 'Realm Forge-imported profile media update failed.',
      submitted: built.input,
    };
  }
}

export async function promoteReviewedForgeImportedVoice(
  agent: OwnerPortfolioAgentDetail,
  input: ForgeImportedVoiceInput,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<ForgeImportedVoicePromotionResult> {
  if (agent.ownerScope !== 'forge-imported-system') {
    return {
      ok: false,
      source: FORGE_IMPORTED_VOICE_SOURCE,
      publicTruth: false,
      failure: 'voice-scope-unsupported',
      message: 'Forge-imported voice promotion requires a curated system-agent target.',
      submitted: null,
    };
  }
  const built = buildForgeImportedVoiceInput(input);
  if (!built.input) {
    return {
      ok: false,
      source: FORGE_IMPORTED_VOICE_SOURCE,
      publicTruth: false,
      failure: built.failure || 'voice-no-reviewed-changes',
      message: built.message || 'Reviewed voice payload invalid.',
      submitted: null,
    };
  }
  try {
    const updatedAgent = await realm.updateForgeImportedSystemAgentVoice({
      path: { agentId: agent.id },
      body: built.input,
    });
    return {
      ok: true,
      source: FORGE_IMPORTED_VOICE_SOURCE,
      publicTruth: true,
      submitted: built.input,
      agent: updatedAgent,
    };
  } catch (error) {
    return {
      ok: false,
      source: FORGE_IMPORTED_VOICE_SOURCE,
      publicTruth: false,
      failure: 'realm-update-voice-failed',
      message: error instanceof Error ? error.message : 'Realm Forge-imported voice update failed.',
      submitted: built.input,
    };
  }
}

export async function selectReviewedAgentAvatarUrl(
  agentId: string,
  avatarUrl: string,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<RealmAgentAvatarSelectResult> {
  const submitted = buildRealmSelectAvatarInput(avatarUrl);
  if (!submitted) {
    return {
      ok: false,
      source: REALM_AGENT_AVATAR_SELECT_SOURCE,
      publicTruth: false,
      failure: 'avatar-url-invalid',
      message: 'Avatar URL selection requires a valid http(s) URL.',
      submitted: null,
    };
  }

  try {
    const response = await realm.agentControllerSelectAvatar({
      path: { id: agentId },
      body: submitted,
    });
    return normalizeRealmAgentAvatarSelectResult(response, submitted);
  } catch (error) {
    return {
      ok: false,
      source: REALM_AGENT_AVATAR_SELECT_SOURCE,
      publicTruth: false,
      failure: 'realm-select-avatar-failed',
      message: error instanceof Error ? error.message : 'Realm avatar selection failed.',
      submitted,
    };
  }
}
export async function synthesizeReviewedVoiceDemo(
  input: VoiceDemoCandidateInput,
  agent: OwnerPortfolioAgentDetail,
  runtime?: RuntimeVoiceClient | null,
): Promise<RuntimeVoiceDemoSynthesisResult> {
  const draft = buildReviewedVoiceDemoCandidatePayload(input, agent);
  const synthesisPayload = buildReviewedVoiceSynthesisPayload(input);

  if (!draft.payload || !synthesisPayload.payload) {
    return {
      ok: false,
      source: VOICE_DEMO_SYNTHESIS_SOURCE,
      failure: 'runtime-payload-invalid',
      message: synthesisPayload.errors.join('; ') || 'Runtime speechSynthesize scenario payload invalid.',
      draft: draft.payload,
    };
  }

  const runtimeClient = runtime === undefined ? await createStudioRuntimeClient() : runtime;

  if (!runtimeClient) {
    return {
      ok: false,
      source: VOICE_DEMO_SYNTHESIS_SOURCE,
      failure: 'runtime-transport-unavailable',
      message: 'Runtime speechSynthesize scenario transport unavailable: Tauri IPC runtime transport is required.',
      draft: draft.payload,
    };
  }

  try {
    const boundPayload = await bindStudioSpeechSynthesizePayload(synthesisPayload.payload, runtimeClient);
    const boundDraft = {
      ...draft.payload,
      runtime: {
        ...draft.payload.runtime,
        request: boundPayload,
      },
    };
    const output = await executeStudioSpeechSynthesize(boundPayload, runtimeClient);
    return await normalizeRuntimeVoiceDemoSynthesisOutput(runtimeClient, output, boundDraft);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'runtime transport call failed.';
    const routeUnbound = isStudioAIRouteBindingFailure(error);
    return {
      ok: false,
      source: VOICE_DEMO_SYNTHESIS_SOURCE,
      failure: routeUnbound ? 'runtime-route-unbound' : 'runtime-synthesize-failed',
      message: routeUnbound ? message : `Runtime speechSynthesize scenario failed: ${message}`,
      draft: draft.payload,
    };
  }
}
export async function generateReviewedVisualImageCandidate(
  input: VisualImageGenerationInput,
  agent: OwnerPortfolioAgentDetail,
  runtime?: RuntimeImageClient | null,
): Promise<RuntimeVisualImageGenerationResult> {
  const draft = buildReviewedVisualImageCandidatePayload(input, agent);
  const imagePayload = buildReviewedVisualImageGenerationPayload(input, agent);

  if (!draft.payload || !imagePayload.payload) {
    return {
      ok: false,
      source: VISUAL_IMAGE_GENERATION_SOURCE,
      failure: 'runtime-payload-invalid',
      message: imagePayload.errors.join('; ') || 'Runtime imageGenerate scenario payload invalid.',
      draft: draft.payload,
    };
  }

  const runtimeClient = runtime === undefined ? await createStudioRuntimeClient() : runtime;

  if (!runtimeClient) {
    return {
      ok: false,
      source: VISUAL_IMAGE_GENERATION_SOURCE,
      failure: 'runtime-transport-unavailable',
      message: 'Runtime imageGenerate scenario transport unavailable: Tauri IPC runtime transport is required.',
      draft: draft.payload,
    };
  }

  try {
    const boundPayload = await bindStudioImageGeneratePayload(imagePayload.payload, runtimeClient);
    const boundDraft = {
      ...draft.payload,
      runtime: {
        ...draft.payload.runtime,
        request: boundPayload,
      },
    };
    const output = await executeStudioImageGenerate(boundPayload, runtimeClient);
    return await normalizeRuntimeVisualImageGenerationOutput(runtimeClient, output, boundDraft);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'runtime transport call failed.';
    const routeUnbound = isStudioAIRouteBindingFailure(error);
    return {
      ok: false,
      source: VISUAL_IMAGE_GENERATION_SOURCE,
      failure: routeUnbound ? 'runtime-route-unbound' : 'runtime-generate-failed',
      message: routeUnbound ? message : `Runtime imageGenerate scenario failed: ${message}`,
      draft: draft.payload,
    };
  }
}

export async function generateReviewedAvatarPackageCandidate(
  input: AvatarPackageCandidateInput,
  agent: OwnerPortfolioAgentDetail,
  runtime?: RuntimeImageClient | null,
): Promise<RuntimeVisualImageGenerationResult> {
  const draft = buildReviewedAvatarPackageCandidatePayload(input, agent);
  const imagePayload = buildReviewedAvatarPackageImageGenerationPayload(input, agent);

  if (!draft.payload || !imagePayload.payload) {
    return {
      ok: false,
      source: VISUAL_IMAGE_GENERATION_SOURCE,
      failure: 'runtime-payload-invalid',
      message: imagePayload.errors.join('; ') || 'Runtime avatar package imageGenerate scenario payload invalid.',
      draft: draft.payload,
    };
  }

  const runtimeClient = runtime === undefined ? await createStudioRuntimeClient() : runtime;

  if (!runtimeClient) {
    return {
      ok: false,
      source: VISUAL_IMAGE_GENERATION_SOURCE,
      failure: 'runtime-transport-unavailable',
      message: 'Runtime avatar package imageGenerate scenario transport unavailable: Tauri IPC runtime transport is required.',
      draft: draft.payload,
    };
  }

  try {
    const boundPayload = await bindStudioImageGeneratePayload(imagePayload.payload, runtimeClient);
    const boundDraft = {
      ...draft.payload,
      runtime: {
        ...draft.payload.runtime,
        request: boundPayload,
      },
    };
    const output = await executeStudioImageGenerate(boundPayload, runtimeClient);
    return await normalizeRuntimeVisualImageGenerationOutput(runtimeClient, output, boundDraft);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'runtime transport call failed.';
    const routeUnbound = isStudioAIRouteBindingFailure(error);
    return {
      ok: false,
      source: VISUAL_IMAGE_GENERATION_SOURCE,
      failure: routeUnbound ? 'runtime-route-unbound' : 'runtime-generate-failed',
      message: routeUnbound ? message : `Runtime avatar package imageGenerate scenario failed: ${message}`,
      draft: draft.payload,
    };
  }
}
