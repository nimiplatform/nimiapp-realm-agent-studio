import type {
  RealmAgentControllerCheckHandleOperationResponse,
  RealmAgentControllerCreateOperationResponse,
} from '@nimiplatform/sdk/realm/generated';
import { createStudioRealmClient, type StudioRealmSurface } from '@renderer/data/realm-client.js';
import {
  normalizeCbdbCuratedSystemPortfolio,
  normalizeOwnerPortfolio,
  normalizeOwnerPortfolioAgentDetail,
  type OwnerPortfolioAgent,
  type OwnerPortfolioAgentDetail,
} from './portfolio-data.js';
import {
  REALM_AGENT_CREATE_SOURCE,
  normalizeCreateRealmAgentDraft,
  normalizeRealmAgentHandleAvailability,
  normalizeSelectableWorlds,
  normalizeSelectedWorldPreview,
  type NormalizedRealmAgentHandleAvailability,
  type RealmAgentCreationWorldDto,
  type RealmCreateAgentInput,
  type ReviewedCreateRealmAgentPayload,
  type SelectableRealmWorld,
  type SelectedWorldPreview,
} from './create-agent-draft.js';
import {
  getOwnerAgentSettings,
  updateReviewedOwnerAgentSettings,
  type RealmOwnerAgentSettings,
  type RealmOwnerAgentSettingsUpdateResult,
} from './portfolio-settings-client.js';
import {
  OWNER_SETTINGS_SAVE_SOURCE,
  createOwnerAgentSettingsDraft,
} from './setting-proposal.js';

type StudioRealmClient = StudioRealmSurface;

type RealmCreateAgentResponse = RealmAgentControllerCreateOperationResponse;
type RealmAgentHandleAvailabilityResponse = RealmAgentControllerCheckHandleOperationResponse;

export type RealmAgentCreateCanonicalFields = {
  id: string;
  state?: string;
};

export type RealmAgentCreateResult =
  | {
    ok: true;
    source: typeof REALM_AGENT_CREATE_SOURCE;
    agent: RealmCreateAgentResponse;
    canonical: RealmAgentCreateCanonicalFields;
  }
	  | {
	    ok: false;
	    source: typeof REALM_AGENT_CREATE_SOURCE;
	    failure: 'realm-create-agent-failed' | 'realm-create-agent-missing-canonical-id';
	    message: string;
	  };

export type RealmAgentCreateProfileSettingsCompletion =
  | {
    status: 'not-requested';
    truthWrite: false;
    description: '';
  }
  | {
    status: 'already-current';
    source: 'Realm MeService.getMyRealmAgentSettings';
    truthWrite: false;
    description: string;
    settings: RealmOwnerAgentSettings;
  }
  | {
    status: 'updated';
    source: typeof OWNER_SETTINGS_SAVE_SOURCE;
    truthWrite: true;
    description: string;
    submitted: Extract<RealmOwnerAgentSettingsUpdateResult, { ok: true }>['submitted'];
    settings: RealmOwnerAgentSettings;
  };

export type RealmAgentCreateWithProfileSettingsResult =
  | {
    ok: true;
    source: typeof REALM_AGENT_CREATE_SOURCE;
    agent: RealmCreateAgentResponse;
    canonical: RealmAgentCreateCanonicalFields;
    profileSettings: RealmAgentCreateProfileSettingsCompletion;
  }
  | {
    ok: false;
    source: typeof REALM_AGENT_CREATE_SOURCE;
    failure:
      | 'realm-create-agent-failed'
      | 'realm-create-agent-missing-canonical-id'
      | 'realm-create-agent-profile-settings-read-failed'
      | 'realm-create-agent-profile-settings-failed';
    message: string;
    createdCanonical?: RealmAgentCreateCanonicalFields;
    settingsResult?: RealmOwnerAgentSettingsUpdateResult;
  };

