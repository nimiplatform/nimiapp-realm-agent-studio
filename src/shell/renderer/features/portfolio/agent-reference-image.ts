import type { Runtime } from '@nimiplatform/sdk/runtime';
import type { ExecuteScenarioResponse, ScenarioArtifact } from '@nimiplatform/sdk/runtime/generated';
import { createStudioRuntimeClient } from '@renderer/data/runtime-client.js';
import {
  createStudioImageGeneratePayload,
  executeStudioImageGenerate,
  resolveStudioImageCallParams,
  type StudioImageGeneratePayload,
} from './studio-ai-runtime.js';

export const AGENT_REFERENCE_IMAGE_SOURCE = 'Runtime ScenarioService.executeScenario image.generate' as const;

type RuntimeImageClient = Runtime;

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
      | 'agent-reference-image-no-artifact';
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
  // Caller can override the runtime-resolved model with an explicit id (escape
  // hatch for testing). Empty / "auto" falls back to runtime selection.
  const callerOverride = String(input.model || '').trim();
  const model = callerOverride && callerOverride.toLowerCase() !== 'auto'
    ? callerOverride
    : callParams.model;
  return {
    ok: true,
    errors: [],
    payload: createStudioImageGeneratePayload({
      surfaceId: 'realm-agent-studio.agent-reference-image',
      params: {
        ...callParams,
        model,
      },
      spec: {
        prompt,
        negativePrompt: '',
        n: 1,
        size: '',
        aspectRatio: callParams.aspectRatio ?? '',
        quality: '',
        style: '',
        seed: '',
        referenceImages: [],
        mask: '',
        responseFormat: 'url',
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
  try {
    const output = await executeStudioImageGenerate(built.payload, runtimeClient);
    const artifacts = readImageArtifacts(output);
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
        message: 'Runtime imageGenerate scenario returned no artifact URI or id.',
        submitted: built.payload,
      };
    }
    return {
      ok: true,
      source: AGENT_REFERENCE_IMAGE_SOURCE,
      referenceImageUrl,
      artifactIds,
      artifactUris,
      submitted: built.payload,
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
      message: `Runtime imageGenerate scenario failed: ${error instanceof Error ? error.message : 'runtime transport call failed.'}`,
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
