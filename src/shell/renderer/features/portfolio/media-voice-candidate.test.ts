import { beforeEach, describe, expect, it } from 'vitest';
import type { OwnerPortfolioAgentDetail, SettingField } from './portfolio-data.js';
import { resetStudioAIConfigForTest } from './portfolio-client.test-helpers.js';
import {
  assertNoForbiddenMediaCandidateFields,
  buildReviewedVisualImageCandidatePayload,
  buildReviewedVisualImageGenerationPayload,
  buildReviewedVoiceDemoCandidatePayload,
  buildReviewedVoiceSynthesisPayload,
  isAllowedMediaCandidateBindingPoint,
  isAllowedMediaCandidateResourceType,
  normalizeVisualMediaCandidateInput,
  normalizeVoiceDemoCandidateInput,
} from './media-voice-candidate.js';

function settingField(key: SettingField['key'], label: string, value: string): SettingField {
  const hasValue = value.length > 0;

  return {
    key,
    label,
    value,
    status: hasValue ? 'available' : 'available-empty',
    source: 'Realm MeService.getMyRealmAgent',
    readOnly: true,
    emptyLabel: hasValue ? undefined : 'not set',
  };
}

const agent: OwnerPortfolioAgentDetail = {
  id: 'agent-1',
  displayName: settingField('displayName', 'Display name', 'Mira'),
  handle: settingField('handle', 'Handle', 'mira'),
  bio: settingField('bio', 'Profile description', 'Public strategist bio'),
  greeting: settingField('greeting', 'Greeting', 'Welcome in.'),
  profileCoverUrl: settingField('profileCoverUrl', 'Profile cover URL', 'https://cdn.example.test/cover.png'),
  ownership: settingField('ownership', 'Ownership evidence', 'MASTER_OWNED'),
  world: settingField('world', 'World evidence', 'OASIS'),
  state: settingField('state', 'State evidence', 'ACTIVE'),
  avatarUrl: 'https://cdn.example.test/avatar.png',
  friendCount: { status: 'available', value: 7 },
  ownerScope: 'owner-created',
  source: 'Realm MeService.getMyRealmAgent',
};

function collectKeys(value: unknown, keys = new Set<string>()) {
  if (!value || typeof value !== 'object') {
    return keys;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    keys.add(key);
    collectKeys(nested, keys);
  }
  return keys;
}

beforeEach(() => {
  resetStudioAIConfigForTest();
});

describe('media and voice candidate normalization', () => {
  it('validates admitted resource types and binding points', () => {
    expect(isAllowedMediaCandidateResourceType('IMAGE')).toBe(true);
    expect(isAllowedMediaCandidateResourceType('VIDEO')).toBe(true);
    expect(isAllowedMediaCandidateResourceType('AUDIO')).toBe(true);
    expect(isAllowedMediaCandidateResourceType('VOICE')).toBe(false);
    expect(isAllowedMediaCandidateBindingPoint('AGENT_AVATAR')).toBe(true);
    expect(isAllowedMediaCandidateBindingPoint('AGENT_VOICE_SAMPLE')).toBe(true);
    expect(isAllowedMediaCandidateBindingPoint('WORLD_SCENE')).toBe(false);
  });

  it('normalizes visual input and falls back to local candidate defaults', () => {
    expect(normalizeVisualMediaCandidateInput({
      resourceType: 'VIDEO',
      bindingPoint: 'WORLD_SCENE',
      prompt: '  cinematic portrait\r\nsoft light  ',
      notes: '  owner reviewed only  ',
    })).toEqual({
      resourceType: 'IMAGE',
      bindingPoint: 'AGENT_CANDIDATE',
      prompt: 'cinematic portrait\nsoft light',
      notes: 'owner reviewed only',
    });
  });

  it('normalizes voice input to Resource(AUDIO) and AGENT_VOICE_SAMPLE', () => {
    expect(normalizeVoiceDemoCandidateInput({
      scriptText: '  Hello\r\nfrom the public demo.  ',
    })).toEqual({
      resourceType: 'AUDIO',
      bindingPoint: 'AGENT_VOICE_SAMPLE',
      scriptText: 'Hello\nfrom the public demo.',
    });
  });
});