export type RealmAgentHandleAvailabilityResult =
  | {
    ok: true;
    truthWrite: false;
    availability: NormalizedRealmAgentHandleAvailability;
    response: RealmAgentHandleAvailabilityResponse;
  }
  | {
    ok: false;
    truthWrite: false;
    failure: 'agent-handle-invalid' | 'realm-agent-handle-check-failed' | 'realm-agent-handle-check-invalid-response';
    message: string;
    availability: null;
  };

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function buildRealmCreateAgentInput(payload: ReviewedCreateRealmAgentPayload): RealmCreateAgentInput {
  const body = payload.body;
  return {
    handle: body.handle,
    displayName: body.displayName,
    worldId: body.worldId,
    concept: body.concept,
    ownershipType: 'MASTER_OWNED',
    // Realm requires `dnaPrimary` (or full `dna` JSON); otherwise it throws
    // `AGENT_DNA_REQUIRED`. We send the archetype-based form and let the
    // backend construct the full AgentDna from primary + optional secondary.
    dnaPrimary: body.dnaPrimary,
    ...(body.dnaSecondary && body.dnaSecondary.length > 0 ? { dnaSecondary: [...body.dnaSecondary] } : {}),
    ...(body.description ? { description: body.description } : {}),
    ...(body.rules
      ? {
        rules: {
          format: 'rule-lines-v1',
          lines: [...body.rules.lines],
          text: body.rules.text,
        },
      }
      : {}),
    // Optional reference image produced by the AI-seeded create flow. Schema
    // (`CreateAgentDto.referenceImageUrl`) accepts a single canonical URL.
    ...(body.referenceImageUrl ? { referenceImageUrl: body.referenceImageUrl } : {}),
  };
}

export function normalizeRealmAgentCreateResult(agent: RealmCreateAgentResponse): RealmAgentCreateResult {
  if (!agent || typeof agent !== 'object') {
    return {
      ok: false,
      source: REALM_AGENT_CREATE_SOURCE,
      failure: 'realm-create-agent-missing-canonical-id',
      message: 'Realm Create Agent returned no agent object.',
    };
  }

  const record = agent as unknown as Record<string, unknown>;
  const id = readOptionalString(record, 'id');
  if (!id) {
    return {
      ok: false,
      source: REALM_AGENT_CREATE_SOURCE,
      failure: 'realm-create-agent-missing-canonical-id',
      message: 'Realm Create Agent returned no canonical agent id.',
    };
  }

  const state = readOptionalString(record, 'state');
  return {
    ok: true,
    source: REALM_AGENT_CREATE_SOURCE,
    agent,
    canonical: {
      id,
      ...(state ? { state } : {}),
    },
  };
}
export async function listOwnerPortfolioAgents(realm: StudioRealmClient = createStudioRealmClient()): Promise<OwnerPortfolioAgent[]> {
  const agents = await realm.listMyRealmAgents({ path: {} });
  return normalizeOwnerPortfolio(agents);
}

