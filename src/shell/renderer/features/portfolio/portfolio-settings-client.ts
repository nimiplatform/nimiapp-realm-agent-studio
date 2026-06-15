import type {
  RealmAgentControllerGetVisibilityOperationResponse,
  RealmGetForgeImportedSystemAgentChatReadinessOperationResponse,
  RealmGetForgeImportedSystemAgentSettingsOperationResponse,
  RealmGetMyRealmAgentSettingsOperationResponse,
  RealmProjectRuntimePayloadOperationRequest,
  RealmProjectRuntimePayloadOperationResponse,
  RealmUpdateForgeImportedSystemAgentSettingsOperationRequest,
  RealmUpdateMyRealmAgentSettingsOperationRequest,
} from '@nimiplatform/sdk/realm/generated';
import { createStudioRealmClient, type StudioRealmSurface } from '@renderer/data/realm-client.js';
import { createStudioRuntimeClient } from '@renderer/data/runtime-client.js';
import {
  isStudioAIRouteBindingFailure,
  runStudioTextGenerate,
  type StudioRuntimeAIClient,
  type StudioTextGeneratePayload,
} from './studio-ai-runtime.js';
import type { OwnerPortfolioAgentDetail, SettingField } from './portfolio-data.js';
import {
  OWNER_SETTINGS_SAVE_SOURCE,
  SETTINGS_AI_PROPOSAL_SOURCE,
  buildRealmOwnerAgentSettingsUpdateInput,
  buildRuntimeOwnerSettingsProposalPrompt,
  normalizeRuntimeOwnerSettingsProposal,
  type OwnerAgentSettingsProposalContext,
  type OwnerAgentSettingsDraft,
  type RuntimeOwnerSettingsProposal,
} from './setting-proposal.js';

type StudioRealmClient = StudioRealmSurface;

type RuntimeTextClient = StudioRuntimeAIClient;

export type RealmAgentVisibilitySettings = RealmAgentControllerGetVisibilityOperationResponse;
type RealmAgentVisibilityUpdateInput = Partial<Record<AgentVisibilityField, AgentVisibilityValue>>;
export type RealmOwnerAgentSettings =
  | RealmGetMyRealmAgentSettingsOperationResponse
  | RealmGetForgeImportedSystemAgentSettingsOperationResponse;
type RealmOwnerAgentSettingsUpdateInput = RealmUpdateMyRealmAgentSettingsOperationRequest['body'];
type RealmForgeImportedSystemAgentSettingsUpdateInput = RealmUpdateForgeImportedSystemAgentSettingsOperationRequest['body'];
type RealmRuntimeProjectionInput = RealmProjectRuntimePayloadOperationRequest['body'];
type RealmRuntimeProjectionResponse = RealmProjectRuntimePayloadOperationResponse;
type RealmForgeImportedAgentChatReadinessResponse = RealmGetForgeImportedSystemAgentChatReadinessOperationResponse;
type AgentChatReadinessSubmittedInput =
  | RealmRuntimeProjectionInput
  | { readonly agentId: string; readonly ownerScope: 'forge-imported-system' };

export const REALM_RUNTIME_PROJECTION_SOURCE = 'Realm RuntimeProjectionsService.projectRuntimePayload';
export const FORGE_IMPORTED_AGENT_CHAT_READINESS_SOURCE =
  'Realm AgentCuratedSystemService.getForgeImportedSystemAgentChatReadiness';
export const REALM_AGENT_VISIBILITY_SOURCE = 'Realm AgentsService.agentControllerUpdateVisibility';
export const FORGE_IMPORTED_SETTINGS_SAVE_SOURCE = 'Realm AgentCuratedSystemService.updateForgeImportedSystemAgentSettings';
export const AGENT_VISIBILITY_VALUES = ['PUBLIC', 'FRIENDS', 'PRIVATE'] as const;
export const AGENT_VISIBILITY_FIELDS = [
  'accountVisibility',
  'defaultPostVisibility',
  'dmVisibility',
  'profileVisibility',
] as const;

export type RuntimeProjectionSummary = {
  source: typeof REALM_RUNTIME_PROJECTION_SOURCE;
  consumerSurface: 'RUNTIME_PAYLOAD';
  worldId: string;
  checksum: string;
  selectedInputCount: number;
  suppressedInputCount: number;
  worldRuleCount: number;
  rawRuleContentExposed: false;
};

