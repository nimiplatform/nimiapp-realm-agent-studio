import { createStudioRuntimeClient } from '@renderer/data/runtime-client.js';
import {
  DNA_PRIMARY_ARCHETYPES,
  DNA_SECONDARY_TRAITS,
  type CreateRealmAgentDraftInput,
  type DnaPrimaryArchetype,
  type DnaSecondaryTrait,
} from './create-agent-draft.js';
import {
  buildStudioRuntimeMetadata,
  resolveStudioTextCallParams,
  runStudioTextGenerate,
  studioTextMessage,
  type StudioRuntimeAIClient,
  type StudioTextGenerationOutput,
  type StudioTextGeneratePayload,
} from './studio-ai-runtime.js';

export const AGENT_SEED_SOURCE = 'Runtime runtime.ai.text.generate' as const;

/**
 * Subset of CreateRealmAgentDraftInput populated by the LLM. World selection
 * and the post-create handle availability check stay manual — the LLM only
 * provides a handle SUGGESTION, the user must still verify it via the existing
 * `agentControllerCheckHandle` flow.
 */
export type GeneratedAgentSeed = Pick<
  CreateRealmAgentDraftInput,
  'handle' | 'displayName' | 'publicBio' | 'concept' | 'description' | 'ruleText' | 'dnaPrimary' | 'dnaSecondary'
>;

export type AgentSeedGenerationResult =
  | {
    ok: true;
    source: typeof AGENT_SEED_SOURCE;
    seed: GeneratedAgentSeed;
    rationale: string;
    submitted: StudioTextGeneratePayload;
    runtime: {
      traceId?: string;
      modelResolved?: string;
      finishReason?: string;
    };
  }
  | {
    ok: false;
    source: typeof AGENT_SEED_SOURCE;
    failure:
      | 'agent-seed-description-empty'
      | 'agent-seed-transport-unavailable'
      | 'agent-seed-generate-failed'
      | 'agent-seed-invalid-output';
    message: string;
    submitted: StudioTextGeneratePayload | null;
  };

function buildAgentSeedPayload(description: string): {
  ok: boolean;
  errors: string[];
  payload: StudioTextGeneratePayload | null;
} {
  const trimmed = description.trim();
  const errors: string[] = [];
  if (!trimmed) errors.push('agent description empty');
  if (errors.length > 0) {
    return { ok: false, errors, payload: null };
  }
  const callParams = resolveStudioTextCallParams('realm-agent-studio.agent-seed', {
    maxTokens: 1200,
    temperature: 0.7,
  });
  return {
    ok: true,
    errors: [],
    payload: {
      surfaceId: 'realm-agent-studio.agent-seed',
      params: callParams,
      request: {
        model: { modelId: callParams.model },
        messages: [
          studioTextMessage('system', [
            'You generate an owner-reviewed Realm Agent draft from a one-line user description.',
            'Return ONE JSON object. No prose before or after. No code fences.',
            'Required keys: handle, displayName, publicBio, concept, description, ruleText, dnaPrimary, dnaSecondary, rationale.',
            '',
            '— Field rules —',
            'handle: short kebab-case latin suggestion (3-20 chars), no leading @, lowercase letters/digits/hyphens only.',
            'displayName: 2-32 chars; match the user\'s described language (Chinese, English, etc).',
            'publicBio: 1-2 sentence public bio (≤160 chars).',
            'concept: 1-2 sentences naming the core creative concept.',
            'description: 1 short paragraph public-facing description (≤500 chars).',
            'ruleText: optional behavior/boundary lines, one per line; empty string if nothing meaningful.',
            `dnaPrimary: EXACTLY ONE of ${DNA_PRIMARY_ARCHETYPES.join(' | ')}`,
            `dnaSecondary: array of 1-3 traits from ${DNA_SECONDARY_TRAITS.join(' | ')}`,
            'rationale: 1-2 sentences explaining the design choice (English).',
            '',
            '— Hard prohibitions —',
            'Never include: handle prefix @, provider, model, lifecycle, state, worldId, ownerId, dna (full JSON), avatarUrl, profileCoverUrl, agentRule, agentRules, LocalAgent.',
            'Never include code fences, comments, or trailing text outside the JSON object.',
          ].join('\n')),
          studioTextMessage('user', JSON.stringify({
            userDescription: trimmed,
            dnaPrimaryAllowed: DNA_PRIMARY_ARCHETYPES,
            dnaSecondaryAllowed: DNA_SECONDARY_TRAITS,
          })),
        ],
        parameters: {
          temperature: callParams.temperature,
          maxTokens: callParams.maxTokens,
          metadata: buildStudioRuntimeMetadata('realm-agent-studio.agent-seed'),
        },
      },
    },
  };
}

