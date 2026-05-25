import type { ImageGenerateInput, ImageGenerateOutput } from '@nimiplatform/sdk/runtime/browser';
import { createStudioRuntimeClient } from '@renderer/data/runtime-client.js';
import { buildStudioRuntimeMetadata, resolveStudioImageCallParams } from './studio-ai-runtime.js';

export const AGENT_REFERENCE_IMAGE_SOURCE = 'Runtime media.image.generate' as const;

type RuntimeImageClient = {
  media: { image: { generate(input: ImageGenerateInput): Promise<ImageGenerateOutput> } };
};

export type AgentReferenceImageInput = {
  prompt: string;
  model?: string;
  aspectRatio?: string;
};

export type AgentReferenceImageResult =
  | {
    ok: true;
    source: typeof AGENT_REFERENCE_IMAGE_SOURCE;
    referenceImageUrl: string;
    artifactIds: string[];
    artifactUris: string[];
    submitted: ImageGenerateInput;
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
      | 'agent-reference-image-no-artifact';
    message: string;
    submitted: ImageGenerateInput | null;
  };

export function buildAgentReferenceImagePayload(input: AgentReferenceImageInput): {
  ok: boolean;
  errors: string[];
  payload: ImageGenerateInput | null;
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
  // Caller can override the runtime-resolved model with an explicit id (escape
  // hatch for testing). Empty / "auto" falls back to runtime selection.
  const callerOverride = String(input.model || '').trim();
  return {
    ok: true,
    errors: [],
    payload: {
      ...callParams,
      ...(callerOverride && callerOverride.toLowerCase() !== 'auto' ? { model: callerOverride } : {}),
      prompt,
      metadata: buildStudioRuntimeMetadata('realm-agent-studio.agent-reference-image'),
    } as ImageGenerateInput,
  };
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
      message: 'Runtime media.image.generate runtime transport unavailable: Tauri IPC runtime transport is required.',
      submitted: built.payload,
    };
  }
  try {
    const output = await runtimeClient.media.image.generate(built.payload);
    // ImageGenerateOutput shape per kit/sdk: `output.artifacts` is `Array<{ artifactId, uri }>`,
    // `output.job` carries `{ jobId, traceId, modelResolved }`.
    const artifacts = Array.isArray(output.artifacts) ? output.artifacts : [];
    const artifactIds: string[] = [];
    const artifactUris: string[] = [];
    for (const artifact of artifacts) {
      if (!artifact || typeof artifact !== 'object') continue;
      const record = artifact as unknown as Record<string, unknown>;
      const artifactId = typeof record.artifactId === 'string' ? record.artifactId : '';
      const uri = typeof record.uri === 'string' ? record.uri : '';
      if (artifactId) artifactIds.push(artifactId);
      if (uri) artifactUris.push(uri);
    }
    const referenceImageUrl = artifactUris[0] || artifactIds[0] || '';
    if (!referenceImageUrl) {
      return {
        ok: false,
        source: AGENT_REFERENCE_IMAGE_SOURCE,
        failure: 'agent-reference-image-no-artifact',
        message: 'Runtime media.image.generate returned no artifact URI or id.',
        submitted: built.payload,
      };
    }
    const jobRecord: Record<string, unknown> = output.job && typeof output.job === 'object'
      ? (output.job as unknown as Record<string, unknown>)
      : {};
    const traceRecord: Record<string, unknown> = output.trace && typeof output.trace === 'object'
      ? (output.trace as unknown as Record<string, unknown>)
      : {};
    const jobId = typeof jobRecord.jobId === 'string' ? jobRecord.jobId : undefined;
    const modelResolved = typeof jobRecord.modelResolved === 'string' ? jobRecord.modelResolved : undefined;
    const traceId = typeof traceRecord.traceId === 'string'
      ? traceRecord.traceId
      : typeof jobRecord.traceId === 'string' ? jobRecord.traceId : undefined;
    return {
      ok: true,
      source: AGENT_REFERENCE_IMAGE_SOURCE,
      referenceImageUrl,
      artifactIds,
      artifactUris,
      submitted: built.payload,
      runtime: {
        ...(jobId ? { jobId } : {}),
        ...(traceId ? { traceId } : {}),
        ...(modelResolved ? { modelResolved } : {}),
      },
    };
  } catch (error) {
    return {
      ok: false,
      source: AGENT_REFERENCE_IMAGE_SOURCE,
      failure: 'agent-reference-image-generate-failed',
      message: `Runtime media.image.generate failed: ${error instanceof Error ? error.message : 'runtime transport call failed.'}`,
      submitted: built.payload,
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
  return [lead, traits, tail].filter(Boolean).join(' — ');
}