export type AgentChatReadinessProjectionSummary = RuntimeProjectionSummary & {
  agentId: string;
  agentRuleCount: number;
  selectedOwnerSettingFields: string[];
};

export type ForgeImportedAgentChatReadinessSummary = Omit<
  AgentChatReadinessProjectionSummary,
  'source' | 'consumerSurface'
> & {
  source: typeof FORGE_IMPORTED_AGENT_CHAT_READINESS_SOURCE;
  consumerSurface: 'AGENT_CHAT_READINESS';
  profile: {
    displayName: string;
    handle: string;
    avatarUrl: string | null;
    profileCoverUrl: string | null;
    defaultVoiceReference: string | null;
    speechModelId: string | null;
    speechRoutePolicy: 'local' | 'cloud' | null;
  };
  gates: {
    localAgentIdentityReady: boolean;
    profileContextReady: boolean;
    ownerSettingsReady: boolean;
    profileMediaReady: boolean;
    voiceReferenceReady: boolean;
    speechRouteReady: boolean;
  };
};

export type RuntimeProjectionSummaryResult =
  | {
    ok: true;
    source: typeof REALM_RUNTIME_PROJECTION_SOURCE;
    truthWrite: false;
    summary: RuntimeProjectionSummary | AgentChatReadinessProjectionSummary;
    submitted: RealmRuntimeProjectionInput;
  }
  | {
    ok: false;
    source: typeof REALM_RUNTIME_PROJECTION_SOURCE;
    truthWrite: false;
    failure:
      | 'runtime-projection-world-unavailable'
      | 'runtime-projection-failed'
      | 'runtime-projection-invalid-response';
    message: string;
    submitted: RealmRuntimeProjectionInput | null;
  };

export type AgentChatReadinessSummaryResult =
  | {
    ok: true;
    source: typeof REALM_RUNTIME_PROJECTION_SOURCE | typeof FORGE_IMPORTED_AGENT_CHAT_READINESS_SOURCE;
    truthWrite: false;
    summary: AgentChatReadinessProjectionSummary | ForgeImportedAgentChatReadinessSummary;
    submitted: AgentChatReadinessSubmittedInput;
  }
  | {
    ok: false;
    source: typeof REALM_RUNTIME_PROJECTION_SOURCE | typeof FORGE_IMPORTED_AGENT_CHAT_READINESS_SOURCE;
    truthWrite: false;
    failure:
      | 'runtime-projection-world-unavailable'
      | 'runtime-projection-failed'
      | 'runtime-projection-invalid-response';
    message: string;
    submitted: AgentChatReadinessSubmittedInput | null;
  };
export type AgentVisibilityValue = typeof AGENT_VISIBILITY_VALUES[number];
export type AgentVisibilityField = typeof AGENT_VISIBILITY_FIELDS[number];
export type AgentVisibilityDraft = Record<AgentVisibilityField, string>;

export type RealmAgentVisibilityUpdateResult =
  | {
    ok: true;
    source: typeof REALM_AGENT_VISIBILITY_SOURCE;
    lifecycleTruth: false;
    submitted: RealmAgentVisibilityUpdateInput;
    settings: RealmAgentVisibilitySettings;
  }
  | {
    ok: false;
    source: typeof REALM_AGENT_VISIBILITY_SOURCE;
    lifecycleTruth: false;
    failure: 'visibility-payload-invalid' | 'visibility-no-changes' | 'realm-update-visibility-failed';
    message: string;
    submitted: RealmAgentVisibilityUpdateInput | null;
    draft: AgentVisibilityDraft;
  };

