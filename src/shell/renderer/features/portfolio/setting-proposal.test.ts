import { beforeEach, describe, expect, it } from 'vitest';
import { resetStudioAIConfigForTest } from './portfolio-client.test-helpers.js';
import {
  RAW_RULE_REVIEW_DEFERRED_REASON,
  assertNoForbiddenOwnerSettingsFields,
  applyRuntimeOwnerSettingsProposal,
  buildRealmOwnerAgentSettingsUpdateInput,
  buildRuntimeOwnerSettingsProposalPrompt,
  createOwnerAgentSettingsDraft,
  normalizeOwnerAgentSettingsDraft,
  normalizeRuntimeOwnerSettingsProposal,
  type OwnerAgentSettingsSnapshot,
} from './setting-proposal.js';

const settings: OwnerAgentSettingsSnapshot = {
  displayName: 'Mira',
  description: 'Quiet strategist',
  greeting: 'Welcome in.',
  naturalLanguageIntent: null,
  identity: {
    publicRole: 'Guide',
    worldview: 'The world is layered.',
  },
  personality: {
    summary: 'Patient and practical.',
    relationshipMode: 'mentor',
    interests: ['strategy', 'tea'],
    goals: ['keep lore coherent'],
  },
  communication: {
    contentStyle: 'Concise.',
    formality: 'casual',
    responseLength: 'medium',
    sentiment: 'neutral',
  },
  boundaries: {
    allowedThemes: ['adventure'],
    disallowedThemes: ['gore'],
  },
  positioning: {
    targetAudience: 'builders',
    positioning: 'operational guide',
  },
};

beforeEach(() => {
  resetStudioAIConfigForTest();
});