export async function listCbdbCuratedSystemPortfolioAgents(
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<OwnerPortfolioAgent[]> {
  const agents = await realm.listCbdbCuratedSystemAgents({ path: {} });
  return normalizeCbdbCuratedSystemPortfolio(agents);
}

export async function listRealmAgentStudioPortfolioAgents(
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<OwnerPortfolioAgent[]> {
  const [ownerAgents, cbdbAgents] = await Promise.all([
    listOwnerPortfolioAgents(realm),
    listCbdbCuratedSystemPortfolioAgents(realm),
  ]);
  return [...ownerAgents, ...cbdbAgents];
}

export async function getOwnerPortfolioAgentDetail(
  agentId: string,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<OwnerPortfolioAgentDetail> {
  const agent = await realm.getMyRealmAgent({ path: { agentId } });
  return normalizeOwnerPortfolioAgentDetail(agent);
}

export async function getCbdbCuratedSystemPortfolioAgentDetail(
  agentId: string,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<OwnerPortfolioAgentDetail> {
  const agent = await realm.getCbdbCuratedSystemAgent({ path: { agentId } });
  return normalizeOwnerPortfolioAgentDetail(agent, 'cbdb-curated-system');
}

export async function getRealmAgentStudioPortfolioAgentDetail(
  agentId: string,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<OwnerPortfolioAgentDetail> {
  try {
    return await getOwnerPortfolioAgentDetail(agentId, realm);
  } catch (ownerError) {
    try {
      return await getCbdbCuratedSystemPortfolioAgentDetail(agentId, realm);
    } catch {
      throw ownerError;
    }
  }
}

export async function listCreateRealmAgentSelectableWorlds(
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<SelectableRealmWorld[]> {
  const worlds = await realm.worldControllerListWorlds({ path: {} });
  return normalizeSelectableWorlds(worlds as RealmAgentCreationWorldDto[]);
}

export async function getCreateRealmAgentWorldPreview(
  worldId: string,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<SelectedWorldPreview> {
  const world = await realm.worldControllerGetWorldDetailWithAgents({
    path: { id: worldId },
    query: { recommendedAgentLimit: 4 },
  });
  return normalizeSelectedWorldPreview(world);
}

export async function checkCreateRealmAgentHandleAvailability(
  handle: string,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<RealmAgentHandleAvailabilityResult> {
  const normalizedHandle = normalizeCreateRealmAgentDraft({
    handle,
    displayName: '',
    concept: '',
    description: '',
    ruleText: '',
    selectedWorldId: '',
    dnaPrimary: '',
    dnaSecondary: [],
    referenceImageUrl: '',
    originalDescription: '',
  }).handle;
  if (!normalizedHandle) {
    return {
      ok: false,
      truthWrite: false,
      failure: 'agent-handle-invalid',
      message: 'Agent handle check requires a non-empty normalized handle.',
      availability: null,
    };
  }

  try {
    const response = await realm.agentControllerCheckHandle({
      path: {},
      query: { handle: normalizedHandle },
    });
    if (!response || typeof response !== 'object' || typeof (response as unknown as Record<string, unknown>).available !== 'boolean') {
      return {
        ok: false,
        truthWrite: false,
        failure: 'realm-agent-handle-check-invalid-response',
        message: 'Realm handle availability check did not return an availability boolean.',
        availability: null,
      };
    }
    return {
      ok: true,
      truthWrite: false,
      availability: normalizeRealmAgentHandleAvailability(normalizedHandle, response),
      response,
    };
  } catch (error) {
    return {
      ok: false,
      truthWrite: false,
      failure: 'realm-agent-handle-check-failed',
      message: error instanceof Error ? error.message : 'Realm handle availability check failed.',
      availability: null,
    };
  }
}

export async function createReviewedRealmAgent(
  payload: ReviewedCreateRealmAgentPayload,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<RealmAgentCreateResult> {
  try {
    const agent = await realm.agentControllerCreate({
      path: {},
      body: buildRealmCreateAgentInput(payload),
    });
    return normalizeRealmAgentCreateResult(agent);
  } catch (error) {
    return {
      ok: false,
      source: REALM_AGENT_CREATE_SOURCE,
      failure: 'realm-create-agent-failed',
      message: error instanceof Error ? error.message : 'Realm Create Agent failed.',
    };
  }
}

export async function createReviewedRealmAgentWithProfileSettings(
  payload: ReviewedCreateRealmAgentPayload,
  realm: StudioRealmClient = createStudioRealmClient(),
): Promise<RealmAgentCreateWithProfileSettingsResult> {
  const createResult = await createReviewedRealmAgent(payload, realm);
  if (!createResult.ok) {
    return createResult;
  }

  const profileDescription = (payload.publicFields.description || payload.body.description || '').trim();
  if (!profileDescription) {
    return {
      ...createResult,
      profileSettings: {
        status: 'not-requested',
        truthWrite: false,
        description: '',
      },
    };
  }

  let currentSettings: RealmOwnerAgentSettings;
  try {
    currentSettings = await getOwnerAgentSettings(createResult.canonical.id, realm);
  } catch (error) {
    return {
      ok: false,
      source: REALM_AGENT_CREATE_SOURCE,
      failure: 'realm-create-agent-profile-settings-read-failed',
      message: error instanceof Error ? error.message : 'Realm owner settings read failed after create.',
      createdCanonical: createResult.canonical,
    };
  }

  if ((currentSettings.description || '').trim() === profileDescription) {
    return {
      ...createResult,
      profileSettings: {
        status: 'already-current',
        source: 'Realm MeService.getMyRealmAgentSettings',
        truthWrite: false,
        description: profileDescription,
        settings: currentSettings,
      },
    };
  }

  const settingsDraft = {
    ...createOwnerAgentSettingsDraft(currentSettings),
    description: profileDescription,
  };
  const settingsResult = await updateReviewedOwnerAgentSettings(
    createResult.canonical.id,
    settingsDraft,
    currentSettings,
    realm,
  );
  if (!settingsResult.ok) {
    return {
      ok: false,
      source: REALM_AGENT_CREATE_SOURCE,
      failure: 'realm-create-agent-profile-settings-failed',
      message: settingsResult.message,
      createdCanonical: createResult.canonical,
      settingsResult,
    };
  }

  return {
    ...createResult,
    profileSettings: {
      status: 'updated',
      source: OWNER_SETTINGS_SAVE_SOURCE,
      truthWrite: true,
      description: profileDescription,
      submitted: settingsResult.submitted,
      settings: settingsResult.settings,
    },
  };
}

export * from './portfolio-media-client.js';
export * from './portfolio-post-client.js';
export * from './portfolio-settings-client.js';
