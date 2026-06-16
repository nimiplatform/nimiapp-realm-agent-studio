import type { OwnerPortfolioAgentDetail, SettingField } from '@renderer/features/portfolio/portfolio-data.js';

export type AgentCockpitCardStatus = 'ready' | 'missing' | 'unavailable' | 'blocked';

export type AgentCockpitActionKey =
  | 'improve-settings'
  | 'generate-identity'
  | 'create-post'
  | 'review-visibility'
  | 'inspect-source';

export type AgentCockpitAction = {
  key: AgentCockpitActionKey;
  label: string;
  route: 'settings' | 'assets' | 'posts' | 'insights';
  reason: string;
  source: 'Realm MeService.getMyRealmAgent' | 'local workspace state';
};

export type AgentCockpitCard = {
  key: 'profile' | 'ai-readiness' | 'identity' | 'content' | 'adoption';
  title: string;
  status: AgentCockpitCardStatus;
  summary: string;
  evidence: string[];
  actions: AgentCockpitActionKey[];
  source: 'Realm MeService.getMyRealmAgent';
};

export type AgentCockpitModel = {
  cards: AgentCockpitCard[];
  actions: AgentCockpitAction[];
  unavailableSignals: string[];
  missingSignals: string[];
};

function hasValue(field: SettingField): boolean {
  return field.status === 'available' && field.value.trim().length > 0;
}

function isUnavailable(field: SettingField): boolean {
  return field.status === 'source-unavailable';
}

function fieldEvidence(label: string, field: SettingField): string {
  if (isUnavailable(field)) return `${label}: source unavailable`;
  if (hasValue(field)) return `${label}: available`;
  return `${label}: not set`;
}

function statusFor(unavailable: string[], missing: string[]): AgentCockpitCardStatus {
  if (unavailable.length > 0) return 'unavailable';
  if (missing.length > 0) return 'missing';
  return 'ready';
}