describe('owner settings proposal normalization', () => {
  it('creates an editable draft from owner settings DTO shape', () => {
    expect(createOwnerAgentSettingsDraft(settings)).toMatchObject({
      displayName: 'Mira',
      description: 'Quiet strategist',
      publicRole: 'Guide',
      interestsText: 'strategy, tea',
      allowedThemesText: 'adventure',
      rawRuleTextCandidate: '',
    });
  });

  it('normalizes text, enums, and list fields without introducing hidden keys', () => {
    expect(normalizeOwnerAgentSettingsDraft({
      ...createOwnerAgentSettingsDraft(settings),
      displayName: '  Mira   Prime  ',
      interestsText: 'strategy, ruins\ntea',
      allowedThemesText: ' adventure, friendship ',
      rawRuleTextCandidate: '  Keep replies practical.\r\nAvoid spoilers.  ',
    })).toMatchObject({
      displayName: 'Mira Prime',
      interests: ['strategy', 'ruins', 'tea'],
      allowedThemes: ['adventure', 'friendship'],
      rawRuleTextCandidate: 'Keep replies practical.\nAvoid spoilers.',
    });
  });

  it('builds an UpdateOwnerAgentSettingsDto diff and excludes raw rule text', () => {
    const result = buildRealmOwnerAgentSettingsUpdateInput({
      ...createOwnerAgentSettingsDraft(settings),
      displayName: 'Mira Prime',
      worldview: 'The world is layered and negotiated.',
      interestsText: 'strategy, tea, ruins',
      formality: 'formal',
      rawRuleTextCandidate: 'Visible rule candidate only.',
    }, settings);

    expect(result).toMatchObject({
      ok: true,
      changed: true,
      input: {
        displayName: 'Mira Prime',
        identity: {
          worldview: 'The world is layered and negotiated.',
        },
        personality: {
          interests: ['strategy', 'tea', 'ruins'],
        },
        communication: {
          formality: 'formal',
        },
      },
    });
    expect(JSON.stringify(result.input)).not.toContain('Visible rule candidate only.');
    expect(result.ok ? result.preview.rawRuleReview?.reason : '').toBe(RAW_RULE_REVIEW_DEFERRED_REASON);
    expect(result.ok ? result.preview.submitted : {}).not.toHaveProperty('profileCoverUrl');
    expect(result.ok ? result.preview.submitted : {}).not.toHaveProperty('agentRules');
  });

  it('fails closed when only raw rule review changed', () => {
    expect(buildRealmOwnerAgentSettingsUpdateInput({
      ...createOwnerAgentSettingsDraft(settings),
      rawRuleTextCandidate: 'Only raw rule review.',
    }, settings)).toMatchObject({
      ok: false,
      failure: 'raw-rule-review-deferred',
      errors: [RAW_RULE_REVIEW_DEFERRED_REASON],
      input: null,
    });
  });

  it('rejects invalid enum values before Realm submission', () => {
    expect(buildRealmOwnerAgentSettingsUpdateInput({
      ...createOwnerAgentSettingsDraft(settings),
      formality: 'robotic',
    }, settings)).toMatchObject({
      ok: false,
      failure: 'owner-settings-invalid',
      input: null,
    });
  });

  it('detects forbidden owner settings fields recursively', () => {
    expect(assertNoForbiddenOwnerSettingsFields({
      submitted: {
        provider: 'forbidden',
      },
    })).toBe('provider');
    expect(assertNoForbiddenOwnerSettingsFields({
      submitted: {
        profileCoverUrl: 'https://cdn.example.test/cover.png',
      },
    })).toBe('profileCoverUrl');
    expect(assertNoForbiddenOwnerSettingsFields({
      submitted: {
        identity: {
          worldview: 'Allowed',
        },
      },
    })).toBeNull();
  });

  it('builds a Runtime text proposal request from owner intent without hardcoded provider fields', () => {
    const draft = {
      ...createOwnerAgentSettingsDraft(settings),
      naturalLanguageIntent: 'Make Mira warmer and clearer for builders.',
    };
    const result = buildRuntimeOwnerSettingsProposalPrompt({
      agentId: 'agent-1',
      current: settings,
      draft,
    });

    expect(result.ok).toBe(true);
    expect(result.payload).toMatchObject({
      request: {
        model: { modelId: 'auto' },
        parameters: {
          metadata: {
            domain: 'realm-agent-studio.settings-proposal',
          },
        },
      },
    });
    const userText = result.payload?.request.messages
      .find((message) => message.role === 'user')
      ?.content.find((part) => part.type === 'text')?.text || '';
    expect(userText).not.toContain('provider');
    expect(userText).not.toContain('LocalAgent');
  });

  it('builds a CBDB curated Runtime proposal request with source-backed enrichment lanes', () => {
    const draft = {
      ...createOwnerAgentSettingsDraft(settings),
      naturalLanguageIntent: 'Add a self-introduction, Song speech posture, and final portrait direction.',
    };
    const result = buildRuntimeOwnerSettingsProposalPrompt({
      agentId: 'cbdb-agent-su-shi',
      current: settings,
      draft,
      agentContext: {
        ownerScope: 'cbdb-curated-system',
        displayName: 'Su Shi',
        handle: 'su-shi',
        worldId: 'cbdb-song-slice-real-20260614-world',
        worldName: 'CBDB Song Slice',
      },
    });

    expect(result.ok).toBe(true);
    const systemText = result.payload?.request.messages
      .find((message) => message.role === 'system')
      ?.content.find((part) => part.type === 'text')?.text || '';
    const userText = result.payload?.request.messages
      .find((message) => message.role === 'user')
      ?.content.find((part) => part.type === 'text')?.text || '';
    const userPayload = JSON.parse(userText) as Record<string, unknown>;

    expect(systemText).toContain('CBDB curated system-agent lane');
    expect(systemText).toContain('Preserve source-backed historical facts');
    expect(systemText).toContain('contentStyle only');
    expect(userPayload).toMatchObject({
      agentContext: {
        ownerScope: 'cbdb-curated-system',
        handle: 'su-shi',
        worldId: 'cbdb-song-slice-real-20260614-world',
      },
    });
    expect(userPayload.cbdbEnrichmentLanes).toEqual([
      'self-introduction -> description/greeting/personalitySummary/publicRole/worldview',
      'accent/speech posture -> communication.contentStyle only',
      'portrait/final look -> visual image or avatar package candidate outside owner settings',
      'voice demo -> audio candidate outside owner settings',
    ]);
    expect(userText).not.toContain('avatarUrl');
    expect(userText).not.toContain('LocalAgent');
  });

  it('normalizes Runtime proposal JSON into admitted draft fields only', () => {
    const baseDraft = createOwnerAgentSettingsDraft(settings);
    const proposal = normalizeRuntimeOwnerSettingsProposal(JSON.stringify({
      description: 'Warmer public strategist.',
      worldview: 'Layered world with practical entry points.',
      contentStyle: 'Warm, clear, and concise.',
      allowedThemesText: ['adventure', 'friendship'],
      responseLength: 'short',
      rationale: 'Matches the owner request.',
    }), baseDraft);

    expect(proposal).toMatchObject({
      candidate: true,
      truthWrite: false,
      changedSettingKeys: ['description', 'worldview', 'contentStyle', 'allowedThemesText', 'responseLength'],
      draftPatch: {
        description: 'Warmer public strategist.',
        allowedThemesText: 'adventure, friendship',
        responseLength: 'short',
      },
    });
    expect(applyRuntimeOwnerSettingsProposal(baseDraft, proposal)).toMatchObject({
      description: 'Warmer public strategist.',
      worldview: 'Layered world with practical entry points.',
      contentStyle: 'Warm, clear, and concise.',
    });
  });

  it('rejects Runtime proposals with forbidden or invalid setting fields', () => {
    const baseDraft = createOwnerAgentSettingsDraft(settings);
    expect(() => normalizeRuntimeOwnerSettingsProposal(JSON.stringify({
      model: 'forbidden',
      description: 'Allowed text.',
    }), baseDraft)).toThrow('unknown field model');
    expect(() => normalizeRuntimeOwnerSettingsProposal(JSON.stringify({
      responseLength: 'endless',
    }), baseDraft)).toThrow('invalid responseLength');
  });

  it('rejects Runtime proposals wrapped in prose or carrying unknown fields', () => {
    const baseDraft = createOwnerAgentSettingsDraft(settings);
    expect(() => normalizeRuntimeOwnerSettingsProposal(`\`\`\`json\n${JSON.stringify({
      description: 'Allowed text.',
    })}\n\`\`\``, baseDraft)).toThrow('single JSON object');
    expect(() => normalizeRuntimeOwnerSettingsProposal(JSON.stringify({
      description: 'Allowed text.',
      agentRule: 'not admitted',
    }), baseDraft)).toThrow('unknown field agentRule');
  });
});