export type RealmOwnerAgentSettingsUpdateResult =
  | {
    ok: true;
    source: typeof OWNER_SETTINGS_SAVE_SOURCE | typeof FORGE_IMPORTED_SETTINGS_SAVE_SOURCE;
    truthWrite: true;
    submitted: RealmOwnerAgentSettingsUpdateInput | RealmForgeImportedSystemAgentSettingsUpdateInput;
    settings: RealmOwnerAgentSettings;
  }
  | {
    ok: false;
    source: typeof OWNER_SETTINGS_SAVE_SOURCE | typeof FORGE_IMPORTED_SETTINGS_SAVE_SOURCE;
    truthWrite: false;
    failure: 'owner-settings-payload-invalid' | 'owner-settings-no-changes' | 'realm-update-owner-settings-failed';
    message: string;
    submitted: RealmOwnerAgentSettingsUpdateInput | RealmForgeImportedSystemAgentSettingsUpdateInput | null;
    draft: OwnerAgentSettingsDraft;
  };

export type RuntimeOwnerSettingsProposalResult =
  | {
    ok: true;
    source: typeof SETTINGS_AI_PROPOSAL_SOURCE;
    candidate: true;
    truthWrite: false;
    proposal: RuntimeOwnerSettingsProposal;
    submitted: StudioTextGeneratePayload;
    runtime: {
      traceId?: string;
      modelResolved?: string;
      finishReason?: string;
    };
  }
  | {
    ok: false;
    source: typeof SETTINGS_AI_PROPOSAL_SOURCE;
    candidate: false;
    truthWrite: false;
    failure:
      | 'runtime-settings-proposal-payload-invalid'
      | 'runtime-settings-proposal-transport-unavailable'
      | 'runtime-settings-proposal-route-unbound'
      | 'runtime-settings-proposal-failed'
      | 'runtime-settings-proposal-invalid-output';
    message: string;
    submitted: StudioTextGeneratePayload | null;
  };

function proposalContextText(field: SettingField): string | null {
  if (field.status === 'available') {
    return field.value;
  }
  return null;
}

