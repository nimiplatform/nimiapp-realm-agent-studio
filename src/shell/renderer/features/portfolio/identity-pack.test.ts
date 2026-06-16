import { describe, expect, it } from 'vitest';
import { buildIdentityPackFromAgent } from './identity-pack.js';
import type { OwnerPortfolioAgentDetail, SettingField } from './portfolio-data.js';

function field(key: SettingField['key'], label: string, value: string, status: SettingField['status'] = 'available'): SettingField {
  return {
    key,
    label,
    value,
    status,
    source: 'Realm MeService.getMyRealmAgent',
    readOnly: true,
  };
}

const agent: OwnerPortfolioAgentDetail = {
  id: 'agent-1',
  displayName: field('displayName', 'Display name', 'Mira Prime'),
  handle: field('handle', 'Handle', 'mira-prime'),
  bio: field('bio', 'Profile description', 'A calm artifact review strategist.'),
  greeting: field('greeting', 'Greeting', 'Bring the source material first.'),
  profileCoverUrl: field('profileCoverUrl', 'Profile cover URL', ''),
  ownership: field('ownership', 'Ownership evidence', 'MASTER_OWNED'),
  world: field('world', 'World evidence', 'world-oasis'),
  state: field('state', 'State evidence', 'ACTIVE'),
  avatarUrl: null,
  friendCount: { status: 'available', value: 1 },
  ownerScope: 'owner-created',
  source: 'Realm MeService.getMyRealmAgent',
};

describe('identity pack', () => {
  it('builds candidate-only identity outputs from source-backed agent fields', () => {
    const pack = buildIdentityPackFromAgent(agent);

    expect(pack.changed).toBe(true);
    if (!pack.changed) return;
    expect(pack.candidates.map((candidate) => candidate.key)).toEqual([
      'avatar',
      'profile-cover',
      'portrait-reference',
      'post-image-style',
      'voice-demo',
    ]);
    expect(pack.candidates.every((candidate) => candidate.reviewState === 'candidate-only')).toBe(true);
    expect(pack.candidates.find((candidate) => candidate.key === 'profile-cover')).toMatchObject({
      publicWrite: 'profile-cover-publication-blocked',
      blockedReason: 'Owner-scoped profile cover write path is not admitted.',
    });
    expect(pack.candidates.find((candidate) => candidate.key === 'portrait-reference')).toMatchObject({
      publicWrite: 'resource-agent-binding-blocked',
    });
    expect(pack.candidates.find((candidate) => candidate.key === 'avatar')).toMatchObject({
      publicWrite: 'avatar-url-selection-admitted-after-owner-url-review',
    });
  });

  it('fails closed when required source-backed identity text is missing', () => {
    expect(buildIdentityPackFromAgent({
      ...agent,
      displayName: field('displayName', 'Display name', '', 'available-empty'),
      bio: field('bio', 'Profile description', '', 'available-empty'),
      greeting: field('greeting', 'Greeting', '', 'available-empty'),
    })).toEqual({
      changed: false,
      errors: [
        'display name source unavailable or empty',
        'profile description or greeting required for identity pack',
      ],
      source: 'realm-agent-studio.identity-pack-from-current-agent',
      candidates: [],
    });
  });
});
