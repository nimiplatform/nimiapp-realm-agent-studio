import type {
  RealmAgentControllerCheckHandleOperationResponse,
  RealmAgentControllerCreateOperationRequest,
  RealmWorldControllerGetWorldDetailWithAgentsOperationResponse,
  RealmWorldControllerListWorldsOperationResponse,
} from '@nimiplatform/sdk/realm/generated';

export type RealmAgentCreationWorldDto = RealmWorldControllerListWorldsOperationResponse[number];
export type RealmAgentCreationWorldDetailDto = RealmWorldControllerGetWorldDetailWithAgentsOperationResponse;
export type RealmCreateAgentInput = RealmAgentControllerCreateOperationRequest['body'];
export type RealmAgentHandleAvailabilityDto = RealmAgentControllerCheckHandleOperationResponse;
type RealmCreateAgentRulesInput = NonNullable<RealmCreateAgentInput['rules']>;

export const REALM_AGENT_CREATE_SOURCE = 'Realm AgentsService.agentControllerCreate';
export const REALM_AGENT_CREATE_PATH = 'POST /api/agent';
export const REALM_AGENT_HANDLE_CHECK_SOURCE = 'Realm AgentsService.agentControllerCheckHandle';
export const REALM_AGENT_HANDLE_CHECK_PATH = 'GET /api/agent/handles/check';
export const REALM_AGENT_HANDLE_MIN_LENGTH = 4;
export const REALM_AGENT_HANDLE_MAX_LENGTH = 16;
export const REALM_AGENT_HANDLE_PATTERN = /^[a-z0-9_]{4,16}$/;

/**
 * Realm `CreateAgentDto.dnaPrimary` enum — six canonical archetypes from
 * `@nimiplatform/sdk/realm` schema. Backend builds the full AgentDna JSON
 * from this + optional `dnaSecondary` traits. Sending neither
 * `dna` nor `dnaPrimary` makes Realm throw `AGENT_DNA_REQUIRED`.
 */
export type DnaPrimaryArchetype =
  | 'CARING'
  | 'PLAYFUL'
  | 'INTELLECTUAL'
  | 'CONFIDENT'
  | 'MYSTERIOUS'
  | 'ROMANTIC';

export const DNA_PRIMARY_ARCHETYPES: readonly DnaPrimaryArchetype[] = [
  'CARING',
  'PLAYFUL',
  'INTELLECTUAL',
  'CONFIDENT',
  'MYSTERIOUS',
  'ROMANTIC',
];

export type DnaSecondaryTrait =
  | 'HUMOROUS'
  | 'SARCASTIC'
  | 'GENTLE'
  | 'DIRECT'
  | 'OPTIMISTIC'
  | 'REALISTIC'
  | 'DRAMATIC'
  | 'PASSIONATE'
  | 'REBELLIOUS'
  | 'INNOCENT'
  | 'WISE'
  | 'ECCENTRIC';

export const DNA_SECONDARY_TRAITS: readonly DnaSecondaryTrait[] = [
  'HUMOROUS',
  'SARCASTIC',
  'GENTLE',
  'DIRECT',
  'OPTIMISTIC',
  'REALISTIC',
  'DRAMATIC',
  'PASSIONATE',
  'REBELLIOUS',
  'INNOCENT',
  'WISE',
  'ECCENTRIC',
];

export const DNA_SECONDARY_MAX_RECOMMENDED = 3;

export type CreateRealmAgentDraftInput = {
  handle: string;
  displayName: string;
  concept: string;
  description: string;
  ruleText: string;
  selectedWorldId: string;
  dnaPrimary: DnaPrimaryArchetype | '';
  dnaSecondary: DnaSecondaryTrait[];
  /** Optional reference image URL produced by Runtime image generation in the
   * AI-seeded create flow. Passes through CreateAgentDto.referenceImageUrl. */
  referenceImageUrl: string;
  /** Client-only: the one-liner the owner typed in the seed phase. Re-used as
   * the image-generation prompt seed. Not submitted to Realm. */
  originalDescription: string;
};