export function buildPortfolioSettingsProposalContext(agent: OwnerPortfolioAgentDetail): OwnerAgentSettingsProposalContext {
  return {
    ownerScope: agent.ownerScope,
    displayName: proposalContextText(agent.displayName),
    handle: proposalContextText(agent.handle),
    worldId: proposalContextText(agent.world),
    worldName: proposalContextText(agent.world),
  };
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function readNullableString(record: Record<string, unknown>, key: string): string | null | undefined {
  if (!(key in record)) {
    return undefined;
  }
  const value = record[key];
  if (value === null) {
    return null;
  }
  return typeof value === 'string' ? value : undefined;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
}

function readNonNegativeNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isAgentVisibilityValue(value: string): value is AgentVisibilityValue {
  return AGENT_VISIBILITY_VALUES.includes(value as AgentVisibilityValue);
}

export function createAgentVisibilityDraft(settings: RealmAgentVisibilitySettings): AgentVisibilityDraft {
  return {
    accountVisibility: settings.accountVisibility,
    defaultPostVisibility: settings.defaultPostVisibility,
    dmVisibility: settings.dmVisibility,
    profileVisibility: settings.profileVisibility,
  };
}

export function buildRealmUpdateVisibilityInput(
  draft: AgentVisibilityDraft,
  current: RealmAgentVisibilitySettings,
): { input: RealmAgentVisibilityUpdateInput | null; errors: string[] } {
  const input: RealmAgentVisibilityUpdateInput = {};
  const errors: string[] = [];

  for (const field of AGENT_VISIBILITY_FIELDS) {
    const value = draft[field];
    if (!isAgentVisibilityValue(value)) {
      errors.push(`${field} must be PUBLIC, FRIENDS, or PRIVATE`);
      continue;
    }
    if (value !== current[field]) {
      input[field] = value;
    }
  }

  if (errors.length > 0) {
    return { input: null, errors };
  }

  if (Object.keys(input).length === 0) {
    return { input: null, errors: ['visibility settings have no reviewed changes'] };
  }

  return { input, errors: [] };
}
export function buildRuntimeProjectionInput(agent: OwnerPortfolioAgentDetail): RealmRuntimeProjectionInput | null {
  if (agent.world.status !== 'available' || !agent.world.value.trim()) {
    return null;
  }

  return {
    worldId: agent.world.value.trim(),
    contextEnvelope: {
      allowedWorldScopes: ['WORLD', 'REGION', 'FACTION', 'INDIVIDUAL', 'SCENE'],
      includeInheritedAgentRules: false,
      focusKeywords: ['realm-agent-studio', 'owner-reviewed-runtime-context'],
    },
  };
}

export function buildAgentChatReadinessProjectionInput(agent: OwnerPortfolioAgentDetail): RealmRuntimeProjectionInput | null {
  if (agent.world.status !== 'available' || !agent.world.value.trim() || !agent.id.trim()) {
    return null;
  }

  return {
    worldId: agent.world.value.trim(),
    agentId: agent.id.trim(),
    contextEnvelope: {
      allowedWorldScopes: ['WORLD', 'REGION', 'FACTION', 'INDIVIDUAL', 'SCENE'],
      allowedAgentLayers: ['DNA', 'BEHAVIORAL', 'CONTEXTUAL'],
      allowedAgentScopes: ['SELF'],
      includeInheritedAgentRules: false,
      requestedAgentRuleKeys: [
        'behavioral:style:content',
        'behavioral:theme:allowed',
        'behavioral:theme:disallowed',
        'contextual:audience:target',
        'contextual:positioning:public',
      ],
      focusKeywords: ['content', 'theme', 'audience', 'positioning'],
    },
  };
}

function readStructuredOwnerSettingField(input: unknown): string | null {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const record = input as Record<string, unknown>;
  const structured = record.structured && typeof record.structured === 'object'
    ? record.structured as Record<string, unknown>
    : null;
  const ownerSettingField = structured?.ownerSettingField;
  return typeof ownerSettingField === 'string' && ownerSettingField.trim()
    ? ownerSettingField.trim()
    : null;
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function normalizeRuntimeProjectionSummary(response: RealmRuntimeProjectionResponse): RuntimeProjectionSummary | null {
  if (!response || typeof response !== 'object') {
    return null;
  }
  const record = response as unknown as Record<string, unknown>;
  const consumerSurface = record.consumerSurface;
  const worldId = readOptionalString(record, 'worldId');
  const checksum = readOptionalString(record, 'checksum');
  if (consumerSurface !== 'RUNTIME_PAYLOAD' || !worldId || !checksum) {
    return null;
  }

  const payload = record.payload && typeof record.payload === 'object' ? record.payload as Record<string, unknown> : {};
  const trace = record.trace && typeof record.trace === 'object' ? record.trace as Record<string, unknown> : {};

  return {
    source: REALM_RUNTIME_PROJECTION_SOURCE,
    consumerSurface,
    worldId,
    checksum,
    selectedInputCount: readArray(record.selectedInputs).length,
    suppressedInputCount: readArray(trace.suppressedInputs).length,
    worldRuleCount: readArray(payload.worldRules).length,
    rawRuleContentExposed: false,
  };
}

export function normalizeAgentChatReadinessProjectionSummary(
  response: RealmRuntimeProjectionResponse,
): AgentChatReadinessProjectionSummary | null {
  const base = normalizeRuntimeProjectionSummary(response);
  if (!base) {
    return null;
  }
  const record = response as unknown as Record<string, unknown>;
  const agentId = readOptionalString(record, 'agentId');
  if (!agentId) {
    return null;
  }

  const payload = record.payload && typeof record.payload === 'object' ? record.payload as Record<string, unknown> : {};
  const agentRules = readArray(payload.agentRules);
  return {
    ...base,
    agentId,
    agentRuleCount: agentRules.length,
    selectedOwnerSettingFields: uniqueSorted(
      agentRules
        .map((input) => readStructuredOwnerSettingField(input))
        .filter((value): value is string => Boolean(value)),
    ),
  };
}

export function normalizeForgeImportedAgentChatReadinessSummary(
  response: RealmForgeImportedAgentChatReadinessResponse,
): ForgeImportedAgentChatReadinessSummary | null {
  if (!response || typeof response !== 'object') {
    return null;
  }
  const record = response as unknown as Record<string, unknown>;
  if (
    record.ownerScope !== 'forge-imported-system'
    || record.consumerSurface !== 'AGENT_CHAT_READINESS'
    || record.rawRuleContentExposed !== false
  ) {
    return null;
  }

  const agentId = readOptionalString(record, 'agentId');
  const worldId = readOptionalString(record, 'worldId');
  const checksum = readOptionalString(record, 'runtimeProjectionChecksum');
  const selectedInputCount = readNonNegativeNumber(record, 'selectedInputCount');
  const suppressedInputCount = readNonNegativeNumber(record, 'suppressedInputCount');
  const worldRuleCount = readNonNegativeNumber(record, 'worldRuleCount');
  const agentRuleCount = readNonNegativeNumber(record, 'agentRuleCount');
  if (
    !agentId
    || !worldId
    || !checksum
    || selectedInputCount === undefined
    || suppressedInputCount === undefined
    || worldRuleCount === undefined
    || agentRuleCount === undefined
  ) {
    return null;
  }

  const profile = record.profile && typeof record.profile === 'object'
    ? record.profile as Record<string, unknown>
    : null;
  const gates = record.gates && typeof record.gates === 'object'
    ? record.gates as Record<string, unknown>
    : null;
  if (!profile || !gates) {
    return null;
  }

  const displayName = readOptionalString(profile, 'displayName');
  const handle = readOptionalString(profile, 'handle');
  const avatarUrl = readNullableString(profile, 'avatarUrl');
  const profileCoverUrl = readNullableString(profile, 'profileCoverUrl');
  const defaultVoiceReference = readNullableString(profile, 'defaultVoiceReference');
  const speechModelId = readNullableString(profile, 'speechModelId');
  const speechRoutePolicy = readNullableString(profile, 'speechRoutePolicy');
  if (
    !displayName
    || !handle
    || avatarUrl === undefined
    || profileCoverUrl === undefined
    || defaultVoiceReference === undefined
    || speechModelId === undefined
    || (speechRoutePolicy !== null && speechRoutePolicy !== 'local' && speechRoutePolicy !== 'cloud')
  ) {
    return null;
  }

  const localAgentIdentityReady = readBoolean(gates, 'localAgentIdentityReady');
  const profileContextReady = readBoolean(gates, 'profileContextReady');
  const ownerSettingsReady = readBoolean(gates, 'ownerSettingsReady');
  const profileMediaReady = readBoolean(gates, 'profileMediaReady');
  const voiceReferenceReady = readBoolean(gates, 'voiceReferenceReady');
  const speechRouteReady = readBoolean(gates, 'speechRouteReady');
  if (
    localAgentIdentityReady === undefined
    || profileContextReady === undefined
    || ownerSettingsReady === undefined
    || profileMediaReady === undefined
    || voiceReferenceReady === undefined
    || speechRouteReady === undefined
  ) {
    return null;
  }

  return {
    source: FORGE_IMPORTED_AGENT_CHAT_READINESS_SOURCE,
    consumerSurface: 'AGENT_CHAT_READINESS',
    worldId,
    checksum,
    selectedInputCount,
    suppressedInputCount,
    worldRuleCount,
    rawRuleContentExposed: false,
    agentId,
    agentRuleCount,
    selectedOwnerSettingFields: readArray(record.selectedOwnerSettingFields)
      .filter((value): value is string => typeof value === 'string'),
    profile: {
      displayName,
      handle,
      avatarUrl,
      profileCoverUrl,
      defaultVoiceReference,
      speechModelId,
      speechRoutePolicy,
    },
    gates: {
      localAgentIdentityReady,
      profileContextReady,
      ownerSettingsReady,
      profileMediaReady,
      voiceReferenceReady,
      speechRouteReady,
    },
  };
}
export async function getAgentVisibilitySettings(
  agentId: string,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<RealmAgentVisibilitySettings> {
  return realm.agentControllerGetVisibility({ path: { id: agentId } });
}

export async function getOwnerAgentSettings(
  agentId: string,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<RealmOwnerAgentSettings> {
  return realm.getMyRealmAgentSettings({ path: { agentId } });
}

export async function getForgeImportedSystemAgentSettings(
  agentId: string,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<RealmOwnerAgentSettings> {
  return realm.getForgeImportedSystemAgentSettings({ path: { agentId } });
}

export async function getPortfolioAgentSettings(
  agent: OwnerPortfolioAgentDetail,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<RealmOwnerAgentSettings> {
  if (agent.ownerScope === 'forge-imported-system') {
    return getForgeImportedSystemAgentSettings(agent.id, realm);
  }
  return getOwnerAgentSettings(agent.id, realm);
}

export async function updateReviewedAgentVisibility(
  agentId: string,
  draft: AgentVisibilityDraft,
  current: RealmAgentVisibilitySettings,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<RealmAgentVisibilityUpdateResult> {
  const { input, errors } = buildRealmUpdateVisibilityInput(draft, current);
  if (!input) {
    return {
      ok: false,
      source: REALM_AGENT_VISIBILITY_SOURCE,
      lifecycleTruth: false,
      failure: errors.some((error) => error.includes('no reviewed changes'))
        ? 'visibility-no-changes'
        : 'visibility-payload-invalid',
      message: errors.join('; ') || 'visibility payload invalid',
      submitted: null,
      draft,
    };
  }

  try {
    const settings = await realm.agentControllerUpdateVisibility({
      path: { id: agentId },
      body: input,
    });
    return {
      ok: true,
      source: REALM_AGENT_VISIBILITY_SOURCE,
      lifecycleTruth: false,
      submitted: input,
      settings,
    };
  } catch (error) {
    return {
      ok: false,
      source: REALM_AGENT_VISIBILITY_SOURCE,
      lifecycleTruth: false,
      failure: 'realm-update-visibility-failed',
      message: error instanceof Error ? error.message : 'Realm visibility update failed.',
      submitted: input,
      draft,
    };
  }
}

export async function proposeReviewedOwnerAgentSettings(
  agentId: string,
  draft: OwnerAgentSettingsDraft,
  current: RealmOwnerAgentSettings,
  runtime?: RuntimeTextClient | null,
  agentContext?: OwnerAgentSettingsProposalContext,
): Promise<RuntimeOwnerSettingsProposalResult> {
  // The prompt starts with the unresolved marker; studio-ai-runtime must bind a
  // concrete text.generate route before dispatch.
  const built = buildRuntimeOwnerSettingsProposalPrompt({
    agentId,
    draft,
    current,
    ...(agentContext ? { agentContext } : {}),
  });
  if (!built.ok) {
    return {
      ok: false,
      source: SETTINGS_AI_PROPOSAL_SOURCE,
      candidate: false,
      truthWrite: false,
      failure: 'runtime-settings-proposal-payload-invalid',
      message: built.errors.join('; ') || 'Runtime settings proposal payload invalid.',
      submitted: null,
    };
  }

  const runtimeClient = runtime === undefined ? await createStudioRuntimeClient() : runtime;
  if (!runtimeClient) {
    return {
      ok: false,
      source: SETTINGS_AI_PROPOSAL_SOURCE,
      candidate: false,
      truthWrite: false,
      failure: 'runtime-settings-proposal-transport-unavailable',
      message: 'Runtime runtime.ai.text.generate runtime transport unavailable: Tauri IPC runtime transport is required.',
      submitted: built.payload,
    };
  }

  try {
    const output = await runStudioTextGenerate(built.payload, runtimeClient);
    try {
      const proposal = normalizeRuntimeOwnerSettingsProposal(output.text, draft);
      return {
        ok: true,
        source: SETTINGS_AI_PROPOSAL_SOURCE,
        candidate: true,
        truthWrite: false,
        proposal,
        submitted: output.submitted,
        runtime: {
          ...(output.trace?.traceId ? { traceId: output.trace.traceId } : {}),
          ...(output.trace?.modelResolved ? { modelResolved: output.trace.modelResolved } : {}),
          ...(output.finishReason ? { finishReason: String(output.finishReason) } : {}),
        },
      };
    } catch (error) {
      return {
        ok: false,
        source: SETTINGS_AI_PROPOSAL_SOURCE,
        candidate: false,
        truthWrite: false,
        failure: 'runtime-settings-proposal-invalid-output',
        message: error instanceof Error ? error.message : 'Runtime settings proposal output invalid.',
        submitted: output.submitted,
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'runtime transport call failed.';
    const routeUnbound = isStudioAIRouteBindingFailure(error);
    return {
      ok: false,
      source: SETTINGS_AI_PROPOSAL_SOURCE,
      candidate: false,
      truthWrite: false,
      failure: routeUnbound ? 'runtime-settings-proposal-route-unbound' : 'runtime-settings-proposal-failed',
      message: routeUnbound ? message : `Runtime runtime.ai.text.generate failed: ${message}`,
      submitted: null,
    };
  }
}

export async function proposeReviewedPortfolioAgentSettings(
  agent: OwnerPortfolioAgentDetail,
  draft: OwnerAgentSettingsDraft,
  current: RealmOwnerAgentSettings,
  runtime?: RuntimeTextClient | null,
): Promise<RuntimeOwnerSettingsProposalResult> {
  return proposeReviewedOwnerAgentSettings(
    agent.id,
    draft,
    current,
    runtime,
    buildPortfolioSettingsProposalContext(agent),
  );
}
export async function updateReviewedOwnerAgentSettings(
  agentId: string,
  draft: OwnerAgentSettingsDraft,
  current: RealmOwnerAgentSettings,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<RealmOwnerAgentSettingsUpdateResult> {
  const built = buildRealmOwnerAgentSettingsUpdateInput(draft, current);
  if (!built.ok) {
    return {
      ok: false,
      source: OWNER_SETTINGS_SAVE_SOURCE,
      truthWrite: false,
      failure: built.failure === 'owner-settings-invalid' ? 'owner-settings-payload-invalid' : 'owner-settings-no-changes',
      message: built.errors.join('; ') || 'Owner settings payload invalid.',
      submitted: null,
      draft,
    };
  }

  const submitted = built.input as RealmOwnerAgentSettingsUpdateInput;
  try {
    const settings = await realm.updateMyRealmAgentSettings({
      path: { agentId },
      body: submitted,
    });
    return {
      ok: true,
      source: OWNER_SETTINGS_SAVE_SOURCE,
      truthWrite: true,
      submitted,
      settings,
    };
  } catch (error) {
    return {
      ok: false,
      source: OWNER_SETTINGS_SAVE_SOURCE,
      truthWrite: false,
      failure: 'realm-update-owner-settings-failed',
      message: error instanceof Error ? error.message : 'Realm owner settings update failed.',
      submitted,
      draft,
    };
  }
}

export async function updateReviewedPortfolioAgentSettings(
  agent: OwnerPortfolioAgentDetail,
  draft: OwnerAgentSettingsDraft,
  current: RealmOwnerAgentSettings,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<RealmOwnerAgentSettingsUpdateResult> {
  if (agent.ownerScope !== 'forge-imported-system') {
    return updateReviewedOwnerAgentSettings(agent.id, draft, current, realm);
  }

  const built = buildRealmOwnerAgentSettingsUpdateInput(draft, current);
  if (!built.ok) {
    return {
      ok: false,
      source: FORGE_IMPORTED_SETTINGS_SAVE_SOURCE,
      truthWrite: false,
      failure: built.failure === 'owner-settings-invalid' ? 'owner-settings-payload-invalid' : 'owner-settings-no-changes',
      message: built.errors.join('; ') || 'Forge-imported system-agent settings payload invalid.',
      submitted: null,
      draft,
    };
  }

  const submitted = built.input as RealmForgeImportedSystemAgentSettingsUpdateInput;
  try {
    const settings = await realm.updateForgeImportedSystemAgentSettings({
      path: { agentId: agent.id },
      body: submitted,
    });
    return {
      ok: true,
      source: FORGE_IMPORTED_SETTINGS_SAVE_SOURCE,
      truthWrite: true,
      submitted,
      settings,
    };
  } catch (error) {
    return {
      ok: false,
      source: FORGE_IMPORTED_SETTINGS_SAVE_SOURCE,
      truthWrite: false,
      failure: 'realm-update-owner-settings-failed',
      message: error instanceof Error ? error.message : 'Realm Forge-imported system-agent settings update failed.',
      submitted,
      draft,
    };
  }
}
export async function projectAgentRuntimeContextSummary(
  agent: OwnerPortfolioAgentDetail,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<RuntimeProjectionSummaryResult> {
  const submitted = buildRuntimeProjectionInput(agent);
  if (!submitted) {
    return {
      ok: false,
      source: REALM_RUNTIME_PROJECTION_SOURCE,
      truthWrite: false,
      failure: 'runtime-projection-world-unavailable',
      message: 'Runtime projection requires worldId evidence from Realm MeService.getMyRealmAgent.',
      submitted: null,
    };
  }

  try {
    const response = await realm.projectRuntimePayload({
      path: {},
      body: submitted,
    });
    const summary = normalizeRuntimeProjectionSummary(response);
    if (!summary) {
      return {
        ok: false,
        source: REALM_RUNTIME_PROJECTION_SOURCE,
        truthWrite: false,
        failure: 'runtime-projection-invalid-response',
        message: 'Runtime projection response did not include RUNTIME_PAYLOAD checksum summary.',
        submitted,
      };
    }
    return {
      ok: true,
      source: REALM_RUNTIME_PROJECTION_SOURCE,
      truthWrite: false,
      summary,
      submitted,
    };
  } catch (error) {
    return {
      ok: false,
      source: REALM_RUNTIME_PROJECTION_SOURCE,
      truthWrite: false,
      failure: 'runtime-projection-failed',
      message: error instanceof Error ? error.message : 'Realm runtime projection failed.',
      submitted,
    };
  }
}

export async function projectAgentChatReadinessContextSummary(
  agent: OwnerPortfolioAgentDetail,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<AgentChatReadinessSummaryResult> {
  if (agent.ownerScope === 'forge-imported-system') {
    const submitted = agent.id.trim()
      ? { agentId: agent.id.trim(), ownerScope: 'forge-imported-system' as const }
      : null;
    if (!submitted) {
      return {
        ok: false,
        source: FORGE_IMPORTED_AGENT_CHAT_READINESS_SOURCE,
        truthWrite: false,
        failure: 'runtime-projection-world-unavailable',
        message: 'Forge-imported Agent Chat readiness requires RealmAgent id evidence.',
        submitted: null,
      };
    }

    try {
      const response = await realm.getForgeImportedSystemAgentChatReadiness({
        path: { agentId: submitted.agentId },
      });
      const summary = normalizeForgeImportedAgentChatReadinessSummary(response);
      if (!summary) {
        return {
          ok: false,
          source: FORGE_IMPORTED_AGENT_CHAT_READINESS_SOURCE,
          truthWrite: false,
          failure: 'runtime-projection-invalid-response',
          message: 'Forge-imported Agent Chat readiness response did not include product-safe summary gates.',
          submitted,
        };
      }
      return {
        ok: true,
        source: FORGE_IMPORTED_AGENT_CHAT_READINESS_SOURCE,
        truthWrite: false,
        summary,
        submitted,
      };
    } catch (error) {
      return {
        ok: false,
        source: FORGE_IMPORTED_AGENT_CHAT_READINESS_SOURCE,
        truthWrite: false,
        failure: 'runtime-projection-failed',
        message: error instanceof Error ? error.message : 'Realm Forge-imported Agent Chat readiness read failed.',
        submitted,
      };
    }
  }

  const submitted = buildAgentChatReadinessProjectionInput(agent);
  if (!submitted) {
    return {
      ok: false,
      source: REALM_RUNTIME_PROJECTION_SOURCE,
      truthWrite: false,
      failure: 'runtime-projection-world-unavailable',
      message: 'Agent Chat readiness projection requires RealmAgent id and worldId evidence.',
      submitted: null,
    };
  }

  try {
    const response = await realm.projectRuntimePayload({
      path: {},
      body: submitted,
    });
    const summary = normalizeAgentChatReadinessProjectionSummary(response);
    if (!summary) {
      return {
        ok: false,
        source: REALM_RUNTIME_PROJECTION_SOURCE,
        truthWrite: false,
        failure: 'runtime-projection-invalid-response',
        message: 'Agent Chat readiness projection response did not include agent-specific RUNTIME_PAYLOAD summary.',
        submitted,
      };
    }
    return {
      ok: true,
      source: REALM_RUNTIME_PROJECTION_SOURCE,
      truthWrite: false,
      summary,
      submitted,
    };
  } catch (error) {
    return {
      ok: false,
      source: REALM_RUNTIME_PROJECTION_SOURCE,
      truthWrite: false,
      failure: 'runtime-projection-failed',
      message: error instanceof Error ? error.message : 'Realm Agent Chat readiness projection failed.',
      submitted,
    };
  }
}
