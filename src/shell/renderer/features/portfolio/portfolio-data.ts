import type {
  RealmGetForgeImportedSystemAgentOperationResponse,
  RealmGetMyRealmAgentOperationResponse,
  RealmListForgeImportedSystemAgentsOperationResponse,
  RealmListMyRealmAgentsOperationResponse,
} from '@nimiplatform/sdk/realm/generated';

export type MyRealmAgentDto = RealmListMyRealmAgentsOperationResponse[number];
export type MyRealmAgentDetailDto = RealmGetMyRealmAgentOperationResponse;
export type ForgeImportedSystemAgentDto = RealmListForgeImportedSystemAgentsOperationResponse[number];
export type ForgeImportedSystemAgentDetailDto = RealmGetForgeImportedSystemAgentOperationResponse;

export type PortfolioAgentOwnerScope = 'owner-created' | 'forge-imported-system';
export type PortfolioAgentListSource =
  | 'Realm MeService.listMyRealmAgents'
  | 'Realm AgentCuratedSystemService.listForgeImportedSystemAgents';
export type PortfolioAgentDetailSource =
  | 'Realm MeService.getMyRealmAgent'
  | 'Realm AgentCuratedSystemService.getForgeImportedSystemAgent';

export type FriendCountMetric =
  | { status: 'available'; value: number }
  | { status: 'source-unavailable'; label: 'friendCount source unavailable' };

export type OwnerPortfolioAgent = {
  id: string;
  displayName: string;
  handle: string;
  coverUrl: string | null;
  avatarUrl: string | null;
  ownerScope: PortfolioAgentOwnerScope;
  source: PortfolioAgentListSource;
  realmState: string | null;
  worldName: string | null;
  updatedAt: string | null;
  friendCount: FriendCountMetric;
};

export type OwnerPortfolioFilter = 'all' | 'friend-count-available' | 'friend-count-unavailable';
export type OwnerPortfolioSort = 'realm-order' | 'display-name-asc' | 'updated-desc' | 'friend-count-desc' | 'friend-count-asc';

export type OwnerPortfolioViewControls = {
  query: string;
  filter: OwnerPortfolioFilter;
  sort: OwnerPortfolioSort;
};

export type SettingFieldKey =
  | 'displayName'
  | 'handle'
  | 'bio'
  | 'greeting'
  | 'profileCoverUrl'
  | 'ownership'
  | 'world'
  | 'state';

export type SettingField = {
  key: SettingFieldKey;
  label: string;
  value: string;
  status: 'available' | 'available-empty' | 'source-unavailable';
  source: PortfolioAgentDetailSource;
  readOnly: true;
  unavailableLabel?: 'setting source unavailable';
  emptyLabel?: 'not set';
};

export type PortfolioAgentVoiceConfig = {
  voiceId: string;
  description: string;
  emotionEnabled: boolean | null;
  speed: number | null;
  pitch: number | null;
  speechModelId: string;
  speechRoutePolicy: 'local' | 'cloud' | null;
};

export type OwnerPortfolioAgentDetail = {
  id: string;
  displayName: SettingField;
  handle: SettingField;
  bio: SettingField;
  greeting: SettingField;
  profileCoverUrl: SettingField;
  ownership: SettingField;
  world: SettingField;
  state: SettingField;
  avatarUrl: string | null;
  voice?: PortfolioAgentVoiceConfig;
  friendCount: FriendCountMetric;
  ownerScope: PortfolioAgentOwnerScope;
  source: PortfolioAgentDetailSource;
};

export type PortfolioFailureKind =
  | 'realm-unavailable'
  | 'permission-missing'
  | 'owner-authority-missing'
  | 'setting-read-unavailable'
  | 'unknown';

export type PortfolioFailure = {
  kind: PortfolioFailureKind;
  title: 'Realm unavailable' | 'Permission missing' | 'owner authority missing' | 'Setting read unavailable' | 'Portfolio unavailable';
  detail: string;
};

function readOptionalRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readHttpStatus(error: unknown): number | null {
  const errorRecord = readOptionalRecord(error);
  const details = readOptionalRecord(errorRecord?.details);
  return readNumber(errorRecord?.status) || readNumber(details?.httpStatus);
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function readOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

type StringFieldRead = { present: true; value: string } | { present: false };

function readStringField(record: Record<string, unknown> | null, key: string): StringFieldRead {
  if (!record || !Object.prototype.hasOwnProperty.call(record, key)) {
    return { present: false };
  }
  const value = record[key];
  return typeof value === 'string'
    ? { present: true, value: value.trim() }
    : { present: false };
}

function readFirstStringField(
  record: Record<string, unknown> | null,
  keys: readonly string[],
): StringFieldRead {
  for (const key of keys) {
    const field = readStringField(record, key);
    if (field.present) {
      return field;
    }
  }
  return { present: false };
}

function readWorldName(agentProfile: Record<string, unknown> | null): string | null {
  const world = readOptionalRecord(agentProfile?.world);
  return readString(world?.name) || readString(agentProfile?.worldName) || readString(agentProfile?.worldId);
}

function readUpdatedAt(agent: MyRealmAgentDto): string | null {
  const record = agent as unknown as Record<string, unknown>;
  const profile = readOptionalRecord(record.agentProfile);
  const metadata = readOptionalRecord(record.agent);
  return readString(profile?.updatedAt) || readString(metadata?.updatedAt) || readString(record.createdAt);
}

export function normalizeFriendCount(agent: MyRealmAgentDto | ForgeImportedSystemAgentDto): FriendCountMetric {
  if (Object.prototype.hasOwnProperty.call(agent, 'friendCount') && typeof agent.friendCount === 'number') {
    return { status: 'available', value: agent.friendCount };
  }
  return { status: 'source-unavailable', label: 'friendCount source unavailable' };
}

export function normalizeOwnerPortfolioAgent(
  agent: MyRealmAgentDto | ForgeImportedSystemAgentDto,
  scope: PortfolioAgentOwnerScope = 'owner-created',
): OwnerPortfolioAgent {
  const profile = readOptionalRecord(agent.agentProfile);
  const source: PortfolioAgentListSource = scope === 'forge-imported-system'
    ? 'Realm AgentCuratedSystemService.listForgeImportedSystemAgents'
    : 'Realm MeService.listMyRealmAgents';

  return {
    id: agent.id,
    displayName: agent.displayName,
    handle: agent.handle,
    coverUrl: agent.profileCoverUrl || null,
    avatarUrl: agent.avatarUrl || null,
    ownerScope: scope,
    source,
    realmState: readString(profile?.state),
    worldName: readWorldName(profile),
    updatedAt: readUpdatedAt(agent),
    friendCount: normalizeFriendCount(agent),
  };
}

export function normalizeOwnerPortfolio(agents: readonly MyRealmAgentDto[]): OwnerPortfolioAgent[] {
  return agents.map((agent) => normalizeOwnerPortfolioAgent(agent));
}

export function normalizeForgeImportedSystemPortfolio(agents: readonly ForgeImportedSystemAgentDto[]): OwnerPortfolioAgent[] {
  return agents.map((agent) => normalizeOwnerPortfolioAgent(agent, 'forge-imported-system'));
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, undefined, { sensitivity: 'base', numeric: true });
}

function compareUpdatedDesc(left: OwnerPortfolioAgent, right: OwnerPortfolioAgent): number {
  if (left.updatedAt && right.updatedAt) {
    return right.updatedAt.localeCompare(left.updatedAt) || compareText(left.displayName, right.displayName);
  }
  if (left.updatedAt) {
    return -1;
  }
  if (right.updatedAt) {
    return 1;
  }
  return compareText(left.displayName, right.displayName);
}