export type NormalizedCreateRealmAgentDraft = {
  handle: string;
  displayName: string;
  concept: string;
  description: string;
  ruleText: string;
  selectedWorldId: string;
  dnaPrimary: DnaPrimaryArchetype | '';
  dnaSecondary: DnaSecondaryTrait[];
  referenceImageUrl: string;
  originalDescription: string;
};

export type SelectableRealmWorld = {
  id: string;
  name: string;
  type: string | null;
  status: string | null;
  description: string;
  tagline: string;
  source: 'Realm WorldsService.worldControllerListWorlds';
};

export type SelectedWorldPreview = {
  id: string;
  name: string;
  type: string | null;
  status: string | null;
  contentRating: string | null;
  tagline: string;
  description: string;
  overview: string;
  themes: string[];
  agentCount: number | null;
  nativeCreationState: string | null;
  source: 'Realm WorldsService.worldControllerGetWorldDetailWithAgents';
};

export type ReviewedRealmCreateAgentInput = {
  handle: string;
  displayName: string;
  worldId: string;
  concept: string;
  ownershipType: 'MASTER_OWNED';
  dna: NonNullable<RealmCreateAgentInput['dna']>;
  dnaPrimary: DnaPrimaryArchetype;
  dnaSecondary?: DnaSecondaryTrait[];
  description?: string;
  rules?: RealmCreateAgentRulesInput;
  referenceImageUrl?: string;
};

export type ReviewedCreateRealmAgentPayload = {
  source: typeof REALM_AGENT_CREATE_SOURCE;
  path: typeof REALM_AGENT_CREATE_PATH;
  publicFields: {
    handle: string;
    displayName: string;
    concept?: string;
    description?: string;
    rulesText?: string;
  };
  body: ReviewedRealmCreateAgentInput;
};

export type CreateRealmAgentReadiness =
  | {
    ready: false;
    errors: string[];
    source: typeof REALM_AGENT_CREATE_SOURCE;
    payload: null;
  }
  | {
    ready: true;
    errors: [];
    source: typeof REALM_AGENT_CREATE_SOURCE;
    payload: ReviewedCreateRealmAgentPayload;
  };

export type CreateRealmAgentReadinessOptions = {
  selectableWorldIds?: string[];
  handleAvailability?: NormalizedRealmAgentHandleAvailability | null | undefined;
};

export type NormalizedRealmAgentHandleAvailability =
  | {
    checked: true;
    source: typeof REALM_AGENT_HANDLE_CHECK_SOURCE;
    handle: string;
    normalized: string;
    available: true;
    message?: string;
  }
  | {
    checked: true;
    source: typeof REALM_AGENT_HANDLE_CHECK_SOURCE;
    handle: string;
    normalized: string;
    available: false;
    message: string;
  };

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function stableHandleSuffix(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 100000;
  }
  return String(hash || 1).padStart(5, '0');
}

export function normalizeRealmAgentHandleInput(value: string): string {
  return value
    .trim()
    .replace(/^[@~]+/, '')
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, REALM_AGENT_HANDLE_MAX_LENGTH)
    .replace(/_+$/g, '');
}

export function createRealmAgentHandleCandidate(source: string, fallback = 'realm'): string {
  const normalized = normalizeRealmAgentHandleInput(source);
  if (normalized.length >= REALM_AGENT_HANDLE_MIN_LENGTH) return normalized;

  const fallbackStem = normalizeRealmAgentHandleInput(fallback) || 'agent';
  const suffix = stableHandleSuffix(source || fallbackStem);
  const stem = (normalized || fallbackStem)
    .slice(0, REALM_AGENT_HANDLE_MAX_LENGTH - suffix.length - 1)
    .replace(/_+$/g, '');
  const candidate = normalizeRealmAgentHandleInput(`${stem}_${suffix}`);
  return REALM_AGENT_HANDLE_PATTERN.test(candidate) ? candidate : `agent_${suffix}`;
}

function normalizeRuleLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function compactStringArray(values: readonly string[], maxItems: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= maxItems) break;
  }
  return out;
}

