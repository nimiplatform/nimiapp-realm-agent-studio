import type { OwnerPortfolioAgentDetail, SettingField } from './portfolio-data.js';

export type IdentityPackCandidateKey =
  | 'avatar'
  | 'profile-cover'
  | 'portrait-reference'
  | 'post-image-style'
  | 'voice-demo';

export type IdentityPackCandidate = {
  key: IdentityPackCandidateKey;
  title: string;
  prompt: string;
  reviewState: 'candidate-only';
  publicWrite:
    | 'avatar-url-selection-admitted-after-owner-url-review'
    | 'profile-cover-publication-blocked'
    | 'resource-agent-binding-blocked'
    | 'voice-publication-blocked'
    | 'post-attachment-candidate-only';
  sourceFields: string[];
  blockedReason?: string;
};

export type IdentityPackBuildResult =
  | {
    changed: true;
    errors: [];
    source: 'realm-agent-studio.identity-pack-from-current-agent';
    candidates: IdentityPackCandidate[];
  }
  | {
    changed: false;
    errors: string[];
    source: 'realm-agent-studio.identity-pack-from-current-agent';
    candidates: [];
  };

function available(field: SettingField): string {
  return field.status === 'available' && field.value.trim() ? field.value.trim() : '';
}

function joinPrompt(parts: string[]): string {
  return parts.map((part) => part.trim()).filter(Boolean).join('\n');
}

function sourceFields(agent: OwnerPortfolioAgentDetail): string[] {
  return [
    ...(available(agent.displayName) ? ['displayName'] : []),
    ...(available(agent.handle) ? ['handle'] : []),
    ...(available(agent.bio) ? ['bio'] : []),
    ...(available(agent.greeting) ? ['greeting'] : []),
    ...(available(agent.world) ? ['world'] : []),
    ...(agent.avatarUrl ? ['avatarUrl'] : []),
  ];
}

export function buildIdentityPackFromAgent(agent: OwnerPortfolioAgentDetail): IdentityPackBuildResult {
  const displayName = available(agent.displayName);
  const bio = available(agent.bio);
  const greeting = available(agent.greeting);
  const world = available(agent.world);
  const fields = sourceFields(agent);
  const errors: string[] = [];
  if (!displayName) errors.push('display name source unavailable or empty');
  if (!bio && !greeting) errors.push('profile description or greeting required for identity pack');
  if (errors.length > 0) {
    return {
      changed: false,
      errors,
      source: 'realm-agent-studio.identity-pack-from-current-agent',
      candidates: [],
    };
  }

  const common = joinPrompt([
    `Realm Agent: ${displayName}`,
    bio ? `Profile description: ${bio}` : '',
    greeting ? `Greeting voice: ${greeting}` : '',
    world ? `World context: ${world}` : '',
  ]);

  return {
    changed: true,
    errors: [],
    source: 'realm-agent-studio.identity-pack-from-current-agent',
    candidates: [
      {
        key: 'avatar',
        title: 'Avatar',
        prompt: joinPrompt([
          common,
          'Create a clear square avatar portrait. Emphasize recognizable face, strong silhouette, and readable profile identity.',
        ]),
        reviewState: 'candidate-only',
        publicWrite: 'avatar-url-selection-admitted-after-owner-url-review',
        sourceFields: fields,
      },
      {
        key: 'profile-cover',
        title: 'Profile Cover',
        prompt: joinPrompt([
          common,
          'Create a wide profile cover composition with environment, mood, and identity cues. Do not include text.',
        ]),
        reviewState: 'candidate-only',
        publicWrite: 'profile-cover-publication-blocked',
        sourceFields: fields,
        blockedReason: 'Owner-scoped profile cover write path is not admitted.',
      },
      {
        key: 'portrait-reference',
        title: 'Portrait Reference',
        prompt: joinPrompt([
          common,
          'Create a portrait/reference image for future visual consistency. Keep it inspectable and neutral.',
        ]),
        reviewState: 'candidate-only',
        publicWrite: 'resource-agent-binding-blocked',
        sourceFields: fields,
        blockedReason: 'Resource-to-Agent Binding publication is not admitted for this app.',
      },
      {
        key: 'post-image-style',
        title: 'Post Image Style',
        prompt: joinPrompt([
          common,
          'Create a reusable image style direction for future agent-authored posts.',
        ]),
        reviewState: 'candidate-only',
        publicWrite: 'post-attachment-candidate-only',
        sourceFields: fields,
      },
      {
        key: 'voice-demo',
        title: 'Voice Demo',
        prompt: greeting || `I am ${displayName}. ${bio}`,
        reviewState: 'candidate-only',
        publicWrite: 'voice-publication-blocked',
        sourceFields: fields,
        blockedReason: 'Voice sample publication as public profile asset is not admitted.',
      },
    ],
  };
}