function compareFriendCount(left: OwnerPortfolioAgent, right: OwnerPortfolioAgent, direction: 'asc' | 'desc'): number {
  const leftMetric = left.friendCount;
  const rightMetric = right.friendCount;
  const leftAvailable = leftMetric.status === 'available';
  const rightAvailable = rightMetric.status === 'available';
  if (leftAvailable && rightAvailable) {
    const valueComparison = direction === 'desc'
      ? rightMetric.value - leftMetric.value
      : leftMetric.value - rightMetric.value;
    return valueComparison || compareText(left.displayName, right.displayName);
  }
  if (leftAvailable) {
    return -1;
  }
  if (rightAvailable) {
    return 1;
  }
  return compareText(left.displayName, right.displayName);
}

function agentMatchesQuery(agent: OwnerPortfolioAgent, normalizedQuery: string): boolean {
  if (!normalizedQuery) {
    return true;
  }

  return [
    agent.id,
    agent.displayName,
    agent.handle,
    agent.worldName || '',
    agent.realmState || '',
  ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
}

function agentMatchesFilter(agent: OwnerPortfolioAgent, filter: OwnerPortfolioFilter): boolean {
  if (filter === 'friend-count-available') {
    return agent.friendCount.status === 'available';
  }
  if (filter === 'friend-count-unavailable') {
    return agent.friendCount.status === 'source-unavailable';
  }
  return true;
}

export function applyOwnerPortfolioView(
  agents: OwnerPortfolioAgent[],
  controls: OwnerPortfolioViewControls,
): OwnerPortfolioAgent[] {
  const normalizedQuery = controls.query.trim().toLocaleLowerCase();
  const visibleAgents = agents.filter((agent) => (
    agentMatchesQuery(agent, normalizedQuery) && agentMatchesFilter(agent, controls.filter)
  ));

  if (controls.sort === 'realm-order') {
    return visibleAgents;
  }

  return [...visibleAgents].sort((left, right) => {
    if (controls.sort === 'updated-desc') {
      return compareUpdatedDesc(left, right);
    }
    if (controls.sort === 'friend-count-desc') {
      return compareFriendCount(left, right, 'desc');
    }
    if (controls.sort === 'friend-count-asc') {
      return compareFriendCount(left, right, 'asc');
    }
    return compareText(left.displayName, right.displayName);
  });
}

function settingField(
  key: SettingFieldKey,
  label: string,
  field: StringFieldRead,
  source: PortfolioAgentDetailSource,
): SettingField {
  if (!field.present) {
    return {
      key,
      label,
      value: '',
      status: 'source-unavailable',
      source,
      readOnly: true,
      unavailableLabel: 'setting source unavailable',
    };
  }

  if (!field.value) {
    return {
      key,
      label,
      value: '',
      status: 'available-empty',
      source,
      readOnly: true,
      emptyLabel: 'not set',
    };
  }

  return {
    key,
    label,
    value: field.value,
    status: 'available',
    source,
    readOnly: true,
  };
}

function readAgentVoiceConfig(profile: Record<string, unknown> | null): PortfolioAgentVoiceConfig {
  const dna = readOptionalRecord(profile?.dna);
  const voice = readOptionalRecord(dna?.voice);
  const speechRoutePolicy = readString(voice?.speechRoutePolicy);
  return {
    voiceId: readString(voice?.voiceId) || '',
    description: readString(voice?.description) || '',
    emotionEnabled: readBoolean(voice?.emotionEnabled),
    speed: readOptionalNumber(voice?.speed),
    pitch: readOptionalNumber(voice?.pitch),
    speechModelId: readString(voice?.speechModelId) || '',
    speechRoutePolicy: speechRoutePolicy === 'local' || speechRoutePolicy === 'cloud'
      ? speechRoutePolicy
      : null,
  };
}

export function normalizeOwnerPortfolioAgentDetail(
  agent: MyRealmAgentDetailDto | ForgeImportedSystemAgentDetailDto,
  scope: PortfolioAgentOwnerScope = 'owner-created',
): OwnerPortfolioAgentDetail {
  const agentRecord = agent as unknown as Record<string, unknown>;
  const profile = readOptionalRecord(agent.agentProfile);
  const bio = readFirstStringField(agentRecord, ['bio', 'description']);
  const source: PortfolioAgentDetailSource = scope === 'forge-imported-system'
    ? 'Realm AgentCuratedSystemService.getForgeImportedSystemAgent'
    : 'Realm MeService.getMyRealmAgent';
  return {
    id: agent.id,
    displayName: settingField('displayName', 'Display name', readStringField(agentRecord, 'displayName'), source),
    handle: settingField('handle', 'Handle', readStringField(agentRecord, 'handle'), source),
    bio: settingField('bio', 'Profile description', bio.present ? bio : readFirstStringField(profile, ['bio', 'description']), source),
    greeting: settingField('greeting', 'Greeting', readStringField(profile, 'greeting'), source),
    profileCoverUrl: settingField('profileCoverUrl', 'Profile cover URL', readStringField(agentRecord, 'profileCoverUrl'), source),
    ownership: settingField('ownership', 'Ownership evidence', readStringField(profile, 'ownershipType'), source),
    world: settingField('world', 'World evidence', readFirstStringField(profile, ['activeWorldId', 'ownerWorldId', 'worldId']), source),
    state: settingField('state', 'State evidence', readStringField(profile, 'state'), source),
    avatarUrl: agent.avatarUrl || null,
    voice: readAgentVoiceConfig(profile),
    friendCount: normalizeFriendCount(agent),
    ownerScope: scope,
    source,
  };
}

export function classifyRealmAgentReadFailure(error: unknown, read: 'portfolio' | 'detail'): PortfolioFailure {
  const status = readHttpStatus(error);
  if (status === 401 || status === 403) {
    return {
      kind: 'permission-missing',
      title: 'Permission missing',
      detail: read === 'detail'
        ? 'This Runtime account session is not authorized to read that Realm Agent.'
        : 'This Runtime account session is not authorized to read your Realm Agent portfolio.',
    };
  }

  const message = error instanceof Error ? error.message : '';
  if (/owner|MASTER_OWNED|authority/i.test(message)) {
    return {
      kind: 'owner-authority-missing',
      title: 'owner authority missing',
      detail: read === 'detail'
        ? 'Realm did not prove current-user owner-created authority for this Realm Agent detail.'
        : 'Realm did not prove current-user owner-created authority for this portfolio.',
    };
  }

  if (/fetch|network|timeout|realm/i.test(message)) {
    return {
      kind: 'realm-unavailable',
      title: 'Realm unavailable',
      detail: read === 'detail' ? 'Realm Agent detail could not reach Realm.' : 'Owner portfolio could not reach Realm.',
    };
  }

  if (/setting|field|read|shape|schema|parse/i.test(message)) {
    return {
      kind: 'setting-read-unavailable',
      title: 'Setting read unavailable',
      detail: read === 'detail'
        ? 'Realm did not return usable read-only setting fields for this agent.'
        : 'Realm did not return usable portfolio fields.',
    };
  }

  return {
    kind: read === 'detail' ? 'setting-read-unavailable' : 'unknown',
    title: read === 'detail' ? 'Setting read unavailable' : 'Portfolio unavailable',
    detail: read === 'detail'
      ? 'Realm did not return a usable user-owned Realm Agent detail.'
      : 'Realm did not return a usable owner portfolio.',
  };
}

export function classifyPortfolioFailure(error: unknown): PortfolioFailure {
  return classifyRealmAgentReadFailure(error, 'portfolio');
}

export function classifyAgentDetailFailure(error: unknown): PortfolioFailure {
  return classifyRealmAgentReadFailure(error, 'detail');
}