function normalizeDnaSecondary(values: readonly DnaSecondaryTrait[] | readonly string[]): DnaSecondaryTrait[] {
  const known = new Set<DnaSecondaryTrait>(DNA_SECONDARY_TRAITS);
  const seen = new Set<DnaSecondaryTrait>();
  const out: DnaSecondaryTrait[] = [];
  for (const value of values) {
    const trimmed = String(value || '').trim().toUpperCase() as DnaSecondaryTrait;
    if (!known.has(trimmed) || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function normalizeReferenceImageUrl(value: string): string {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
}

export function normalizeCreateRealmAgentDraft(input: CreateRealmAgentDraftInput): NormalizedCreateRealmAgentDraft {
  const rawPrimary = String(input.dnaPrimary || '').trim().toUpperCase();
  const dnaPrimary = (DNA_PRIMARY_ARCHETYPES as readonly string[]).includes(rawPrimary)
    ? (rawPrimary as DnaPrimaryArchetype)
    : '';
  return {
    handle: normalizeRealmAgentHandleInput(input.handle),
    displayName: input.displayName.trim(),
    concept: input.concept.trim(),
    description: input.description.trim(),
    ruleText: input.ruleText.trim(),
    selectedWorldId: input.selectedWorldId.trim(),
    dnaPrimary,
    dnaSecondary: normalizeDnaSecondary(input.dnaSecondary || []),
    referenceImageUrl: normalizeReferenceImageUrl(input.referenceImageUrl || ''),
    originalDescription: String(input.originalDescription || '').trim(),
  };
}

export function buildReviewedCreateAgentDna(
  input: NormalizedCreateRealmAgentDraft,
): NonNullable<RealmCreateAgentInput['dna']> {
  const summary = input.description || input.concept;
  const behavioralDirectives = compactStringArray(normalizeRuleLines(input.ruleText), 12);
  return {
    source: 'realm-agent-studio.reviewed-create-dna.v1',
    primaryArchetype: input.dnaPrimary,
    secondaryTraits: [...input.dnaSecondary],
    identity: {
      name: input.displayName,
      role: 'Owner-created public Realm Agent',
      species: 'Realm Agent',
      worldview: input.concept,
      ...(summary ? { summary } : {}),
    },
    personality: {
      primaryArchetype: input.dnaPrimary,
      secondaryTraits: [...input.dnaSecondary],
      ...(summary ? { summary } : {}),
      ...(behavioralDirectives.length > 0 ? { behavioralDirectives } : {}),
    },
    communication: {
      sourceText: input.ruleText || input.concept,
    },
  };
}

export function normalizeRealmAgentHandleAvailability(
  handle: string,
  response: RealmAgentHandleAvailabilityDto,
): NormalizedRealmAgentHandleAvailability {
  const normalized = normalizeRealmAgentHandleInput(readString(response.normalized) || handle);
  if (response.available) {
    return {
      checked: true,
      source: REALM_AGENT_HANDLE_CHECK_SOURCE,
      handle: normalizeRealmAgentHandleInput(handle),
      normalized,
      available: true,
      ...(response.message ? { message: response.message } : {}),
    };
  }

  return {
    checked: true,
    source: REALM_AGENT_HANDLE_CHECK_SOURCE,
    handle: normalizeRealmAgentHandleInput(handle),
    normalized,
    available: false,
    message: response.message || 'Realm reported this agent handle is unavailable.',
  };
}

export function normalizeSelectableWorld(world: RealmAgentCreationWorldDto): SelectableRealmWorld {
  return {
    id: world.id,
    name: world.name,
    type: readString(world.type) || null,
    status: readString(world.status) || null,
    description: readString(world.description) || '',
    tagline: readString(world.tagline) || readString(world.motto) || '',
    source: 'Realm WorldsService.worldControllerListWorlds',
  };
}

export function normalizeSelectableWorlds(worlds: RealmAgentCreationWorldDto[]): SelectableRealmWorld[] {
  return worlds.map(normalizeSelectableWorld);
}

export function selectOasisDefaultWorld(worlds: SelectableRealmWorld[]): SelectableRealmWorld | null {
  return worlds.find((world) => world.type === 'OASIS')
    || worlds.find((world) => world.id.toLocaleLowerCase() === 'oasis')
    || worlds.find((world) => world.name.toLocaleLowerCase() === 'oasis')
    || null;
}

export function normalizeSelectedWorldPreview(world: RealmAgentCreationWorldDetailDto): SelectedWorldPreview {
  const record = readRecord(world);
  const themes = Array.isArray(world.themes)
    ? world.themes.filter((theme): theme is string => typeof theme === 'string' && theme.length > 0)
    : [];

  return {
    id: world.id,
    name: world.name,
    type: readString(world.type) || null,
    status: readString(world.status) || null,
    contentRating: readString(world.contentRating) || null,
    tagline: readString(world.tagline) || readString(world.motto) || '',
    description: readString(world.description) || '',
    overview: readString(world.overview) || '',
    themes,
    agentCount: typeof world.agentCount === 'number' && Number.isFinite(world.agentCount) ? world.agentCount : null,
    nativeCreationState: readString(record?.nativeCreationState) || null,
    source: 'Realm WorldsService.worldControllerGetWorldDetailWithAgents',
  };
}

export function validateCreateRealmAgentReadiness(
  input: CreateRealmAgentDraftInput,
  options: CreateRealmAgentReadinessOptions = {},
): CreateRealmAgentReadiness {
  const draft = normalizeCreateRealmAgentDraft(input);
  const errors: string[] = [];
  const selectableWorldIds = options.selectableWorldIds
    ? new Set(options.selectableWorldIds.map((worldId) => worldId.trim()).filter(Boolean))
    : null;
  const handleAvailability = options.handleAvailability;

  if (!draft.handle) {
    errors.push('handle missing');
  }
  if (!draft.displayName) {
    errors.push('display name missing');
  }
  if (!draft.concept) {
    errors.push('concept missing');
  }
  if (!draft.selectedWorldId) {
    errors.push('selected world missing');
  }
  if (!draft.dnaPrimary) {
    errors.push('DNA primary archetype missing (Realm requires `dnaPrimary` or full `dna` JSON; we send the archetype-based form)');
  }
  if (draft.selectedWorldId && selectableWorldIds && !selectableWorldIds.has(draft.selectedWorldId)) {
    errors.push('selected world not source-backed by WorldsService.worldControllerListWorlds');
  }
  if (draft.handle) {
    if (!handleAvailability) {
      errors.push('handle availability not checked by AgentsService.agentControllerCheckHandle');
    } else if (handleAvailability.handle !== draft.handle && handleAvailability.normalized !== draft.handle) {
      errors.push('handle availability not checked for the current normalized handle');
    } else if (!handleAvailability.available) {
      errors.push(`handle unavailable: ${handleAvailability.message}`);
    }
  }

  if (errors.length > 0) {
    return {
      ready: false,
      errors,
      source: REALM_AGENT_CREATE_SOURCE,
      payload: null,
    };
  }

  const ruleLines = normalizeRuleLines(draft.ruleText);
  // `dnaPrimary` was confirmed non-empty by the error gate above. The cast is
  // safe; we narrow here so the body type can declare it as required.
  const dnaPrimary = draft.dnaPrimary as DnaPrimaryArchetype;
  const body: ReviewedRealmCreateAgentInput = {
    handle: draft.handle,
    displayName: draft.displayName,
    worldId: draft.selectedWorldId,
    concept: draft.concept,
    ownershipType: 'MASTER_OWNED',
    dna: buildReviewedCreateAgentDna(draft),
    dnaPrimary,
    ...(draft.dnaSecondary.length > 0 ? { dnaSecondary: draft.dnaSecondary } : {}),
    ...(draft.description ? { description: draft.description } : {}),
    ...(ruleLines.length > 0 ? { rules: { format: 'rule-lines-v1', lines: ruleLines, text: draft.ruleText } } : {}),
    ...(draft.referenceImageUrl ? { referenceImageUrl: draft.referenceImageUrl } : {}),
  };

  return {
    ready: true,
    errors: [],
    source: REALM_AGENT_CREATE_SOURCE,
    payload: {
      source: REALM_AGENT_CREATE_SOURCE,
      path: REALM_AGENT_CREATE_PATH,
      publicFields: {
        handle: draft.handle,
        displayName: draft.displayName,
        ...(draft.concept ? { concept: draft.concept } : {}),
        ...(draft.description ? { description: draft.description } : {}),
        ...(draft.ruleText ? { rulesText: draft.ruleText } : {}),
      },
      body,
    },
  };
}
