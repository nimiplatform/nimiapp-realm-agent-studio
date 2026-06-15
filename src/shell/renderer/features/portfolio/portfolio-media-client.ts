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
  buildReviewedVisualImageCandidatePayload,
  buildReviewedVisualImageGenerationPayload,
  buildReviewedVoiceDemoCandidatePayload,
  buildReviewedVoiceSynthesisPayload,
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
export type RuntimeVisualImageGenerationResult =
  | {
    ok: true;
    source: typeof VISUAL_IMAGE_GENERATION_SOURCE;
    candidate: true;
    publicTruth: false;
    draft: ReviewedVisualImageCandidatePayload;
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
    draft: ReviewedVisualImageCandidatePayload | null;
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
  draft: ReviewedVisualImageCandidatePayload,
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
