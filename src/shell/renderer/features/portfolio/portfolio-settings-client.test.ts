import type { StudioRealmSurface } from '@renderer/data/realm-client.js';
import { FinishReason, RoutePolicy } from '@nimiplatform/sdk/runtime/generated';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildFinalizeDirectMediaResourceInput,
  buildAgentChatReadinessProjectionInput,
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
  getForgeImportedSystemPortfolioAgentDetail,
  getCreateRealmAgentWorldPreview,
  getOwnerAgentSettings,
  getPortfolioAgentSettings,
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
  normalizeForgeImportedAgentChatReadinessSummary,
  normalizeAgentChatReadinessProjectionSummary,
  normalizeRuntimeProjectionSummary,
  projectAgentChatReadinessContextSummary,
  projectAgentRuntimeContextSummary,
  promoteReviewedForgeImportedProfileMedia,
  promoteReviewedForgeImportedVoice,
  proposeReviewedOwnerAgentSettings,
  proposeReviewedPortfolioAgentSettings,
  proposeReviewedPostCopy,
  publishReviewedPostDraft,
  selectReviewedAgentAvatarUrl,
  synthesizeReviewedVoiceDemo,
  updateReviewedAgentVisibility,
  updateReviewedOwnerAgentSettings,
  updateReviewedPortfolioAgentSettings,
  uploadReviewedIdentityMediaResource,
  uploadReviewedPostMediaResource,
  type AgentVisibilityDraft,
  type RealmAgentVisibilitySettings,
} from './portfolio-client.js';
import { REALM_AGENT_CREATE_SOURCE, type ReviewedCreateRealmAgentPayload } from './create-agent-draft.js';
import { applyRuntimeOwnerSettingsProposal, createOwnerAgentSettingsDraft } from './setting-proposal.js';
import {
  candidatePayload,
  collectKeys,
  configureStudioAIConfigTargetRefsForTest,
  createPayload,
  detailField,
  mockRealm,
  mockRuntimeWithRoutes,
  ownerAgentDetail,
  ownerAgentDetailWithWorldId,
  resetStudioAIConfigForTest,
} from './portfolio-client.test-helpers.js';

beforeEach(() => {
  resetStudioAIConfigForTest();
});

