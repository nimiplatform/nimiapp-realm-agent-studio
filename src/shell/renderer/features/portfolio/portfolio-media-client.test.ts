import type { Realm } from '@nimiplatform/sdk/realm';
import { FinishReason, RoutePolicy } from '@nimiplatform/sdk/runtime/generated';
import { describe, expect, it, vi } from 'vitest';
import {
  buildFinalizeDirectMediaResourceInput,
  buildRealmCreateAgentInput,
  buildRealmCreatePostInput,
  buildRealmPostTextResourceInput,
  buildRealmSelectAvatarInput,
  buildRealmUpdateVisibilityInput,
  buildRuntimeProjectionInput,
  checkCreateRealmAgentHandleAvailability,
  createAgentVisibilityDraft,
  createReviewedPostTextResource,
  createReviewedRealmAgent,
  generateReviewedVisualImageCandidate,
  getAgentVisibilitySettings,
  getCreateRealmAgentWorldPreview,
  getOwnerAgentSettings,
  getOwnerPortfolioAgentDetail,
  listCreateRealmAgentSelectableWorlds,
  listOwnerPortfolioAgents,
  listReadyPostAttachmentResources,
  normalizeFinalizedDirectMediaResource,
  normalizePostAttachmentResourceOptions,
  normalizeRealmAgentAvatarSelectResult,
  normalizeRealmAgentCreateResult,
  normalizeRealmPostPublishResult,
  normalizeRealmTextResourceCreateResult,
  normalizeRuntimeProjectionSummary,
  projectAgentRuntimeContextSummary,
  proposeReviewedOwnerAgentSettings,
  proposeReviewedPostCopy,
  publishReviewedPostDraft,
  selectReviewedAgentAvatarUrl,
  synthesizeReviewedVoiceDemo,
  updateReviewedAgentVisibility,
  updateReviewedOwnerAgentSettings,
  uploadReviewedIdentityMediaResource,
  uploadReviewedPostMediaResource,
  type AgentVisibilityDraft,
  type RealmAgentVisibilitySettings,
} from './portfolio-client.js';
import { REALM_AGENT_CREATE_SOURCE, type ReviewedCreateRealmAgentPayload } from './create-agent-draft.js';
import { createOwnerAgentSettingsDraft } from './setting-proposal.js';
import {
  candidatePayload,
  collectKeys,
  createPayload,
  detailField,
  mockRealm,
  mockRuntimeWithRoutes,
  ownerAgentDetail,
  ownerAgentDetailWithWorldId,
} from './portfolio-client.test-helpers.js';

