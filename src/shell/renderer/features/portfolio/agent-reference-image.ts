import type { Runtime } from '@nimiplatform/sdk/runtime';
import type { ExecuteScenarioResponse, ScenarioArtifact } from '@nimiplatform/sdk/runtime/generated';
import { extractNimiErrorFields } from '@nimiplatform/sdk/types';
import { createStudioRuntimeClient } from '@renderer/data/runtime-client.js';
import {
  bindStudioImageGeneratePayload,
  createStudioImageGeneratePayload,
  executeStudioImageGenerate,
  resolveStudioImageCallParams,
  type StudioImageGeneratePayload,
} from './studio-ai-runtime.js';
import {
  projectStudioRuntimeArtifacts,
  type StudioRuntimeArtifactProjection,
} from './runtime-artifact-projection.js';

export const AGENT_REFERENCE_IMAGE_SOURCE = 'Runtime ScenarioService.submitScenarioJob image.generate' as const;

type RuntimeImageClient = Runtime;

export type AgentReferenceImageInput = {
  prompt: string;
  aspectRatio?: string;
};

export type AgentReferenceImageResult =
  | {
    ok: true;
    source: typeof AGENT_REFERENCE_IMAGE_SOURCE;
    referenceImageUrl: string;
    previewUrl: string;
    artifactIds: string[];
    artifactUris: string[];
    artifacts: StudioRuntimeArtifactProjection[];
    submitted: StudioImageGeneratePayload;
    runtime: {
      jobId?: string;
      traceId?: string;
      modelResolved?: string;
    };
  }
  | {
    ok: false;
    source: typeof AGENT_REFERENCE_IMAGE_SOURCE;
    failure:
      | 'agent-reference-image-payload-invalid'
      | 'agent-reference-image-transport-unavailable'
      | 'agent-reference-image-generate-failed'
      | 'agent-reference-image-no-artifact'
      | 'agent-reference-image-public-url-unavailable';
    message: string;
    submitted: StudioImageGeneratePayload | null;
  };

export function buildAgentReferenceImagePayload(input: AgentReferenceImageInput): {
  ok: boolean;
  errors: string[];
  payload: StudioImageGeneratePayload | null;
} {
  const prompt = input.prompt.trim();
  const errors: string[] = [];
  if (!prompt) errors.push('reference image prompt empty');
  if (errors.length > 0) {
    return { ok: false, errors, payload: null };
  }
  const callParams = resolveStudioImageCallParams('realm-agent-studio.agent-reference-image', {
    ...(input.aspectRatio ? { aspectRatio: input.aspectRatio } : {}),
  });
  return {
    ok: true,
    errors: [],
    payload: createStudioImageGeneratePayload({
      surfaceId: 'realm-agent-studio.agent-reference-image',
      params: {
        ...callParams,
      },
      spec: {
        prompt,
        negativePrompt: '',
        n: 1,
        size: callParams.size || '',
        aspectRatio: callParams.aspectRatio ?? '',
        quality: '',
        style: '',
        seed: callParams.seed || '',
        referenceImages: [],
        mask: '',
        responseFormat: callParams.responseFormat || 'url',
      },
    }),
  };
}

function readImageArtifacts(output: ExecuteScenarioResponse): readonly ScenarioArtifact[] {
  const scenarioOutput = output.output?.output;
  return scenarioOutput?.oneofKind === 'imageGenerate'
    ? scenarioOutput.imageGenerate.artifacts
    : [];
}

function parseEmbeddedRuntimeError(value: string): Record<string, unknown> {
  const text = value.trim();
  if (!text) return {};
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) return {};
  try {
    const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function runtimeErrorText(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === 'string' && error.trim()) return error.trim();
  const fields = extractNimiErrorFields(error);
  return fields.message || 'runtime transport call failed.';
}

function runtimeImageGenerateFailureMessage(error: unknown): string {
  const raw = runtimeErrorText(error);
  const fields = extractNimiErrorFields(error);
  const embedded = parseEmbeddedRuntimeError(raw);
  const reasonCode = String(fields.reasonCode || embedded.reasonCode || '');
  if (reasonCode === 'AI_LOCAL_MODEL_UNAVAILABLE') {
    return 'Runtime local image environment is not ready. Studio requested local dependency activation; retry after Runtime finishes preparing the image environment.';
  }
  const structuredMessage = typeof embedded.message === 'string' ? embedded.message.trim() : '';
  if (structuredMessage && structuredMessage.length < raw.length) {
    return structuredMessage;
  }
  return raw;
}

