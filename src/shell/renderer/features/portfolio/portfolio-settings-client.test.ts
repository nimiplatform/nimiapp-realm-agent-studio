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

describe('owner portfolio settings client', () => {
     it('reads owner settings through MeService.getMyRealmAgentSettings', async () => {
      const realm = mockRealm();
      const settings = await getOwnerAgentSettings('agent-1', realm);

      expect(realm.generated.getMyRealmAgentSettings).toHaveBeenCalledWith({
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
      const updateSettings = realm.generated.updateMyRealmAgentSettings;
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
      expect(realm.generated.updateMyRealmAgentSettings).not.toHaveBeenCalled();
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

      expect(realm.generated.updateMyRealmAgentSettings).not.toHaveBeenCalled();
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

      expect(realm.generated.agentControllerGetVisibility).toHaveBeenCalledWith({
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
      const updateVisibility = realm.generated.agentControllerUpdateVisibility;
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

      expect(realm.generated.agentControllerUpdateVisibility).not.toHaveBeenCalled();
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
      const projectRuntimePayload = realm.generated.projectRuntimePayload;
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
      } as unknown as Awaited<ReturnType<Realm['generated']['projectRuntimePayload']>>);

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

     it('fails closed before Runtime projection when world evidence is missing', async () => {
      const realm = mockRealm();
      const result = await projectAgentRuntimeContextSummary({
        ...ownerAgentDetail(),
        world: detailField('world', 'World evidence', ''),
      }, realm);

      expect(realm.generated.projectRuntimePayload).not.toHaveBeenCalled();
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
});