function pickJsonObject(raw: string): Record<string, unknown> {
  // Strip optional ``` / ```json fences, leading/trailing prose.
  const stripped = raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('LLM output did not contain a JSON object.');
  }
  const candidate = stripped.slice(start, end + 1);
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch (error) {
    throw new Error(
      `LLM output JSON parse failed: ${error instanceof Error ? error.message : 'unknown'}`,
      { cause: error },
    );
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('LLM output JSON is not a plain object.');
  }
  return parsed as Record<string, unknown>;
}

function readString(value: unknown, fallback = ''): string {
  if (typeof value !== 'string') return fallback;
  return value.trim();
}

function readDnaPrimary(value: unknown): DnaPrimaryArchetype | '' {
  const upper = readString(value).toUpperCase();
  return (DNA_PRIMARY_ARCHETYPES as readonly string[]).includes(upper)
    ? (upper as DnaPrimaryArchetype)
    : '';
}

function readDnaSecondary(value: unknown): DnaSecondaryTrait[] {
  if (!Array.isArray(value)) return [];
  const known = new Set<DnaSecondaryTrait>(DNA_SECONDARY_TRAITS);
  const seen = new Set<DnaSecondaryTrait>();
  const out: DnaSecondaryTrait[] = [];
  for (const item of value) {
    const upper = readString(item).toUpperCase() as DnaSecondaryTrait;
    if (!known.has(upper) || seen.has(upper)) continue;
    seen.add(upper);
    out.push(upper);
  }
  return out;
}

function normalizeHandleSuggestion(raw: unknown): string {
  return readString(raw)
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function parseAgentSeedOutput(raw: string): { seed: GeneratedAgentSeed; rationale: string } {
  const obj = pickJsonObject(raw);
  const seed: GeneratedAgentSeed = {
    handle: normalizeHandleSuggestion(obj.handle),
    displayName: readString(obj.displayName),
    publicBio: readString(obj.publicBio),
    concept: readString(obj.concept),
    description: readString(obj.description),
    ruleText: readString(obj.ruleText),
    dnaPrimary: readDnaPrimary(obj.dnaPrimary),
    dnaSecondary: readDnaSecondary(obj.dnaSecondary),
  };
  if (!seed.displayName || !seed.concept) {
    throw new Error('LLM output missing required `displayName` or `concept`.');
  }
  if (!seed.dnaPrimary) {
    throw new Error('LLM output dnaPrimary missing or not one of the 6 admitted archetypes.');
  }
  const rationale = readString(obj.rationale);
  return { seed, rationale };
}

export async function generateAgentSeedFromDescription(
  description: string,
  runtime?: StudioRuntimeAIClient | null,
): Promise<AgentSeedGenerationResult> {
  const built = buildAgentSeedPayload(description);
  if (!built.ok || !built.payload) {
    return {
      ok: false,
      source: AGENT_SEED_SOURCE,
      failure: 'agent-seed-description-empty',
      message: built.errors.join('; ') || 'Agent seed payload invalid.',
      submitted: null,
    };
  }
  const runtimeClient = runtime === undefined ? await createStudioRuntimeClient() : runtime;
  if (!runtimeClient) {
    return {
      ok: false,
      source: AGENT_SEED_SOURCE,
      failure: 'agent-seed-transport-unavailable',
      message: 'Runtime runtime.ai.text.generate runtime transport unavailable: Tauri IPC runtime transport is required.',
      submitted: built.payload,
    };
  }
  try {
    const output: StudioTextGenerationOutput = await runStudioTextGenerate(built.payload, runtimeClient);
    try {
      const parsed = parseAgentSeedOutput(output.text);
      return {
        ok: true,
        source: AGENT_SEED_SOURCE,
        seed: parsed.seed,
        rationale: parsed.rationale,
        submitted: built.payload,
        runtime: {
          ...(output.trace?.traceId ? { traceId: output.trace.traceId } : {}),
          ...(output.trace?.modelResolved ? { modelResolved: output.trace.modelResolved } : {}),
          ...(output.finishReason ? { finishReason: String(output.finishReason) } : {}),
        },
      };
    } catch (error) {
      return {
        ok: false,
        source: AGENT_SEED_SOURCE,
        failure: 'agent-seed-invalid-output',
        message: error instanceof Error ? error.message : 'Agent seed output invalid.',
        submitted: built.payload,
      };
    }
  } catch (error) {
    return {
      ok: false,
      source: AGENT_SEED_SOURCE,
      failure: 'agent-seed-generate-failed',
      message: `Runtime runtime.ai.text.generate failed: ${error instanceof Error ? error.message : 'runtime transport call failed.'}`,
      submitted: built.payload,
    };
  }
}