describe('owner portfolio settings client', () => {
     it('reads owner settings through MeService.getMyRealmAgentSettings', async () => {
      const realm = mockRealm();
      const settings = await getOwnerAgentSettings('agent-1', realm);

      expect(realm.getMyRealmAgentSettings).toHaveBeenCalledWith({
        path: { agentId: 'agent-1' },
      });
      expect(settings).toMatchObject({
        agentId: 'agent-1',
        agentRuleVersion: 3,
        displayName: 'Mira',
        identity: {
          publicRole: 'Guide',
        },
      });
    });

     it('updates owner settings through MeService.updateMyRealmAgentSettings without raw rule payloads', async () => {
      const realm = mockRealm();
      const current = await getOwnerAgentSettings('agent-1', realm);
      const draft = {
        ...createOwnerAgentSettingsDraft(current),
        displayName: 'Mira Prime',
        worldview: 'Layered world with owner-reviewed framing.',
        interestsText: 'strategy, tea',
        rawRuleTextCandidate: 'Visible raw rule candidate must stay deferred.',
      };
      const result = await updateReviewedOwnerAgentSettings('agent-1', draft, current, realm);
      const updateSettings = realm.updateMyRealmAgentSettings;
      const submittedRequest = vi.mocked(updateSettings).mock.calls[0]?.[0];
      const submittedPayload = submittedRequest?.body;

      expect(updateSettings).toHaveBeenCalledWith({
        path: { agentId: 'agent-1' },
        body: {
          displayName: 'Mira Prime',
          identity: {
            worldview: 'Layered world with owner-reviewed framing.',
          },
          personality: {
            interests: ['strategy', 'tea'],
          },
        },
      });
      expect(collectKeys(submittedPayload).has('rawRuleTextCandidate')).toBe(false);
      expect(collectKeys(submittedPayload).has('ruleText')).toBe(false);
      expect(collectKeys(submittedPayload).has('agentRules')).toBe(false);
      expect(collectKeys(submittedPayload).has('profileCoverUrl')).toBe(false);
      expect(collectKeys(submittedPayload).has('provider')).toBe(false);
      expect(collectKeys(submittedPayload).has('model')).toBe(false);
      expect(result).toMatchObject({
        ok: true,
        source: 'Realm MeService.updateMyRealmAgentSettings',
        truthWrite: true,
        submitted: {
          displayName: 'Mira Prime',
        },
        settings: {
          agentRuleVersion: 4,
        },
      });
    });

     it('reads and updates Forge-imported system settings through the curated endpoint', async () => {
      const realm = mockRealm();
      const agent = await getForgeImportedSystemPortfolioAgentDetail('cbdb-agent-su-shi', realm);
      const current = await getPortfolioAgentSettings(agent, realm);
      const draft = {
        ...createOwnerAgentSettingsDraft(current),
        greeting: '大江东去。',
        contentStyle: '宋人语感，现代可读。',
      };
      const result = await updateReviewedPortfolioAgentSettings(agent, draft, current, realm);

      expect(realm.getForgeImportedSystemAgentSettings).toHaveBeenCalledWith({
        path: { agentId: 'cbdb-agent-su-shi' },
      });
      expect(realm.updateForgeImportedSystemAgentSettings).toHaveBeenCalledWith({
        path: { agentId: 'cbdb-agent-su-shi' },
        body: {
          greeting: '大江东去。',
          communication: {
            contentStyle: '宋人语感，现代可读。',
          },
        },
      });
      expect(realm.updateMyRealmAgentSettings).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        ok: true,
        source: 'Realm AgentCuratedSystemService.updateForgeImportedSystemAgentSettings',
        truthWrite: true,
        settings: {
          agentRuleVersion: 2,
        },
      });
    });

     it('uses Runtime text.generate for candidate owner settings proposals only', async () => {
      // Studio resolves a concrete Runtime route before dispatch; `auto` never
      // reaches ScenarioService.
      const realm = mockRealm();
      const current = await getOwnerAgentSettings('agent-1', realm);
      const draft = {
        ...createOwnerAgentSettingsDraft(current),
        naturalLanguageIntent: 'Make Mira warmer for builders.',
      };
      const executeScenario = vi.fn(async (_input: unknown) => ({
        output: {
          output: {
            oneofKind: 'textGenerate' as const,
            textGenerate: {
              text: JSON.stringify({
                description: 'Warmer strategist for builders.',
                contentStyle: 'Warm and concise.',
                rationale: 'Owner asked for a warmer public presentation.',
              }),
            },
          },
        },
        finishReason: FinishReason.STOP,
        routeDecision: RoutePolicy.UNSPECIFIED,
        modelResolved: 'runtime-default-text',
        traceId: 'trace-settings',
        ignoredExtensions: [],
      }));
      const runtime = mockRuntimeWithRoutes({
        executeScenario,
        routes: [{ capability: 'text.generate', model: 'runtime-default-text' }],
      });
      configureStudioAIConfigTargetRefsForTest({
        targetRefs: {
          'text.generate': 'runtime-default-text',
        },
      });

      const result = await proposeReviewedOwnerAgentSettings('agent-1', draft, current, runtime);
      const submittedPayload = executeScenario.mock.calls[0]?.[0] as Record<string, unknown> | undefined;

      expect(executeScenario).toHaveBeenCalledTimes(1);
      expect(submittedPayload).toMatchObject({
        head: {
          modelId: 'runtime-default-text',
        },
        spec: {
          spec: {
            oneofKind: 'textGenerate',
          },
        },
      });
      expect(collectKeys(submittedPayload).has('provider')).toBe(false);
      const textGenerate = (submittedPayload?.spec as { spec?: { textGenerate?: { input?: unknown } } } | undefined)
        ?.spec?.textGenerate;
      const submittedUserInput = JSON.stringify(textGenerate?.input ?? []);
      expect(submittedUserInput).not.toContain('LocalAgent');
      expect(result).toMatchObject({
        ok: true,
        source: 'Runtime runtime.ai.text.generate',
        candidate: true,
        truthWrite: false,
        proposal: {
          draftPatch: {
            description: 'Warmer strategist for builders.',
            contentStyle: 'Warm and concise.',
          },
        },
        runtime: {
          traceId: 'trace-settings',
        },
      });
      expect(realm.updateMyRealmAgentSettings).not.toHaveBeenCalled();
    });

     it('uses Forge-imported context for AI-assisted settings candidates before curated Realm save', async () => {
      const realm = mockRealm();
      const agent = await getForgeImportedSystemPortfolioAgentDetail('cbdb-agent-su-shi', realm);
      const current = await getPortfolioAgentSettings(agent, realm);
      const draft = {
        ...createOwnerAgentSettingsDraft(current),
        naturalLanguageIntent: 'Add a self-introduction, Song speech posture, and portrait direction without inventing facts.',
      };
      const executeScenario = vi.fn(async (_input: unknown) => ({
        output: {
          output: {
            oneofKind: 'textGenerate' as const,
            textGenerate: {
              text: JSON.stringify({
                description: 'Source-backed Song literatus introduction for public profile review.',
                greeting: 'I speak from the Song record; ask what is known before what is imagined.',
                personalitySummary: 'Historically grounded, candid, and literate.',
                contentStyle: 'Song literati cadence, clear modern explanation, no unsupported biography.',
                rawRuleTextCandidate: 'Keep unsupported portrait and voice details as reviewed candidates.',
                rationale: 'Maps requested self-introduction and accent into admitted settings fields.',
              }),
            },
          },
        },
        finishReason: FinishReason.STOP,
        routeDecision: RoutePolicy.UNSPECIFIED,
        modelResolved: 'runtime-default-text',
        traceId: 'trace-cbdb-settings',
        ignoredExtensions: [],
      }));
      const runtime = mockRuntimeWithRoutes({
        executeScenario,
        routes: [{ capability: 'text.generate', model: 'runtime-default-text' }],
      });
      configureStudioAIConfigTargetRefsForTest({
        targetRefs: {
          'text.generate': 'runtime-default-text',
        },
      });

      const proposalResult = await proposeReviewedPortfolioAgentSettings(agent, draft, current, runtime);
      if (!proposalResult.ok) {
        throw new Error(proposalResult.message);
      }
      const submittedPayload = executeScenario.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
      const textGenerate = (submittedPayload?.spec as { spec?: { textGenerate?: { input?: unknown } } } | undefined)
        ?.spec?.textGenerate;
      const submittedUserInput = JSON.stringify(textGenerate?.input ?? []);

      expect(submittedUserInput).toContain('forge-imported-system');
      expect(submittedUserInput).toContain('self-introduction -> description/greeting/personalitySummary/publicRole/worldview');
      expect(submittedUserInput).toContain('portrait/final look -> visual image or avatar package candidate outside owner settings');
      expect(submittedUserInput).not.toContain('LocalAgent');
      expect(proposalResult).toMatchObject({
        ok: true,
        candidate: true,
        truthWrite: false,
        proposal: {
          draftPatch: {
            description: 'Source-backed Song literatus introduction for public profile review.',
            greeting: 'I speak from the Song record; ask what is known before what is imagined.',
            personalitySummary: 'Historically grounded, candid, and literate.',
            contentStyle: 'Song literati cadence, clear modern explanation, no unsupported biography.',
            rawRuleTextCandidate: 'Keep unsupported portrait and voice details as reviewed candidates.',
          },
        },
      });

      const reviewedDraft = applyRuntimeOwnerSettingsProposal(draft, proposalResult.proposal);
      const saveResult = await updateReviewedPortfolioAgentSettings(agent, reviewedDraft, current, realm);
      const updateSettings = realm.updateForgeImportedSystemAgentSettings;
      const submittedRequest = vi.mocked(updateSettings).mock.calls[0]?.[0];
      const submittedBody = submittedRequest?.body;
      const submittedKeys = collectKeys(submittedBody);

      expect(updateSettings).toHaveBeenCalledWith({
        path: { agentId: 'cbdb-agent-su-shi' },
        body: {
          description: 'Source-backed Song literatus introduction for public profile review.',
          greeting: 'I speak from the Song record; ask what is known before what is imagined.',
          naturalLanguageIntent: 'Add a self-introduction, Song speech posture, and portrait direction without inventing facts.',
          personality: {
            summary: 'Historically grounded, candid, and literate.',
          },
          communication: {
            contentStyle: 'Song literati cadence, clear modern explanation, no unsupported biography.',
          },
        },
      });
      expect(realm.updateMyRealmAgentSettings).not.toHaveBeenCalled();
      expect(submittedKeys.has('rawRuleTextCandidate')).toBe(false);
      expect(submittedKeys.has('avatarUrl')).toBe(false);
      expect(submittedKeys.has('profileCoverUrl')).toBe(false);
      expect(submittedKeys.has('agentRules')).toBe(false);
      expect(submittedKeys.has('model')).toBe(false);
      expect(saveResult).toMatchObject({
        ok: true,
        source: 'Realm AgentCuratedSystemService.updateForgeImportedSystemAgentSettings',
        truthWrite: true,
      });

      vi.mocked(realm.getForgeImportedSystemAgentSettings).mockResolvedValueOnce({
        ...current,
        description: 'Source-backed Song literatus introduction for public profile review.',
        greeting: 'I speak from the Song record; ask what is known before what is imagined.',
        naturalLanguageIntent: 'Add a self-introduction, Song speech posture, and portrait direction without inventing facts.',
        personality: {
          ...current.personality,
          summary: 'Historically grounded, candid, and literate.',
        },
        communication: {
          ...current.communication,
          contentStyle: 'Song literati cadence, clear modern explanation, no unsupported biography.',
        },
        agentRuleVersion: 2,
      });
      const reread = await getPortfolioAgentSettings(agent, realm);
      expect(reread).toMatchObject({
        agentId: 'cbdb-agent-su-shi',
        greeting: 'I speak from the Song record; ask what is known before what is imagined.',
        personality: {
          summary: 'Historically grounded, candid, and literate.',
        },
        communication: {
          contentStyle: 'Song literati cadence, clear modern explanation, no unsupported biography.',
        },
      });

      const chatReadiness = await projectAgentChatReadinessContextSummary(agent, realm);
      expect(realm.getForgeImportedSystemAgentChatReadiness).toHaveBeenCalledWith({
        path: { agentId: 'cbdb-agent-su-shi' },
      });
      expect(realm.projectRuntimePayload).not.toHaveBeenCalled();
      expect(chatReadiness).toMatchObject({
        ok: true,
        source: 'Realm AgentCuratedSystemService.getForgeImportedSystemAgentChatReadiness',
        truthWrite: false,
        submitted: {
          agentId: 'cbdb-agent-su-shi',
          ownerScope: 'forge-imported-system',
        },
        summary: {
          consumerSurface: 'AGENT_CHAT_READINESS',
          agentId: 'cbdb-agent-su-shi',
          agentRuleCount: 2,
          selectedOwnerSettingFields: ['boundaries.allowedThemes', 'communication.contentStyle'],
          rawRuleContentExposed: false,
          profile: {
            speechModelId: 'speech/qwen3tts',
            speechRoutePolicy: 'local',
          },
          gates: {
            localAgentIdentityReady: true,
            profileContextReady: true,
            speechRouteReady: true,
          },
        },
      });
      expect(collectKeys(chatReadiness).has('statement')).toBe(false);
      expect(collectKeys(chatReadiness).has('contentStyle')).toBe(false);
    });

     it('promotes reviewed CBDB portrait URLs through the curated profile-media endpoint', async () => {
      const realm = mockRealm();
      const agent = await getForgeImportedSystemPortfolioAgentDetail('cbdb-agent-su-shi', realm);

      const result = await promoteReviewedForgeImportedProfileMedia(agent, {
        avatarUrl: ' https://cdn.example.com/cbdb/su-shi-reviewed.png ',
        profileCoverUrl: 'https://cdn.example.com/cbdb/song-literati-cover.png',
      }, realm);

      expect(realm.updateForgeImportedSystemAgentProfileMedia).toHaveBeenCalledWith({
        path: { agentId: 'cbdb-agent-su-shi' },
        body: {
          avatarUrl: 'https://cdn.example.com/cbdb/su-shi-reviewed.png',
          profileCoverUrl: 'https://cdn.example.com/cbdb/song-literati-cover.png',
        },
      });
      expect(realm.agentControllerSelectAvatar).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        ok: true,
        source: 'Realm AgentCuratedSystemService.updateForgeImportedSystemAgentProfileMedia',
        publicTruth: true,
        submitted: {
          avatarUrl: 'https://cdn.example.com/cbdb/su-shi-reviewed.png',
          profileCoverUrl: 'https://cdn.example.com/cbdb/song-literati-cover.png',
        },
      });
      expect(collectKeys(result).has('agentRules')).toBe(false);
      expect(collectKeys(result).has('model')).toBe(false);
    });

     it('keeps Forge-imported profile media promotion scoped to curated system agents', async () => {
      const realm = mockRealm();
      const result = await promoteReviewedForgeImportedProfileMedia(ownerAgentDetail(), {
        avatarUrl: 'https://cdn.example.com/cbdb/su-shi-reviewed.png',
      }, realm);

      expect(result).toMatchObject({
        ok: false,
        failure: 'profile-media-scope-unsupported',
        publicTruth: false,
      });
      expect(realm.updateForgeImportedSystemAgentProfileMedia).not.toHaveBeenCalled();
    });

     it('fails closed for invalid Forge-imported profile media URLs', async () => {
      const realm = mockRealm();
      const agent = await getForgeImportedSystemPortfolioAgentDetail('cbdb-agent-su-shi', realm);
      const result = await promoteReviewedForgeImportedProfileMedia(agent, {
        avatarUrl: 'file:///tmp/not-admitted.png',
      }, realm);

      expect(result).toMatchObject({
        ok: false,
        failure: 'avatar-url-invalid',
        publicTruth: false,
      });
      expect(realm.updateForgeImportedSystemAgentProfileMedia).not.toHaveBeenCalled();
    });

     it('promotes reviewed CBDB voice config through the curated voice endpoint', async () => {
      const realm = mockRealm();
      const agent = await getForgeImportedSystemPortfolioAgentDetail('cbdb-agent-su-shi', realm);

      const result = await promoteReviewedForgeImportedVoice(agent, {
        voiceId: ' zh_narrator ',
        description: ' Reviewed Song literati narrator with measured cadence. ',
        emotionEnabled: true,
        speed: -8,
        pitch: -1,
        speechModelId: ' speech/qwen3tts ',
        speechRoutePolicy: 'local',
      }, realm);

      expect(realm.updateForgeImportedSystemAgentVoice).toHaveBeenCalledWith({
        path: { agentId: 'cbdb-agent-su-shi' },
        body: {
          voiceId: 'zh_narrator',
          description: 'Reviewed Song literati narrator with measured cadence.',
          emotionEnabled: true,
          speed: -8,
          pitch: -1,
          speechModelId: 'speech/qwen3tts',
          speechRoutePolicy: 'local',
        },
      });
      expect(result).toMatchObject({
        ok: true,
        source: 'Realm AgentCuratedSystemService.updateForgeImportedSystemAgentVoice',
        publicTruth: true,
        submitted: {
          voiceId: 'zh_narrator',
          description: 'Reviewed Song literati narrator with measured cadence.',
          speechModelId: 'speech/qwen3tts',
          speechRoutePolicy: 'local',
        },
      });
      expect(collectKeys(result).has('agentRules')).toBe(false);
      expect(collectKeys(result).has('model')).toBe(false);
    });

     it('keeps Forge-imported voice promotion scoped to curated system agents', async () => {
      const realm = mockRealm();
      const result = await promoteReviewedForgeImportedVoice(ownerAgentDetail(), {
        voiceId: 'zh_narrator',
      }, realm);

      expect(result).toMatchObject({
        ok: false,
        failure: 'voice-scope-unsupported',
        publicTruth: false,
      });
      expect(realm.updateForgeImportedSystemAgentVoice).not.toHaveBeenCalled();
    });

     it('fails closed for invalid Forge-imported voice numeric ranges', async () => {
      const realm = mockRealm();
      const agent = await getForgeImportedSystemPortfolioAgentDetail('cbdb-agent-su-shi', realm);
      const result = await promoteReviewedForgeImportedVoice(agent, {
        voiceId: 'zh_narrator',
        speed: 999,
      }, realm);

      expect(result).toMatchObject({
        ok: false,
        failure: 'voice-speed-invalid',
        publicTruth: false,
      });
      expect(realm.updateForgeImportedSystemAgentVoice).not.toHaveBeenCalled();
    });

     it('fails closed for Runtime settings proposal when intent is missing', async () => {
      // Previously this test asserted "fails closed when model env is missing".
      // The route resolver is not reached when caller input is invalid; an
      // empty intent still trips `runtime-settings-proposal-payload-invalid`.
      const realm = mockRealm();
      const current = await getOwnerAgentSettings('agent-1', realm);
      const runtime = mockRuntimeWithRoutes({
        executeScenario: vi.fn(),
        routes: [{ capability: 'text.generate', model: 'runtime-default-text' }],
      });

      const result = await proposeReviewedOwnerAgentSettings('agent-1', {
        ...createOwnerAgentSettingsDraft(current),
        naturalLanguageIntent: '',
      }, current, runtime);

      expect(runtime.ai.executeScenario).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        ok: false,
        source: 'Runtime runtime.ai.text.generate',
        candidate: false,
        truthWrite: false,
        failure: 'runtime-settings-proposal-payload-invalid',
        message: 'natural-language setting intent missing',
      });
      vi.unstubAllEnvs();
    });

     it('fails closed before owner settings PATCH when there are no admitted changes', async () => {
      const realm = mockRealm();
      const current = await getOwnerAgentSettings('agent-1', realm);
      const result = await updateReviewedOwnerAgentSettings('agent-1', {
        ...createOwnerAgentSettingsDraft(current),
        rawRuleTextCandidate: 'Only raw rule review.',
      }, current, realm);

      expect(realm.updateMyRealmAgentSettings).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        ok: false,
        source: 'Realm MeService.updateMyRealmAgentSettings',
        truthWrite: false,
        failure: 'owner-settings-no-changes',
        submitted: null,
      });
    });

     it('reads owner visibility through AgentsService.agentControllerGetVisibility', async () => {
      const realm = mockRealm();
      const settings = await getAgentVisibilitySettings('agent-1', realm);

      expect(realm.agentControllerGetVisibility).toHaveBeenCalledWith({
        path: { id: 'agent-1' },
      });
      expect(settings).toEqual({
        accountVisibility: 'PUBLIC',
        defaultPostVisibility: 'PUBLIC',
        dmVisibility: 'FRIENDS',
        profileVisibility: 'PUBLIC',
      });
    });

     it('updates owner visibility through AgentsService.agentControllerUpdateVisibility with changed allowlisted fields only', async () => {
      const realm = mockRealm();
      const current: RealmAgentVisibilitySettings = {
        accountVisibility: 'PUBLIC',
        defaultPostVisibility: 'PUBLIC',
        dmVisibility: 'FRIENDS',
        profileVisibility: 'PUBLIC',
      };
      const draft: AgentVisibilityDraft = {
        accountVisibility: 'FRIENDS',
        defaultPostVisibility: 'PUBLIC',
        dmVisibility: 'PRIVATE',
        profileVisibility: 'PUBLIC',
      };
      const result = await updateReviewedAgentVisibility('agent-1', draft, current, realm);
      const updateVisibility = realm.agentControllerUpdateVisibility;
      const submittedRequest = vi.mocked(updateVisibility).mock.calls[0]?.[0];
      const submittedPayload = submittedRequest?.body;

      expect(updateVisibility).toHaveBeenCalledWith({
        path: { id: 'agent-1' },
        body: {
          accountVisibility: 'FRIENDS',
          dmVisibility: 'PRIVATE',
        },
      });
      expect(Object.keys(submittedPayload || {}).sort()).toEqual(['accountVisibility', 'dmVisibility']);
      expect(collectKeys(submittedPayload).has('state')).toBe(false);
      expect(collectKeys(submittedPayload).has('lifecycle')).toBe(false);
      expect(collectKeys(submittedPayload).has('moderationStatus')).toBe(false);
      expect(collectKeys(submittedPayload).has('worldId')).toBe(false);
      expect(collectKeys(submittedPayload).has('provider')).toBe(false);
      expect(collectKeys(submittedPayload).has('model')).toBe(false);
      expect(result).toMatchObject({
        ok: true,
        source: 'Realm AgentsService.agentControllerUpdateVisibility',
        lifecycleTruth: false,
        submitted: {
          accountVisibility: 'FRIENDS',
          dmVisibility: 'PRIVATE',
        },
      });
    });

     it('fails closed on visibility no-op or invalid enum without calling Realm', async () => {
      const realm = mockRealm();
      const current: RealmAgentVisibilitySettings = {
        accountVisibility: 'PUBLIC',
        defaultPostVisibility: 'PUBLIC',
        dmVisibility: 'FRIENDS',
        profileVisibility: 'PUBLIC',
      };

      const noChange = await updateReviewedAgentVisibility('agent-1', createAgentVisibilityDraft(current), current, realm);
      const invalidDraft = {
        ...createAgentVisibilityDraft(current),
        dmVisibility: 'EVERYONE',
      } as AgentVisibilityDraft;
      const invalid = await updateReviewedAgentVisibility('agent-1', invalidDraft, current, realm);

      expect(realm.agentControllerUpdateVisibility).not.toHaveBeenCalled();
      expect(noChange).toMatchObject({
        ok: false,
        source: 'Realm AgentsService.agentControllerUpdateVisibility',
        lifecycleTruth: false,
        failure: 'visibility-no-changes',
        submitted: null,
      });
      expect(invalid).toMatchObject({
        ok: false,
        source: 'Realm AgentsService.agentControllerUpdateVisibility',
        lifecycleTruth: false,
        failure: 'visibility-payload-invalid',
        submitted: null,
      });
    });

     it('builds UpdateAgentVisibilityDto from changed visibility fields only', () => {
      const current: RealmAgentVisibilitySettings = {
        accountVisibility: 'PUBLIC',
        defaultPostVisibility: 'PUBLIC',
        dmVisibility: 'FRIENDS',
        profileVisibility: 'PUBLIC',
      };
      const draft: AgentVisibilityDraft = {
        ...createAgentVisibilityDraft(current),
        profileVisibility: 'PRIVATE',
      };

      expect(buildRealmUpdateVisibilityInput(draft, current)).toEqual({
        input: {
          profileVisibility: 'PRIVATE',
        },
        errors: [],
      });
    });

     it('projects Runtime context through world-only RuntimeProjectionsService and returns summary counts only', async () => {
      const realm = mockRealm();
      const result = await projectAgentRuntimeContextSummary(ownerAgentDetail(), realm);
      const projectRuntimePayload = realm.projectRuntimePayload;
      const submittedRequest = vi.mocked(projectRuntimePayload).mock.calls[0]?.[0];
      const submittedPayload = submittedRequest?.body;

      expect(projectRuntimePayload).toHaveBeenCalledWith({
        path: {},
        body: {
          worldId: 'OASIS',
          contextEnvelope: {
            allowedWorldScopes: ['WORLD', 'REGION', 'FACTION', 'INDIVIDUAL', 'SCENE'],
            includeInheritedAgentRules: false,
            focusKeywords: ['realm-agent-studio', 'owner-reviewed-runtime-context'],
          },
        },
      });
      expect(collectKeys(submittedPayload).has('agentId')).toBe(false);
      expect(collectKeys(submittedPayload).has('statement')).toBe(false);
      expect(result).toMatchObject({
        ok: true,
        source: 'Realm RuntimeProjectionsService.projectRuntimePayload',
        truthWrite: false,
        summary: {
          consumerSurface: 'RUNTIME_PAYLOAD',
          worldId: 'OASIS',
          checksum: 'checksum-runtime-1',
          selectedInputCount: 1,
          suppressedInputCount: 1,
          worldRuleCount: 1,
          rawRuleContentExposed: false,
        },
      });
      expect(collectKeys(result).has('statement')).toBe(false);
      expect(collectKeys(result).has('ruleKey')).toBe(false);
      expect(collectKeys(result).has('selectedInputs')).toBe(false);
    });

     it('normalizes Runtime projection summary without exposing raw rule content', () => {
      const summary = normalizeRuntimeProjectionSummary({
        worldId: 'world-1',
        agentId: 'agent-1',
        consumerSurface: 'RUNTIME_PAYLOAD',
        checksum: 'checksum-1',
        selectedInputs: [{ statement: 'raw statement' }],
        trace: {
          selectedInputIds: ['rule-1'],
          suppressedInputs: [{ input: { statement: 'suppressed raw' }, reason: 'SURFACE_POLICY' }],
          resolutionOutcomes: [],
        },
        payload: {
          worldRules: [{ statement: 'world raw' }],
        },
      } as unknown as Awaited<ReturnType<StudioRealmSurface['projectRuntimePayload']>>);

      expect(summary).toEqual({
        source: 'Realm RuntimeProjectionsService.projectRuntimePayload',
        consumerSurface: 'RUNTIME_PAYLOAD',
        worldId: 'world-1',
        checksum: 'checksum-1',
        selectedInputCount: 1,
        suppressedInputCount: 1,
        worldRuleCount: 1,
        rawRuleContentExposed: false,
      });
      expect(collectKeys(summary).has('statement')).toBe(false);
      expect(collectKeys(summary).has('agentId')).toBe(false);
    });

     it('normalizes Agent Chat readiness projection summary to agent setting fields only', () => {
      const summary = normalizeAgentChatReadinessProjectionSummary({
        worldId: 'world-1',
        agentId: 'agent-1',
        consumerSurface: 'RUNTIME_PAYLOAD',
        checksum: 'checksum-1',
        selectedInputs: [{ statement: 'raw statement' }],
        trace: {
          selectedInputIds: ['agent-rule-1'],
          suppressedInputs: [{ input: { statement: 'suppressed raw' }, reason: 'SURFACE_POLICY' }],
          resolutionOutcomes: [],
        },
        payload: {
          worldRules: [],
          agentRules: [{
            statement: 'raw reviewed content style',
            structured: {
              ownerSettingField: 'communication.contentStyle',
              contentStyle: 'must stay hidden',
            },
          }],
        },
      } as unknown as Awaited<ReturnType<StudioRealmSurface['projectRuntimePayload']>>);

      expect(summary).toEqual({
        source: 'Realm RuntimeProjectionsService.projectRuntimePayload',
        consumerSurface: 'RUNTIME_PAYLOAD',
        worldId: 'world-1',
        checksum: 'checksum-1',
        selectedInputCount: 1,
        suppressedInputCount: 1,
        worldRuleCount: 0,
        rawRuleContentExposed: false,
        agentId: 'agent-1',
        agentRuleCount: 1,
        selectedOwnerSettingFields: ['communication.contentStyle'],
      });
      expect(collectKeys(summary).has('statement')).toBe(false);
      expect(collectKeys(summary).has('contentStyle')).toBe(false);
    });

     it('normalizes Forge-imported Agent Chat readiness summary without raw projection payloads', () => {
      const summary = normalizeForgeImportedAgentChatReadinessSummary({
        agentId: 'cbdb-agent-su-shi',
        worldId: 'cbdb-song-slice-real-20260614-world',
        ownerScope: 'forge-imported-system',
        consumerSurface: 'AGENT_CHAT_READINESS',
        runtimeProjectionChecksum: 'checksum-cbdb-chat-readiness-1',
        selectedInputCount: 2,
        suppressedInputCount: 0,
        worldRuleCount: 0,
        agentRuleCount: 2,
        selectedOwnerSettingFields: ['communication.contentStyle', 'boundaries.allowedThemes'],
        rawRuleContentExposed: false,
        profile: {
          displayName: 'CBDB Su Shi',
          handle: 'su-shi',
          avatarUrl: 'https://cdn.example.com/cbdb/su-shi-reviewed.png',
          profileCoverUrl: 'https://cdn.example.com/cbdb/song-literati-cover.png',
          defaultVoiceReference: 'preset_voice_id:zh_narrator',
          speechModelId: 'speech/qwen3tts',
          speechRoutePolicy: 'local',
        },
        gates: {
          localAgentIdentityReady: true,
          profileContextReady: true,
          ownerSettingsReady: true,
          profileMediaReady: true,
          voiceReferenceReady: true,
          speechRouteReady: true,
        },
      } as unknown as Awaited<ReturnType<StudioRealmSurface['getForgeImportedSystemAgentChatReadiness']>>);

      expect(summary).toEqual({
        source: 'Realm AgentCuratedSystemService.getForgeImportedSystemAgentChatReadiness',
        consumerSurface: 'AGENT_CHAT_READINESS',
        worldId: 'cbdb-song-slice-real-20260614-world',
        checksum: 'checksum-cbdb-chat-readiness-1',
        selectedInputCount: 2,
        suppressedInputCount: 0,
        worldRuleCount: 0,
        rawRuleContentExposed: false,
        agentId: 'cbdb-agent-su-shi',
        agentRuleCount: 2,
        selectedOwnerSettingFields: ['communication.contentStyle', 'boundaries.allowedThemes'],
        profile: {
          displayName: 'CBDB Su Shi',
          handle: 'su-shi',
          avatarUrl: 'https://cdn.example.com/cbdb/su-shi-reviewed.png',
          profileCoverUrl: 'https://cdn.example.com/cbdb/song-literati-cover.png',
          defaultVoiceReference: 'preset_voice_id:zh_narrator',
          speechModelId: 'speech/qwen3tts',
          speechRoutePolicy: 'local',
        },
        gates: {
          localAgentIdentityReady: true,
          profileContextReady: true,
          ownerSettingsReady: true,
          profileMediaReady: true,
          voiceReferenceReady: true,
          speechRouteReady: true,
        },
      });
      expect(collectKeys(summary).has('statement')).toBe(false);
      expect(collectKeys(summary).has('selectedInputs')).toBe(false);
    });

     it('fails closed before Runtime projection when world evidence is missing', async () => {
      const realm = mockRealm();
      const result = await projectAgentRuntimeContextSummary({
        ...ownerAgentDetail(),
        world: detailField('world', 'World evidence', ''),
      }, realm);

      expect(realm.projectRuntimePayload).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        ok: false,
        truthWrite: false,
        failure: 'runtime-projection-world-unavailable',
        submitted: null,
      });
    });

     it('builds no agent-specific Runtime projection request for owner-facing summary UI', () => {
      expect(buildRuntimeProjectionInput(ownerAgentDetail())).toMatchObject({
        worldId: 'OASIS',
      });
      expect(collectKeys(buildRuntimeProjectionInput(ownerAgentDetail())).has('agentId')).toBe(false);
    });

     it('builds agent-specific Runtime projection request for Agent Chat readiness only', () => {
      const input = buildAgentChatReadinessProjectionInput(ownerAgentDetailWithWorldId('world-oasis'));
      expect(input).toMatchObject({
        worldId: 'world-oasis',
        agentId: 'agent-1',
        contextEnvelope: {
          allowedAgentLayers: ['DNA', 'BEHAVIORAL', 'CONTEXTUAL'],
          allowedAgentScopes: ['SELF'],
          includeInheritedAgentRules: false,
          requestedAgentRuleKeys: expect.arrayContaining(['behavioral:style:content']),
        },
      });
      expect(collectKeys(input).has('statement')).toBe(false);
    });
});