export async function generateAgentReferenceImage(
  input: AgentReferenceImageInput,
  runtime?: RuntimeImageClient | null,
): Promise<AgentReferenceImageResult> {
  const built = buildAgentReferenceImagePayload(input);
  if (!built.ok || !built.payload) {
    return {
      ok: false,
      source: AGENT_REFERENCE_IMAGE_SOURCE,
      failure: 'agent-reference-image-payload-invalid',
      message: built.errors.join('; ') || 'Reference image payload invalid.',
      submitted: null,
    };
  }
  const runtimeClient = runtime === undefined ? await createStudioRuntimeClient() : runtime;
  if (!runtimeClient) {
    return {
      ok: false,
      source: AGENT_REFERENCE_IMAGE_SOURCE,
      failure: 'agent-reference-image-transport-unavailable',
      message: 'Runtime imageGenerate scenario transport unavailable: Tauri IPC runtime transport is required.',
      submitted: built.payload,
    };
  }
  let submitted = built.payload;
  try {
    const boundPayload = await bindStudioImageGeneratePayload(built.payload, runtimeClient);
    submitted = boundPayload;
    const output = await executeStudioImageGenerate(boundPayload, runtimeClient);
    const artifacts = readImageArtifacts(output);
    const projectedArtifacts = await projectStudioRuntimeArtifacts(runtimeClient, artifacts);
    const artifactIds = projectedArtifacts
      .map((artifact) => artifact.artifactId)
      .filter((artifactId): artifactId is string => Boolean(artifactId));
    const artifactUris = projectedArtifacts
      .map((artifact) => artifact.publicUri)
      .filter((uri): uri is string => Boolean(uri));
    const previewUrl = projectedArtifacts.find((artifact) => artifact.previewUrl)?.previewUrl || artifactUris[0] || '';
    if (projectedArtifacts.length === 0) {
      return {
        ok: false,
        source: AGENT_REFERENCE_IMAGE_SOURCE,
        failure: 'agent-reference-image-no-artifact',
        message: 'Runtime imageGenerate scenario returned no readable artifact.',
        submitted,
      };
    }
    const referenceImageUrl = artifactUris[0] || '';
    if (!referenceImageUrl) {
      return {
        ok: false,
        source: AGENT_REFERENCE_IMAGE_SOURCE,
        failure: 'agent-reference-image-public-url-unavailable',
        message: 'Runtime imageGenerate produced a local artifact but no http(s) URL that Realm can store as a public reference image.',
        submitted,
      };
    }
    return {
      ok: true,
      source: AGENT_REFERENCE_IMAGE_SOURCE,
      referenceImageUrl,
      previewUrl,
      artifactIds,
      artifactUris,
      artifacts: projectedArtifacts,
      submitted,
      runtime: {
        ...(output.traceId ? { traceId: output.traceId } : {}),
        ...(output.modelResolved ? { modelResolved: output.modelResolved } : {}),
      },
    };
  } catch (error) {
    return {
      ok: false,
      source: AGENT_REFERENCE_IMAGE_SOURCE,
      failure: 'agent-reference-image-generate-failed',
      message: `Runtime imageGenerate scenario failed: ${runtimeImageGenerateFailureMessage(error)}`,
      submitted,
    };
  }
}

/**
 * Build a default image prompt from the current draft. The user can override
 * in the form before triggering generation.
 */
export function defaultReferenceImagePromptFromDraft(input: {
  description: string;
  displayName: string;
  concept: string;
  dnaPrimary: string;
}): string {
  const lead = input.description.trim() || input.concept.trim();
  const traits = [input.dnaPrimary, input.displayName].filter(Boolean).join(', ');
  const tail = 'character portrait, cinematic lighting, full body, high detail, neutral background';
  return [lead, traits, tail].filter(Boolean).join(' - ');
}
