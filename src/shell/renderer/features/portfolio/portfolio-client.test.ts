import type { StudioRealmSurface } from '@renderer/data/realm-client.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  createReviewedRealmAgentWithProfileSettings,
  generateReviewedVisualImageCandidate,
  getAgentVisibilitySettings,
  getCbdbCuratedSystemPortfolioAgentDetail,
  getCreateRealmAgentWorldPreview,
  getOwnerAgentSettings,
  getOwnerPortfolioAgentDetail,
  getPortfolioAgentSettings,
  getRealmAgentStudioPortfolioAgentDetail,
  listCreateRealmAgentSelectableWorlds,
  listCbdbCuratedSystemPortfolioAgents,
  listOwnerPortfolioAgents,
  listRealmAgentStudioPortfolioAgents,
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
  updateReviewedPortfolioAgentSettings,
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
  ownerAgentDetail,
  ownerAgentDetailWithWorldId,
  resetStudioAIConfigForTest,
} from './portfolio-client.test-helpers.js';

beforeEach(() => {
  resetStudioAIConfigForTest();
});

describe('owner portfolio core client', () => {
    it('uses listMyRealmAgents only for portfolio list data', async () => {
      const realm = mockRealm();
      const agents = await listOwnerPortfolioAgents(realm);

      expect(realm.listMyRealmAgents).toHaveBeenCalledTimes(1);
      expect(realm.getMyRealmAgent).not.toHaveBeenCalled();
      expect(agents[0]?.source).toBe('Realm MeService.listMyRealmAgents');
    });

    it('lists owner-created and CBDB curated system agents through admitted portfolio lanes', async () => {
      const realm = mockRealm();
      const agents = await listRealmAgentStudioPortfolioAgents(realm);

      expect(realm.listMyRealmAgents).toHaveBeenCalledTimes(1);
      expect(realm.listCbdbCuratedSystemAgents).toHaveBeenCalledTimes(1);
      expect(agents.map((item) => [item.id, item.ownerScope, item.source])).toEqual([
        ['agent-1', 'owner-created', 'Realm MeService.listMyRealmAgents'],
        ['cbdb-agent-su-shi', 'cbdb-curated-system', 'Realm AgentCuratedSystemService.listCbdbCuratedSystemAgents'],
      ]);
    });

    it('reads CBDB curated system agent details through the curated lane', async () => {
      const realm = mockRealm();
      const detail = await getCbdbCuratedSystemPortfolioAgentDetail('cbdb-agent-su-shi', realm);

      expect(realm.getCbdbCuratedSystemAgent).toHaveBeenCalledWith({ path: { agentId: 'cbdb-agent-su-shi' } });
      expect(detail.ownerScope).toBe('cbdb-curated-system');
      expect(detail.source).toBe('Realm AgentCuratedSystemService.getCbdbCuratedSystemAgent');
      expect(detail.world.value).toBe('cbdb-song-slice-real-20260614-world');
    });

    it('falls through to CBDB curated system detail when owner authority does not contain the agent', async () => {
      const realm = mockRealm();
      vi.mocked(realm.getMyRealmAgent).mockRejectedValueOnce(new Error('owner authority missing'));

      const detail = await getRealmAgentStudioPortfolioAgentDetail('cbdb-agent-su-shi', realm);

      expect(realm.getMyRealmAgent).toHaveBeenCalledWith({ path: { agentId: 'cbdb-agent-su-shi' } });
      expect(realm.getCbdbCuratedSystemAgent).toHaveBeenCalledWith({ path: { agentId: 'cbdb-agent-su-shi' } });
      expect(detail.ownerScope).toBe('cbdb-curated-system');
    });

    it('fetches selected detail through getMyRealmAgent', async () => {
      const realm = mockRealm();
      const detail = await getOwnerPortfolioAgentDetail('agent-detail-1', realm);

      expect(realm.getMyRealmAgent).toHaveBeenCalledWith({ path: { agentId: 'agent-detail-1' } });
      expect(realm.listMyRealmAgents).not.toHaveBeenCalled();
      expect(detail.id).toBe('agent-detail-1');
      expect(detail.bio.value).toBe('Detail bio');
      expect(detail.source).toBe('Realm MeService.getMyRealmAgent');
    });

    it('keeps standalone CBDB list reads off owner-created portfolio methods', async () => {
      const realm = mockRealm();
      const agents = await listCbdbCuratedSystemPortfolioAgents(realm);

      expect(realm.listCbdbCuratedSystemAgents).toHaveBeenCalledTimes(1);
      expect(realm.listMyRealmAgents).not.toHaveBeenCalled();
      expect(agents[0]?.ownerScope).toBe('cbdb-curated-system');
    });

    it('uses WorldsService only for create readiness world list reads', async () => {
      const realm = mockRealm();
      const worlds = await listCreateRealmAgentSelectableWorlds(realm);

      expect(realm.worldControllerListWorlds).toHaveBeenCalledTimes(1);
      expect(realm.agentControllerCreate).not.toHaveBeenCalled();
      expect(worlds[0]).toMatchObject({
        id: 'world-oasis',
        source: 'Realm WorldsService.worldControllerListWorlds',
      });
    });

    it('uses WorldsService detail-with-agents for selected world preview', async () => {
      const realm = mockRealm();
      const preview = await getCreateRealmAgentWorldPreview('world-oasis', realm);

      expect(realm.worldControllerGetWorldDetailWithAgents).toHaveBeenCalledWith({
        path: { id: 'world-oasis' },
        query: { recommendedAgentLimit: 4 },
      });
      expect(realm.agentControllerCreate).not.toHaveBeenCalled();
      expect(preview.source).toBe('Realm WorldsService.worldControllerGetWorldDetailWithAgents');
    });

    it('checks create handle availability through AgentsService before create', async () => {
      const realm = mockRealm();
      const available = await checkCreateRealmAgentHandleAvailability(' @Mira.Agent ', realm);
      const unavailable = await checkCreateRealmAgentHandleAvailability('taken.agent', realm);

      expect(realm.agentControllerCheckHandle).toHaveBeenCalledWith({
        path: {},
        query: { handle: 'mira.agent' },
      });
      expect(realm.agentControllerCheckHandle).toHaveBeenCalledWith({
        path: {},
        query: { handle: 'taken.agent' },
      });
      expect(available).toMatchObject({
        ok: true,
        truthWrite: false,
        availability: {
          source: 'Realm AgentsService.agentControllerCheckHandle',
          handle: 'mira.agent',
          normalized: 'mira.agent',
          available: true,
        },
      });
      expect(unavailable).toMatchObject({
        ok: true,
        truthWrite: false,
        availability: {
          handle: 'taken.agent',
          available: false,
          message: 'Handle already taken.',
        },
      });
      expect(realm.agentControllerCreate).not.toHaveBeenCalled();
    });

    it('creates a Realm Agent through AgentsService.agentControllerCreate with CreateAgentDto allowlist only', async () => {
      const realm = mockRealm();
      const result = await createReviewedRealmAgent(createPayload, realm);
      const createAgent = realm.agentControllerCreate;
      const submittedPayload = vi.mocked(createAgent).mock.calls[0]?.[0]?.body;

      expect(createAgent).toHaveBeenCalledTimes(1);
      expect(submittedPayload).toEqual(createPayload.body);
      expect(Object.keys(submittedPayload || {}).sort()).toEqual([
        'concept',
        'description',
        'displayName',
        // Realm requires `dnaPrimary` (or full `dna` JSON); Studio sends the
        // archetype-based form. `dnaSecondary` is optional but included here
        // because the test fixture sets it. Full `dna` JSON remains stripped.
        'dnaPrimary',
        'dnaSecondary',
        'handle',
        'ownershipType',
        'rules',
        'worldId',
      ]);
      expect(collectKeys(submittedPayload).has('publicBio')).toBe(false);
      expect(collectKeys(submittedPayload).has('id')).toBe(false);
      expect(collectKeys(submittedPayload).has('authorId')).toBe(false);
      expect(collectKeys(submittedPayload).has('ownerId')).toBe(false);
      expect(collectKeys(submittedPayload).has('creatorId')).toBe(false);
      expect(collectKeys(submittedPayload).has('maintainerId')).toBe(false);
      expect(collectKeys(submittedPayload).has('state')).toBe(false);
      expect(collectKeys(submittedPayload).has('lifecycle')).toBe(false);
      expect(collectKeys(submittedPayload).has('provider')).toBe(false);
      expect(collectKeys(submittedPayload).has('model')).toBe(false);
      expect(collectKeys(submittedPayload).has('LocalAgent')).toBe(false);
      // Full `dna` JSON is still stripped — Studio always sends the archetype
      // form (`dnaPrimary` + optional `dnaSecondary`), never the full JSON.
      expect(collectKeys(submittedPayload).has('dna')).toBe(false);
      // dnaPrimary / dnaSecondary now flow through as required by Realm.
      expect(collectKeys(submittedPayload).has('dnaPrimary')).toBe(true);
      expect(collectKeys(submittedPayload).has('dnaSecondary')).toBe(true);
      expect(collectKeys(submittedPayload).has('referenceImageUrl')).toBe(false);
      expect(result).toMatchObject({
        ok: true,
        source: REALM_AGENT_CREATE_SOURCE,
        canonical: {
          id: 'agent-created-1',
          state: 'INCUBATING',
        },
      });
    });

    it('completes reviewed profile description through owner settings after create', async () => {
      const realm = mockRealm();
      const result = await createReviewedRealmAgentWithProfileSettings(createPayload, realm);
      const settingsUpdate = realm.updateMyRealmAgentSettings;

      expect(result).toMatchObject({
        ok: true,
        canonical: { id: 'agent-created-1' },
        profileSettings: {
          status: 'updated',
          source: 'Realm MeService.updateMyRealmAgentSettings',
          truthWrite: true,
          description: 'Owner-created public identity',
        },
      });
      expect(realm.getMyRealmAgentSettings).toHaveBeenCalledWith({ path: { agentId: 'agent-created-1' } });
      expect(settingsUpdate).toHaveBeenCalledWith({
        path: { agentId: 'agent-created-1' },
        body: { description: 'Owner-created public identity' },
      });
    });

    it('does not require or call a Creator service for create reads or writes', async () => {
      const realm = mockRealm();

      await listCreateRealmAgentSelectableWorlds(realm);
      await getCreateRealmAgentWorldPreview('world-oasis', realm);
      await createReviewedRealmAgent(createPayload, realm);

      expect(realm.agentControllerCreate).toHaveBeenCalledTimes(1);
    });

    it('creates audio upload session with metadata and finalizes after storage upload', async () => {
      const realm = mockRealm();
      const storageUpload = vi.fn(async () => undefined);
      const result = await uploadReviewedPostMediaResource({
        resourceType: 'AUDIO',
        file: { name: 'voice.mp3', type: 'audio/mpeg', size: 4096 },
        agent: ownerAgentDetailWithWorldId(),
      }, realm, storageUpload);
      const audioPayload = vi.mocked(realm.createAudioDirectUpload).mock.calls[0]?.[0]?.body;

      expect(audioPayload).toMatchObject({
        agentId: 'agent-1',
        filename: 'voice.mp3',
        mimeType: 'audio/mpeg',
        metadata: {
          source: 'realm-agent-studio.reviewed-post-media-resource',
          resourceType: 'AUDIO',
        },
      });
      expect(storageUpload).toHaveBeenCalledWith({
        uploadUrl: 'https://upload.example.test/audio',
        resourceType: 'AUDIO',
        file: { name: 'voice.mp3', type: 'audio/mpeg', size: 4096 },
      });
      expect(result).toMatchObject({
        ok: true,
        canonical: {
          id: 'resource-audio-upload',
          resourceType: 'AUDIO',
          status: 'READY',
        },
      });
    });

    it('normalizes Create Agent responses without canonical id as create failure', () => {
      const result = normalizeRealmAgentCreateResult({} as Awaited<ReturnType<StudioRealmSurface['agentControllerCreate']>>);

      expect(result).toMatchObject({
        ok: false,
        source: REALM_AGENT_CREATE_SOURCE,
        failure: 'realm-create-agent-missing-canonical-id',
      });
    });

    it('builds CreateAgentDto shape from reviewed payload body only', () => {
      const input = buildRealmCreateAgentInput(createPayload);

      expect(input).toEqual(createPayload.body);
      expect(collectKeys(input).has('publicFields')).toBe(false);
      expect(collectKeys(input).has('path')).toBe(false);
      expect(collectKeys(input).has('source')).toBe(false);
    });

    it('rebuilds CreateAgentDto from a narrow allowlist and forces MASTER_OWNED at submit boundary', () => {
      // The dirty payload spreads forbidden control-plane fields into body to
      // prove buildRealmCreateAgentInput strips them. `dnaPrimary` /
      // `dnaSecondary` / `referenceImageUrl` are no longer forbidden — Realm
      // accepts them. Full `dna` JSON, however, is still stripped (Studio
      // always chose the archetype form for DNA).
      const dirtyPayload = {
        ...createPayload,
        body: {
          ...createPayload.body,
          ownershipType: 'WORLD_OWNED',
          dna: { hidden: true },
          lifecycle: 'ACTIVE',
          provider: 'forbidden',
          model: 'forbidden',
          ownerId: 'owner-1',
        },
      } as unknown as ReviewedCreateRealmAgentPayload;
      const input = buildRealmCreateAgentInput(dirtyPayload);

      expect(input).toEqual(createPayload.body);
      expect(input.ownershipType).toBe('MASTER_OWNED');
      expect(collectKeys(input).has('dna')).toBe(false);
      expect(collectKeys(input).has('lifecycle')).toBe(false);
      expect(collectKeys(input).has('provider')).toBe(false);
      expect(collectKeys(input).has('model')).toBe(false);
      expect(collectKeys(input).has('ownerId')).toBe(false);
      // dnaPrimary / dnaSecondary are now legitimate and pass through:
      expect(input.dnaPrimary).toBe('CARING');
      expect(input.dnaSecondary).toEqual(['GENTLE', 'WISE']);
    });

    it('admits reviewed referenceImageUrl without treating it as asset binding truth', () => {
      const payloadWithReference: ReviewedCreateRealmAgentPayload = {
        ...createPayload,
        body: {
          ...createPayload.body,
          referenceImageUrl: 'https://cdn.example.test/reviewed-reference.png',
        },
      };
      const input = buildRealmCreateAgentInput(payloadWithReference);

      expect(input.referenceImageUrl).toBe('https://cdn.example.test/reviewed-reference.png');
      expect(collectKeys(input).has('bindingPoint')).toBe(false);
      expect(collectKeys(input).has('assetId')).toBe(false);
      expect(collectKeys(input).has('resourceId')).toBe(false);
    });

    it('fails closed when Runtime Tauri IPC transport is unavailable', async () => {
      const result = await synthesizeReviewedVoiceDemo({
        scriptText: 'Welcome in.',
      }, ownerAgentDetail(), null);

      expect(result).toMatchObject({
        ok: false,
        source: 'Runtime ScenarioService.executeScenario audio.synthesize',
        failure: 'runtime-transport-unavailable',
        message: 'Runtime speechSynthesize scenario transport unavailable: Tauri IPC runtime transport is required.',
      });
      expect(result.draft).toMatchObject({
        candidate: true,
        publicTruth: false,
      });
    });
});