export function deriveAgentCockpitModel(agent: OwnerPortfolioAgentDetail): AgentCockpitModel {
  const actions: AgentCockpitAction[] = [
    {
      key: 'improve-settings',
      label: 'Improve settings',
      route: 'settings',
      reason: 'Review public identity, greeting, communication, and boundary fields.',
      source: 'Realm MeService.getMyRealmAgent',
    },
    {
      key: 'generate-identity',
      label: 'Generate identity',
      route: 'assets',
      reason: 'Create avatar, visual reference, and voice candidates from source-backed profile fields.',
      source: 'Realm MeService.getMyRealmAgent',
    },
    {
      key: 'create-post',
      label: 'Create post',
      route: 'posts',
      reason: 'Draft owner-reviewed content from current profile voice and public setting fields.',
      source: 'Realm MeService.getMyRealmAgent',
    },
    {
      key: 'review-visibility',
      label: 'Review visibility',
      route: 'settings',
      reason: 'Open owner-scoped settings and visibility controls.',
      source: 'Realm MeService.getMyRealmAgent',
    },
    {
      key: 'inspect-source',
      label: 'Inspect sources',
      route: 'insights',
      reason: 'Check source availability and deferred metrics without fallback values.',
      source: 'Realm MeService.getMyRealmAgent',
    },
  ];

  const unavailableSignals: string[] = [];
  const missingSignals: string[] = [];
  const trackedFields = [
    ['display name', agent.displayName],
    ['handle', agent.handle],
    ['profile description', agent.bio],
    ['greeting', agent.greeting],
    ['profile cover URL', agent.profileCoverUrl],
    ['world', agent.world],
    ['state', agent.state],
  ] as const;
  for (const [label, field] of trackedFields) {
    if (isUnavailable(field)) unavailableSignals.push(label);
    else if (!hasValue(field)) missingSignals.push(label);
  }
  if (!agent.avatarUrl) missingSignals.push('avatar');
  if (agent.friendCount.status === 'source-unavailable') unavailableSignals.push('friendCount');

  const profileUnavailable = [agent.displayName, agent.handle, agent.bio, agent.greeting].filter(isUnavailable).map((field) => field.label);
  const profileMissing = [
    ...(hasValue(agent.displayName) ? [] : ['display name']),
    ...(hasValue(agent.handle) ? [] : ['handle']),
    ...(hasValue(agent.bio) ? [] : ['profile description']),
    ...(hasValue(agent.greeting) ? [] : ['greeting']),
  ];

  const hasVoiceConfig = Boolean(agent.voice?.voiceId || agent.voice?.description || agent.voice?.speechModelId);
  const identityUnavailable = [agent.profileCoverUrl].filter(isUnavailable).map((field) => field.label);
  const identityMissing = [
    ...(agent.avatarUrl ? [] : ['avatar']),
    ...(hasValue(agent.profileCoverUrl) ? [] : ['profile cover']),
    ...(hasVoiceConfig ? [] : ['voice config']),
  ];

  const contentUnavailable = [agent.bio, agent.greeting].filter(isUnavailable).map((field) => field.label);
  const contentMissing = [
    ...(hasValue(agent.bio) ? [] : ['profile description']),
    ...(hasValue(agent.greeting) ? [] : ['greeting']),
  ];

  const adoptionUnavailable = agent.friendCount.status === 'source-unavailable' ? ['friendCount'] : [];

  const cards: AgentCockpitCard[] = [
    {
      key: 'profile',
      title: 'Profile State',
      status: statusFor(profileUnavailable, profileMissing),
      summary: profileUnavailable.length > 0
        ? 'Realm did not return all required profile fields.'
        : profileMissing.length > 0
          ? 'Public profile needs owner-reviewed completion.'
          : 'Public profile fields are source-backed.',
      evidence: [
        fieldEvidence('Display name', agent.displayName),
        fieldEvidence('Handle', agent.handle),
        fieldEvidence('Profile description', agent.bio),
        fieldEvidence('Greeting', agent.greeting),
      ],
      actions: ['improve-settings', 'review-visibility'],
      source: 'Realm MeService.getMyRealmAgent',
    },
    {
      key: 'ai-readiness',
      title: 'AI Readiness',
      status: statusFor(profileUnavailable, [...profileMissing, ...(hasVoiceConfig ? [] : ['voice config'])]),
      summary: 'Runtime actions can use only visible owner-approved profile fields and explicit owner prompts.',
      evidence: [
        fieldEvidence('Profile description', agent.bio),
        fieldEvidence('Greeting', agent.greeting),
        `Voice config: ${hasVoiceConfig ? 'available' : 'not set'}`,
      ],
      actions: ['improve-settings', 'generate-identity'],
      source: 'Realm MeService.getMyRealmAgent',
    },
    {
      key: 'identity',
      title: 'Identity Assets',
      status: statusFor(identityUnavailable, identityMissing),
      summary: identityUnavailable.length > 0
        ? 'Profile media source is unavailable from Realm.'
        : identityMissing.length > 0
          ? 'Avatar, cover, or voice candidates need owner review.'
          : 'Identity media has source-backed profile evidence.',
      evidence: [
        `Avatar: ${agent.avatarUrl ? 'available' : 'not set'}`,
        fieldEvidence('Profile cover URL', agent.profileCoverUrl),
        `Voice config: ${hasVoiceConfig ? 'available' : 'not set'}`,
      ],
      actions: ['generate-identity'],
      source: 'Realm MeService.getMyRealmAgent',
    },
    {
      key: 'content',
      title: 'Content Readiness',
      status: statusFor(contentUnavailable, contentMissing),
      summary: contentMissing.length > 0
        ? 'Post drafts need stronger profile voice evidence before generation.'
        : 'Profile voice is available for owner-reviewed post drafting.',
      evidence: [
        fieldEvidence('Profile description', agent.bio),
        fieldEvidence('Greeting', agent.greeting),
      ],
      actions: ['create-post', 'improve-settings'],
      source: 'Realm MeService.getMyRealmAgent',
    },
    {
      key: 'adoption',
      title: 'Adoption Signal',
      status: adoptionUnavailable.length > 0 ? 'unavailable' : 'ready',
      summary: agent.friendCount.status === 'available'
        ? `friendCount is source-backed at ${agent.friendCount.value}.`
        : 'friendCount source is unavailable; no fallback metric is shown.',
      evidence: [
        agent.friendCount.status === 'available'
          ? `friendCount: ${agent.friendCount.value}`
          : 'friendCount: source unavailable',
      ],
      actions: ['inspect-source'],
      source: 'Realm MeService.getMyRealmAgent',
    },
  ];

  return {
    cards,
    actions,
    unavailableSignals,
    missingSignals,
  };
}