describe('owner portfolio media client', () => {
     it('selects a reviewed avatar URL through AgentsService.agentControllerSelectAvatar only', async () => {
      const realm = mockRealm();
      const result = await selectReviewedAgentAvatarUrl('agent-1', ' https://cdn.example.test/avatar.png ', realm);
      const selectAvatar = realm.generated.agentControllerSelectAvatar;
      const submittedPayload = vi.mocked(selectAvatar).mock.calls[0]?.[0]?.body;

      expect(selectAvatar).toHaveBeenCalledWith({
        path: { id: 'agent-1' },
        body: {
          avatarUrl: 'https://cdn.example.test/avatar.png',
        },
      });
      expect(submittedPayload).toEqual({
        avatarUrl: 'https://cdn.example.test/avatar.png',
      });
      expect(Object.keys(submittedPayload || {})).toEqual(['avatarUrl']);
      expect(collectKeys(submittedPayload).has('profileCoverUrl')).toBe(false);
      expect(collectKeys(submittedPayload).has('resourceId')).toBe(false);
      expect(collectKeys(submittedPayload).has('bindingId')).toBe(false);
      expect(collectKeys(submittedPayload).has('provider')).toBe(false);
      expect(collectKeys(submittedPayload).has('model')).toBe(false);
      expect(result).toMatchObject({
        ok: true,
        source: 'Realm AgentsService.agentControllerSelectAvatar',
        publicTruth: true,
        realm: {
          success: true,
        },
      });
    });

     it('rejects invalid avatar URLs before calling Realm', async () => {
      const realm = mockRealm();
      const result = await selectReviewedAgentAvatarUrl('agent-1', 'data:text/plain,avatar', realm);

      expect(realm.generated.agentControllerSelectAvatar).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        ok: false,
        source: 'Realm AgentsService.agentControllerSelectAvatar',
        publicTruth: false,
        failure: 'avatar-url-invalid',
        submitted: null,
      });
    });

     it('fails closed when Realm rejects avatar selection success confirmation', () => {
      const submitted = {
        avatarUrl: 'https://cdn.example.test/avatar.png',
      };
      const result = normalizeRealmAgentAvatarSelectResult({ success: false }, submitted);

      expect(result).toMatchObject({
        ok: false,
        source: 'Realm AgentsService.agentControllerSelectAvatar',
        publicTruth: false,
        failure: 'realm-select-avatar-rejected',
        submitted,
      });
    });

     it('builds SelectAvatarDto from a narrow URL allowlist', () => {
      expect(buildRealmSelectAvatarInput(' https://cdn.example.test/avatar.png ')).toEqual({
        avatarUrl: 'https://cdn.example.test/avatar.png',
      });
      expect(buildRealmSelectAvatarInput('ftp://cdn.example.test/avatar.png')).toBeNull();
      expect(buildRealmSelectAvatarInput('')).toBeNull();
    });

     it('calls Runtime imageGenerate scenario for visual candidates only', async () => {
      const executeScenario = vi.fn(async (_input: unknown) => ({
        output: {
          output: {
            oneofKind: 'imageGenerate' as const,
            imageGenerate: {
              artifacts: [{
                artifactId: 'artifact-image-1',
                mimeType: 'image/png',
                uri: 'runtime://artifact-image-1',
              }],
            },
          },
        },
        finishReason: FinishReason.STOP,
        routeDecision: RoutePolicy.UNSPECIFIED,
        modelResolved: 'runtime-image-model',
        traceId: 'trace-image-output',
        ignoredExtensions: [],
      }));
      const runtime = mockRuntimeWithRoutes({
        executeScenario,
        routes: [{ capability: 'image.generate', model: 'runtime-image-model' }],
      });

      const result = await generateReviewedVisualImageCandidate({
        resourceType: 'IMAGE',
        bindingPoint: 'AGENT_CANDIDATE',
        prompt: 'Warm profile portrait.',
        notes: 'Use public bio only.',
        model: 'runtime-image-model',
        aspectRatio: '1:1',
      }, ownerAgentDetail(), runtime as unknown as Parameters<typeof generateReviewedVisualImageCandidate>[2]);

      const submittedPayload = executeScenario.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
      expect(executeScenario).toHaveBeenCalledTimes(1);
      expect(submittedPayload).toMatchObject({
        head: {
          modelId: 'runtime-image-model',
        },
        spec: {
          spec: {
            oneofKind: 'imageGenerate',
            imageGenerate: {
              n: 1,
              aspectRatio: '1:1',
              responseFormat: 'url',
            },
          },
        },
      });
      expect(collectKeys(submittedPayload).has('provider')).toBe(false);
      expect(collectKeys(submittedPayload).has('localAgent')).toBe(false);
      expect(collectKeys(submittedPayload).has('worldId')).toBe(false);
      expect(result).toMatchObject({
        ok: true,
        source: 'Runtime ScenarioService.executeScenario image.generate',
        candidate: true,
        publicTruth: false,
        runtime: {
          artifactIds: ['artifact-image-1'],
          artifactUris: ['runtime://artifact-image-1'],
          traceId: 'trace-image-output',
          modelResolved: 'runtime-image-model',
        },
      });
    });

     it('fails closed when Runtime imageGenerate scenario output has no artifact', async () => {
      const executeScenario = vi.fn(async () => ({
        output: {
          output: {
            oneofKind: 'imageGenerate' as const,
            imageGenerate: {
              artifacts: [],
            },
          },
        },
        finishReason: FinishReason.STOP,
        routeDecision: RoutePolicy.UNSPECIFIED,
        modelResolved: '',
        traceId: '',
        ignoredExtensions: [],
      }));
      const runtime = mockRuntimeWithRoutes({
        executeScenario,
        routes: [{ capability: 'image.generate', model: 'runtime-image-model' }],
      });

      const result = await generateReviewedVisualImageCandidate({
        resourceType: 'IMAGE',
        bindingPoint: 'AGENT_CANDIDATE',
        prompt: 'Warm profile portrait.',
        notes: '',
        model: 'runtime-image-model',
        aspectRatio: '1:1',
      }, ownerAgentDetail(), runtime as unknown as Parameters<typeof generateReviewedVisualImageCandidate>[2]);

      expect(result).toMatchObject({
        ok: false,
        source: 'Runtime ScenarioService.executeScenario image.generate',
        failure: 'runtime-output-missing',
        message: 'Runtime imageGenerate scenario output missing artifact id or artifact URI.',
      });
    });

     it('calls Runtime speechSynthesize scenario with the allowlisted reviewed voice body', async () => {
      const executeScenario = vi.fn(async (_input: unknown) => ({
        output: {
          output: {
            oneofKind: 'speechSynthesize' as const,
            speechSynthesize: {
              artifacts: [{
                artifactId: 'artifact-audio-1',
                mimeType: 'audio/wav',
              }],
            },
          },
        },
        finishReason: FinishReason.STOP,
        routeDecision: RoutePolicy.UNSPECIFIED,
        modelResolved: 'runtime-tts-model',
        traceId: 'trace-output-1',
        ignoredExtensions: [],
      }));
      const runtime = mockRuntimeWithRoutes({
        executeScenario,
        routes: [{ capability: 'audio.synthesize', model: 'runtime-tts-model' }],
      });

      const result = await synthesizeReviewedVoiceDemo({
        scriptText: '  Welcome in.  ',
        model: 'runtime-tts-model',
      }, ownerAgentDetail(), runtime as unknown as Parameters<typeof synthesizeReviewedVoiceDemo>[2]);

      const submittedPayload = executeScenario.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
      expect(executeScenario).toHaveBeenCalledTimes(1);
      expect(submittedPayload).toMatchObject({
        head: {
          modelId: 'runtime-tts-model',
        },
        spec: {
          spec: {
            oneofKind: 'speechSynthesize',
            speechSynthesize: {
              text: 'Welcome in.',
            },
          },
        },
      });
      expect(collectKeys(submittedPayload).has('provider')).toBe(false);
      expect(collectKeys(submittedPayload).has('localAgent')).toBe(false);
      expect(result).toMatchObject({
        ok: true,
        source: 'Runtime ScenarioService.executeScenario audio.synthesize',
        candidate: true,
        publicTruth: false,
        runtime: {
          artifactIds: ['artifact-audio-1'],
          traceId: 'trace-output-1',
          modelResolved: 'runtime-tts-model',
        },
      });
    });

     it('fails closed when Runtime speechSynthesize model config is missing', async () => {
      const runtime = {
        ai: {
          executeScenario: vi.fn(),
          streamScenario: async function* () {},
        },
      };
      const result = await synthesizeReviewedVoiceDemo({
        scriptText: 'Welcome in.',
        model: '',
      }, ownerAgentDetail(), runtime as unknown as Parameters<typeof synthesizeReviewedVoiceDemo>[2]);

      expect(runtime.ai.executeScenario).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        ok: false,
        source: 'Runtime ScenarioService.executeScenario audio.synthesize',
        failure: 'runtime-payload-invalid',
        message: 'Runtime ScenarioService.executeScenario audio.synthesize model config missing',
      });
    });

     it('fails closed when Runtime speechSynthesize scenario output has no artifact id', async () => {
      const executeScenario = vi.fn(async () => ({
        output: {
          output: {
            oneofKind: 'speechSynthesize' as const,
            speechSynthesize: {
              artifacts: [],
            },
          },
        },
        finishReason: FinishReason.STOP,
        routeDecision: RoutePolicy.UNSPECIFIED,
        modelResolved: '',
        traceId: '',
        ignoredExtensions: [],
      }));
      const runtime = mockRuntimeWithRoutes({
        executeScenario,
        routes: [{ capability: 'audio.synthesize', model: 'runtime-tts-model' }],
      });
      const result = await synthesizeReviewedVoiceDemo({
        scriptText: 'Welcome in.',
        model: 'runtime-tts-model',
      }, ownerAgentDetail(), runtime as unknown as Parameters<typeof synthesizeReviewedVoiceDemo>[2]);

      expect(result).toMatchObject({
        ok: false,
        source: 'Runtime ScenarioService.executeScenario audio.synthesize',
        failure: 'runtime-output-missing',
        message: 'Runtime speechSynthesize scenario output missing artifact id.',
      });
    });

     it('fails closed and preserves draft when Runtime speechSynthesize scenario throws', async () => {
      const executeScenario = vi.fn(async () => {
        throw new Error('runtime unavailable');
      });
      const runtime = mockRuntimeWithRoutes({
        executeScenario,
        routes: [{ capability: 'audio.synthesize', model: 'runtime-tts-model' }],
      });
      const result = await synthesizeReviewedVoiceDemo({
        scriptText: 'Welcome in.',
        model: 'runtime-tts-model',
      }, ownerAgentDetail(), runtime as unknown as Parameters<typeof synthesizeReviewedVoiceDemo>[2]);

      expect(executeScenario).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({
        ok: false,
        source: 'Runtime ScenarioService.executeScenario audio.synthesize',
        failure: 'runtime-synthesize-failed',
        message: 'Runtime speechSynthesize scenario failed: runtime unavailable',
        draft: {
          candidate: true,
          publicTruth: false,
        },
      });
    });
});