describe('reviewed media and voice candidate payloads', () => {
  it('builds an allowlisted Runtime image generation candidate', () => {
    const result = buildReviewedVisualImageGenerationPayload({
      resourceType: 'IMAGE',
      bindingPoint: 'AGENT_CANDIDATE',
      prompt: '  warm public portrait  ',
      notes: 'blue accent',
      aspectRatio: '4:5',
    }, agent);

    expect(result).toMatchObject({
      changed: true,
      errors: [],
      payload: {
        surfaceId: 'realm-agent-studio.visual-image-candidate',
        params: {
          model: 'auto',
          aspectRatio: '4:5',
        },
        request: {
          head: {
            appId: 'nimi.realm-agent-studio',
            modelId: 'auto',
          },
          spec: {
            spec: {
              oneofKind: 'imageGenerate',
              imageGenerate: {
                prompt: 'warm public portrait\nOwner notes: blue accent\nRealm Agent display name: Mira\nProfile description context: Public strategist bio',
                n: 1,
                aspectRatio: '4:5',
                responseFormat: 'url',
              },
            },
          },
        },
      },
    });
    expect(collectKeys(result.payload).has('provider')).toBe(false);
    expect(collectKeys(result.payload).has('localAgent')).toBe(false);
    expect(collectKeys(result.payload).has('worldId')).toBe(false);
  });

  it('builds visual image candidate evidence without claiming public asset truth', () => {
    const result = buildReviewedVisualImageCandidatePayload({
      resourceType: 'IMAGE',
      bindingPoint: 'AGENT_PORTRAIT',
      prompt: 'Reference portrait.',
      notes: '',
      aspectRatio: '1:1',
    }, agent);

    expect(result.payload).toMatchObject({
      candidate: true,
      publicTruth: false,
      source: 'realm-agent-studio.reviewed-visual-image-candidate',
      runtime: {
        capabilityToken: 'image.generate',
        runtimeScenario: 'imageGenerate',
        source: 'Runtime ScenarioService.executeScenario image.generate',
      },
      futureEvidencePath: {
        resource: {
          carrier: 'Resource',
          type: 'IMAGE',
          status: 'candidate-only',
        },
        binding: {
          family: 'Binding',
          hostType: 'AGENT',
          objectType: 'RESOURCE',
          bindingPoint: 'AGENT_PORTRAIT',
          status: 'candidate-only',
        },
      },
    });
  });

  it('fails closed when Runtime image generation prompt is missing', () => {
    const result = buildReviewedVisualImageGenerationPayload({
      resourceType: 'IMAGE',
      bindingPoint: 'AGENT_CANDIDATE',
      prompt: ' ',
      notes: '',
      aspectRatio: '1:1',
    }, agent);

    expect(result).toEqual({
      changed: false,
      errors: ['visual prompt missing for image candidate generation'],
      payload: null,
    });
  });

  it('builds an allowlisted speechSynthesize scenario request', () => {
    const result = buildReviewedVoiceSynthesisPayload({
      scriptText: '  Welcome in.  ',
    });

    expect(result).toMatchObject({
      changed: true,
      errors: [],
      payload: {
        surfaceId: 'realm-agent-studio.voice-demo-candidate',
        params: {
          model: 'auto',
        },
        request: {
          head: {
            appId: 'nimi.realm-agent-studio',
            modelId: 'auto',
          },
          spec: {
            spec: {
              oneofKind: 'speechSynthesize',
              speechSynthesize: {
                text: 'Welcome in.',
              },
            },
          },
        },
      },
    });
    expect(collectKeys(result.payload).has('provider')).toBe(false);
    expect(collectKeys(result.payload).has('localAgent')).toBe(false);
  });

  it('fails closed when Runtime speechSynthesize script text is missing', () => {
    const result = buildReviewedVoiceSynthesisPayload({
      scriptText: ' ',
    });

    expect(result).toEqual({
      changed: false,
      errors: ['voice demo script missing for voice candidate generation'],
      payload: null,
    });
  });

  it('builds a candidate-only Runtime voice payload without public Resource or Binding success', () => {
    const result = buildReviewedVoiceDemoCandidatePayload({
      scriptText: 'Welcome in.',
    }, agent);

    expect(result.changed).toBe(true);
    expect(result.payload).toMatchObject({
      candidate: true,
      publicTruth: false,
      source: 'realm-agent-studio.reviewed-voice-demo-candidate',
      agentContext: {
        source: 'Realm MeService.getMyRealmAgent',
        agentKey: 'agent-1',
        handle: 'mira',
        displayName: 'Mira',
        bio: 'Public strategist bio',
        greeting: 'Welcome in.',
        profileCoverUrl: 'https://cdn.example.test/cover.png',
      },
      runtime: {
        capabilityToken: 'audio.synthesize',
        runtimeScenario: 'speechSynthesize',
        source: 'Runtime ScenarioService.executeScenario audio.synthesize',
        request: {
          surfaceId: 'realm-agent-studio.voice-demo-candidate',
          params: {
            model: 'auto',
          },
          request: {
            head: {
              appId: 'nimi.realm-agent-studio',
              modelId: 'auto',
            },
            spec: {
              spec: {
                oneofKind: 'speechSynthesize',
                speechSynthesize: {
                  text: 'Welcome in.',
                },
              },
            },
          },
        },
        status: 'candidate-ready',
      },
      futureEvidencePath: {
        resource: {
          carrier: 'Resource',
          type: 'AUDIO',
          status: 'candidate-only',
        },
        binding: {
          family: 'Binding',
          hostType: 'AGENT',
          objectType: 'RESOURCE',
          bindingPoint: 'AGENT_VOICE_SAMPLE',
          status: 'candidate-only',
        },
      },
    });

    expect(collectKeys(result.payload).has('publicSuccess')).toBe(false);
    expect(collectKeys(result.payload).has('bindingSuccess')).toBe(false);
    expect(collectKeys(result.payload).has('resourceReady')).toBe(false);
    expect(collectKeys(result.payload).has('provider')).toBe(false);
    expect(collectKeys(result.payload).has('localAgent')).toBe(false);
  });

  it('detects forbidden media candidate fields recursively', () => {
    expect(assertNoForbiddenMediaCandidateFields({
      runtimePreview: {
        provider: 'forbidden',
      },
    })).toBe('provider');
    expect(assertNoForbiddenMediaCandidateFields({
      runtimePreview: {
        requestCandidate: {
          model: 'runtime-tts-model',
        },
      },
    })).toBeNull();
    expect(assertNoForbiddenMediaCandidateFields({
      runtime: {
        request: {
          params: {
            model: 'runtime-tts-model',
          },
        },
      },
    })).toBeNull();
    expect(assertNoForbiddenMediaCandidateFields({
      futureEvidencePath: {
        model: 'forbidden',
      },
    })).toBe('model');
    expect(assertNoForbiddenMediaCandidateFields({
      localAgent: { model: 'forbidden' },
    })).toBe('localAgent');
    expect(assertNoForbiddenMediaCandidateFields({
      futureEvidencePath: {
        resource: {
          carrier: 'Resource',
          type: 'AUDIO',
        },
      },
    })).toBeNull();
  });
});
