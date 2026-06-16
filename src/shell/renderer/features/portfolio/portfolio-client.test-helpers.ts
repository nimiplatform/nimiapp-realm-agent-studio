import type { Runtime } from '@nimiplatform/sdk/runtime';
import type { NimiAIConfigTargetRef } from '@nimiplatform/sdk/ai';
import type { NimiJsonValue } from '@nimiplatform/sdk/contracts';
import type { StudioRealmSurface } from '@renderer/data/realm-client.js';
import {
  createStudioAIScopeRef,
  loadStudioAIConfig,
  saveStudioAIConfig,
} from '@renderer/features/ai-config/studio-ai-config-store.js';
import { vi } from 'vitest';
import type { MyRealmAgentDto, OwnerPortfolioAgentDetail, SettingField } from './portfolio-data.js';
import {
  REALM_AGENT_CREATE_PATH,
  REALM_AGENT_CREATE_SOURCE,
  type RealmAgentCreationWorldDto,
  type ReviewedCreateRealmAgentPayload,
} from './create-agent-draft.js';
import type { CandidatePostPayload } from './post-draft.js';
import type { RealmAgentVisibilitySettings } from './portfolio-settings-client.js';

export type MockRuntimeRoute = {
  readonly capability: 'text.generate' | 'image.generate' | 'audio.synthesize';
  readonly model: string;
  readonly connectorId?: string;
};

export function createStudioLocalRuntimeTargetRefForTest(model: string): NimiAIConfigTargetRef {
  return {
    kind: 'local-runtime',
    profileId: model,
  };
}

export function resetStudioAIConfigForTest(): void {
  const scopeRef = createStudioAIScopeRef();
  saveStudioAIConfig({
    scopeRef,
    capabilities: {
      targetRefs: {},
      selectedParams: {},
    },
    profileOrigin: null,
  }, scopeRef);
}

export function configureStudioAIConfigTargetRefsForTest(input: {
  readonly targetRefs: Partial<Record<MockRuntimeRoute['capability'], NimiAIConfigTargetRef | string>>;
  readonly selectedParams?: Partial<Record<MockRuntimeRoute['capability'], NimiJsonValue>>;
}): void {
  const scopeRef = createStudioAIScopeRef();
  const current = loadStudioAIConfig(scopeRef);
  const targetRefs: Record<string, NimiAIConfigTargetRef> = {};
  for (const [capability, targetRef] of Object.entries(input.targetRefs)) {
    targetRefs[capability] = typeof targetRef === 'string'
      ? createStudioLocalRuntimeTargetRefForTest(targetRef)
      : targetRef;
  }
  saveStudioAIConfig({
    ...current,
    capabilities: {
      targetRefs,
      selectedParams: {
        ...(input.selectedParams || {}),
      },
    },
    profileOrigin: null,
  }, scopeRef);
}

export const agent: MyRealmAgentDto = {
  id: 'agent-1',
  handle: 'mira',
  displayName: 'Mira',
  createdAt: '2026-05-21T00:00:00.000Z',
  isAgent: true,
};

export const world: RealmAgentCreationWorldDto = {
  id: 'world-oasis',
  name: 'OASIS',
  type: 'OASIS',
  status: 'ACTIVE',
  contentRating: 'PG13',
  createdAt: '2026-05-21T00:00:00.000Z',
  level: 1,
  lorebookEntryLimit: 10,
  nativeAgentLimit: 10,
  nativeCreationState: 'OPEN',
  scoreA: 0,
  scoreC: 0,
  scoreE: 0,
  scoreEwma: 0,
  scoreQ: 0,
  transitInLimit: 10,
  agentCount: 0,
  computed: {
    entry: { recommendedAgents: [] },
    featuredAgentCount: 0,
    languages: { common: [] },
    score: { scoreEwma: 0 },
    time: { flowRatio: 1, isPaused: false },
  },
  truth: {
    rules: [],
  },
};

export function mockRealm(): StudioRealmSurface {
  return {
      agentControllerCheckHandle: vi.fn(async (request: { readonly query?: { readonly handle?: string } }) => {
        const handle = String(request.query?.handle || '');
        return {
          available: handle !== 'taken.agent',
          normalized: handle,
          ...(handle === 'taken.agent' ? { message: 'Handle already taken.' } : {}),
        };
      }),
      agentControllerCreate: vi.fn(async () => ({
          id: 'agent-created-1',
          state: 'INCUBATING',
          dna: {},
          user: {
            id: 'agent-created-1',
            handle: 'mira.agent',
            displayName: 'Mira Agent',
          },
      })),
      agentControllerSelectAvatar: vi.fn(async () => ({
        success: true,
      })),
      agentControllerGetVisibility: vi.fn(async () => ({
        accountVisibility: 'PUBLIC',
        defaultPostVisibility: 'PUBLIC',
        dmVisibility: 'FRIENDS',
        profileVisibility: 'PUBLIC',
      })),
      agentControllerUpdateVisibility: vi.fn(async (request: { readonly body: Partial<RealmAgentVisibilitySettings> }) => {
        const input = request.body;
        return {
          accountVisibility: input.accountVisibility || 'PUBLIC',
          defaultPostVisibility: input.defaultPostVisibility || 'PUBLIC',
          dmVisibility: input.dmVisibility || 'FRIENDS',
          profileVisibility: input.profileVisibility || 'PUBLIC',
        };
      }),
      listMyRealmAgents: vi.fn(async () => [agent]),
      getMyRealmAgent: vi.fn(async (request: { readonly path: { readonly agentId: string } }) => ({
        ...agent,
        id: request.path.agentId,
        bio: 'Detail bio',
      })),
      getMyRealmAgentSettings: vi.fn(async (request: { readonly path: { readonly agentId: string } }) => ({
          agentId: request.path.agentId,
          worldId: 'world-oasis',
          agentRuleVersion: 3,
          displayName: 'Mira',
          description: 'Quiet strategist',
          greeting: 'Welcome in.',
          naturalLanguageIntent: null,
          identity: {
            publicRole: 'Guide',
            worldview: 'Layered world.',
          },
          personality: {
            summary: 'Patient strategist.',
            relationshipMode: 'mentor',
            interests: ['strategy'],
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
            positioning: 'guide',
          },
          updatedAt: '2026-05-21T00:00:00.000Z',
      })),
      updateMyRealmAgentSettings: vi.fn(async (request: { readonly path: { readonly agentId: string }; readonly body: Record<string, unknown> }) => {
        const input = request.body;
        return {
          agentId: request.path.agentId,
          worldId: 'world-oasis',
          agentRuleVersion: 4,
          displayName: typeof input.displayName === 'string' ? input.displayName : 'Mira',
          description: typeof input.description === 'string' ? input.description : 'Quiet strategist',
          greeting: typeof input.greeting === 'string' ? input.greeting : 'Welcome in.',
          naturalLanguageIntent: typeof input.naturalLanguageIntent === 'string' ? input.naturalLanguageIntent : null,
          identity: {
            publicRole: 'Guide',
            worldview: 'Layered world.',
            ...((input.identity && typeof input.identity === 'object') ? input.identity as Record<string, unknown> : {}),
          },
          personality: {
            summary: 'Patient strategist.',
            relationshipMode: 'mentor',
            interests: ['strategy'],
            goals: ['keep lore coherent'],
            ...((input.personality && typeof input.personality === 'object') ? input.personality as Record<string, unknown> : {}),
          },
          communication: {
            contentStyle: 'Concise.',
            formality: 'casual',
            responseLength: 'medium',
            sentiment: 'neutral',
            ...((input.communication && typeof input.communication === 'object') ? input.communication as Record<string, unknown> : {}),
          },
          boundaries: {
            allowedThemes: ['adventure'],
            disallowedThemes: ['gore'],
            ...((input.boundaries && typeof input.boundaries === 'object') ? input.boundaries as Record<string, unknown> : {}),
          },
          positioning: {
            targetAudience: 'builders',
            positioning: 'guide',
            ...((input.positioning && typeof input.positioning === 'object') ? input.positioning as Record<string, unknown> : {}),
          },
          updatedAt: '2026-05-22T00:00:00.000Z',
        };
      }),
      worldControllerListWorlds: vi.fn(async () => [world]),
      worldControllerGetWorldDetailWithAgents: vi.fn(async (request: { readonly path: { readonly id: string } }) => ({
          ...world,
          id: request.path.id,
          agentRuleSummary: {
            byLayer: {
              BEHAVIORAL: 0,
              CONTEXTUAL: 0,
              DNA: 0,
              RELATIONAL: 0,
            },
            totalAgentRuleCount: 0,
            worldLinkedRuleCount: 0,
          },
          agents: [],
      })),
      createPost: vi.fn(async () => ({
          id: 'post-1',
          authorId: 'author-from-realm',
          author: {
            id: 'author-from-realm',
            displayName: 'Mira',
          },
          attachments: [],
          caption: 'Published caption',
          createdAt: '2026-05-21T00:00:00.000Z',
          moderationStatus: 'PENDING',
          tags: ['studio'],
          visibility: 'PUBLIC',
          worldId: 'world-from-realm',
      })),
      listResources: vi.fn(async () => ({
          items: [
            {
              id: 'resource-text-1',
              resourceType: 'TEXT',
              provider: 'S3_OBJECT',
              status: 'READY',
              storageRef: 'text/user-1/resource-text-1.txt',
              mimeType: 'text/plain; charset=utf-8',
              provenance: 'UPLOADED',
              uploaderAccountId: 'user-1',
              controllerKind: 'ACCOUNT',
              controllerId: 'user-1',
              deliveryAccess: 'SIGNED',
              agentId: 'agent-1',
              label: 'Reviewed post text for @mira',
              tags: ['studio'],
              title: 'Published caption',
              createdAt: '2026-05-21T00:00:00.000Z',
              updatedAt: '2026-05-21T00:00:00.000Z',
            },
            {
              id: 'resource-pending-image',
              resourceType: 'IMAGE',
              provider: 'CF_IMAGE',
              status: 'PENDING',
              storageRef: 'image/user-1/pending',
              provenance: 'UPLOADED',
              uploaderAccountId: 'user-1',
              controllerKind: 'ACCOUNT',
              controllerId: 'user-1',
              deliveryAccess: 'SIGNED',
              tags: [],
              createdAt: '2026-05-21T00:00:00.000Z',
              updatedAt: '2026-05-21T00:00:00.000Z',
            },
          ],
      })),
      createImageDirectUpload: vi.fn(async () => ({
        resourceId: 'resource-image-upload',
        resourceType: 'IMAGE',
        provider: 'CF_IMAGE',
        storageRef: 'cf-image-1',
        uploadUrl: 'https://upload.example.test/image',
        expiresIn: null,
        status: 'PENDING',
        deliveryAccess: 'SIGNED',
      })),
      createVideoDirectUpload: vi.fn(async () => ({
        resourceId: 'resource-video-upload',
        resourceType: 'VIDEO',
        provider: 'CF_STREAM',
        storageRef: 'cf-video-1',
        uploadUrl: 'https://upload.example.test/video',
        expiresIn: null,
        status: 'PENDING',
        deliveryAccess: 'SIGNED',
      })),
      createAudioDirectUpload: vi.fn(async () => ({
        resourceId: 'resource-audio-upload',
        resourceType: 'AUDIO',
        provider: 'S3_OBJECT',
        storageRef: 'audio/user-1/audio.mp3',
        uploadUrl: 'https://upload.example.test/audio',
        expiresIn: 3600,
        status: 'PENDING',
        deliveryAccess: 'SIGNED',
      })),
      finalizeResource: vi.fn(async (request: { readonly path: { readonly resourceId: string }; readonly body: Record<string, unknown> }) => {
        const input = request.body;
        return {
          id: request.path.resourceId,
          resourceType: input.metadata && typeof input.metadata === 'object'
            ? (input.metadata as Record<string, unknown>).resourceType
            : 'IMAGE',
          provider: 'S3_OBJECT',
          status: 'READY',
          storageRef: request.path.resourceId,
          mimeType: input.mimeType,
          provenance: 'UPLOADED',
          uploaderAccountId: 'user-1',
          controllerKind: 'ACCOUNT',
          controllerId: 'user-1',
          deliveryAccess: input.deliveryAccess || 'SIGNED',
          agentId: input.agentId,
          label: input.label,
          tags: input.tags || [],
          title: input.title,
          metadata: input.metadata,
          createdAt: '2026-05-21T00:00:00.000Z',
          updatedAt: '2026-05-21T00:00:00.000Z',
        };
      }),
      createTextResource: vi.fn(async () => ({
        id: 'resource-text-1',
        resourceType: 'TEXT',
        provider: 'S3_OBJECT',
        status: 'READY',
        storageRef: 'text/user-1/resource-text-1.txt',
        mimeType: 'text/plain; charset=utf-8',
        provenance: 'UPLOADED',
        uploaderAccountId: 'user-1',
        controllerKind: 'ACCOUNT',
        controllerId: 'user-1',
        deliveryAccess: 'SIGNED',
        agentId: 'agent-1',
        label: 'Reviewed post text for @mira',
        tags: ['studio'],
        title: 'Published caption',
        createdAt: '2026-05-21T00:00:00.000Z',
        updatedAt: '2026-05-21T00:00:00.000Z',
      })),
      projectRuntimePayload: vi.fn(async (request: { readonly body?: { readonly agentId?: string; readonly worldId?: string } }) => {
        if (request.body?.agentId) {
          const worldId = request.body.worldId || 'cbdb-song-slice-real-20260614-world';
          const agentId = request.body.agentId;
          const agentRuleInput = {
            id: 'agent-rule-input-1',
            sourceType: 'AGENT_RULE',
            sourceId: 'agent-rule-content-style',
            lineageId: 'lineage-agent-content-style',
            worldId,
            agentId,
            ruleKey: 'behavioral:style:content',
            title: 'Owner Content Style',
            statement: 'Reviewed content style that must not reach Studio UI.',
            hardness: 'SOFT',
            priority: 70,
            scope: 'SELF',
            layer: 'BEHAVIORAL',
            provenance: 'SYSTEM',
            structured: {
              ownerSettingField: 'communication.contentStyle',
              contentStyle: 'Uses reviewed Song-literati register.',
            },
          };
          return {
            worldId,
            agentId,
            consumerSurface: 'RUNTIME_PAYLOAD',
            releaseAnchor: null,
            checksum: 'checksum-runtime-agent-1',
            selectedInputs: [agentRuleInput],
            trace: {
              selectedInputIds: ['agent-rule-input-1'],
              suppressedInputs: [],
              resolutionOutcomes: [],
            },
            payload: {
              worldRules: [],
              agentRules: [agentRuleInput],
            },
          };
        }
        return {
          worldId: 'OASIS',
          consumerSurface: 'RUNTIME_PAYLOAD',
          releaseAnchor: null,
          checksum: 'checksum-runtime-1',
          selectedInputs: [{
            id: 'rule-input-1',
            sourceType: 'WORLD_RULE',
            sourceId: 'world-rule-1',
            lineageId: 'lineage-1',
            worldId: 'OASIS',
            ruleKey: 'hidden.raw.rule',
            title: 'Hidden raw rule title',
            statement: 'Hidden raw rule statement that must not reach Studio UI.',
            hardness: 'HARD',
            priority: 1,
            scope: 'WORLD',
            provenance: 'WORLD',
          }],
          trace: {
            selectedInputIds: ['rule-input-1'],
            suppressedInputs: [{
              input: {
                id: 'rule-input-suppressed',
                sourceType: 'AGENT_RULE',
                sourceId: 'agent-rule-1',
                lineageId: 'lineage-suppressed',
                worldId: 'OASIS',
                agentId: 'agent-1',
                ruleKey: 'hidden.agent.rule',
                title: 'Suppressed raw rule title',
                statement: 'Suppressed raw rule statement that must not reach Studio UI.',
                hardness: 'SOFT',
                priority: 1,
                scope: 'SELF',
                provenance: 'OWNER',
              },
              reason: 'SURFACE_POLICY',
            }],
            resolutionOutcomes: [],
          },
          payload: {
            worldRules: [{
              id: 'rule-input-1',
              sourceType: 'WORLD_RULE',
              sourceId: 'world-rule-1',
              lineageId: 'lineage-1',
              worldId: 'OASIS',
              ruleKey: 'hidden.raw.rule',
              title: 'Hidden raw rule title',
              statement: 'Hidden raw rule statement that must not reach Studio UI.',
              hardness: 'HARD',
              priority: 1,
              scope: 'WORLD',
              provenance: 'WORLD',
            }],
            agentRules: [],
          },
        };
      }),
  } as unknown as StudioRealmSurface;
}

function localKindForCapability(capability: MockRuntimeRoute['capability']): string {
  if (capability === 'image.generate') return 'image';
  if (capability === 'audio.synthesize') return 'tts';
  return 'chat';
}

export function mockRuntimeWithRoutes(input: {
  readonly executeScenario: ReturnType<typeof vi.fn>;
  readonly routes: readonly MockRuntimeRoute[];
}): Runtime {
  const cloudRoutes = input.routes.filter((route) => route.connectorId);
  const localRoutes = input.routes.filter((route) => !route.connectorId);
  return {
    ai: {
      executeScenario: input.executeScenario,
      streamScenario: async function* () {},
    },
    connectors: {
      listConnectors: vi.fn(async () => ({
        connectors: [...new Map(cloudRoutes.map((route) => [
          route.connectorId,
          {
            connectorId: route.connectorId,
            label: route.connectorId,
            provider: route.connectorId,
            kind: 'remote_managed',
          },
        ])).values()],
        nextPageToken: '',
      })),
      listConnectorModels: vi.fn(async (request: { readonly connectorId: string }) => ({
        models: cloudRoutes
          .filter((route) => route.connectorId === request.connectorId)
          .map((route) => ({
            modelId: route.model,
            capabilities: [route.capability],
            available: true,
          })),
        nextPageToken: '',
      })),
    },
    local: {
      listLocalAssets: vi.fn(async () => ({
        assets: localRoutes.map((route) => ({
          localAssetId: `${localKindForCapability(route.capability)}:${route.model}`,
          assetId: route.model,
          kind: localKindForCapability(route.capability),
          engine: 'mock-runtime',
          endpoint: 'runtime://mock-local',
          status: 'active',
          capabilities: [route.capability],
        })),
        nextPageToken: '',
      })),
    },
  } as unknown as Runtime;
}

export function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (!value || typeof value !== 'object') {
    return keys;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    keys.add(key);
    collectKeys(nested, keys);
  }

  return keys;
}

export function detailField(key: SettingField['key'], label: string, value: string): SettingField {
  if (!value) {
    return {
      key,
      label,
      value,
      status: 'available-empty',
      source: 'Realm MeService.getMyRealmAgent',
      readOnly: true,
      emptyLabel: 'not set',
    };
  }
  return {
    key,
    label,
    value,
    status: 'available',
    source: 'Realm MeService.getMyRealmAgent',
    readOnly: true,
  };
}

export function ownerAgentDetail(): OwnerPortfolioAgentDetail {
  return {
    id: 'agent-1',
    displayName: detailField('displayName', 'Display name', 'Mira'),
    handle: detailField('handle', 'Handle', 'mira'),
    bio: detailField('bio', 'Profile description', ''),
    greeting: detailField('greeting', 'Greeting', ''),
    profileCoverUrl: detailField('profileCoverUrl', 'Profile cover URL', ''),
    ownership: detailField('ownership', 'Ownership evidence', 'MASTER_OWNED'),
    world: detailField('world', 'World evidence', 'OASIS'),
    state: detailField('state', 'State evidence', 'ACTIVE'),
    avatarUrl: null,
    voice: {
      voiceId: '',
      description: '',
      emotionEnabled: null,
      speed: null,
      pitch: null,
      speechModelId: '',
      speechRoutePolicy: null,
    },
    friendCount: { status: 'source-unavailable', label: 'friendCount source unavailable' },
    ownerScope: 'owner-created',
    source: 'Realm MeService.getMyRealmAgent',
  };
}

export function ownerAgentDetailWithWorldId(worldId = 'world-oasis'): OwnerPortfolioAgentDetail {
  return {
    ...ownerAgentDetail(),
    world: detailField('world', 'World id evidence', worldId),
  };
}

export const candidatePayload: CandidatePostPayload = {
  candidate: true,
  source: 'realm-agent-studio.local-post-draft',
  agentRef: {
    source: 'Realm MeService.getMyRealmAgent',
    agentKey: 'agent-1',
    handle: 'mira',
    displayName: 'Mira',
  },
  realmCreatePost: {
    attachments: [{
      targetType: 'RESOURCE',
      targetId: 'resource-1',
    }],
    caption: 'Published caption',
    tags: ['studio'],
  },
  review: {
    humanReviewed: true,
  },
};

export const createPayload: ReviewedCreateRealmAgentPayload = {
  source: REALM_AGENT_CREATE_SOURCE,
  path: REALM_AGENT_CREATE_PATH,
  publicFields: {
    handle: 'mira.agent',
    displayName: 'Mira Agent',
    concept: 'Durable public Realm Agent',
    description: 'Owner-created public identity',
    rulesText: 'Stay visible.\nStay owner-reviewed.',
  },
  body: {
    handle: 'mira.agent',
    displayName: 'Mira Agent',
    concept: 'Durable public Realm Agent',
    description: 'Owner-created public identity',
    worldId: 'world-oasis',
    ownershipType: 'MASTER_OWNED',
    dnaPrimary: 'CARING',
    dnaSecondary: ['GENTLE', 'WISE'],
    rules: {
      format: 'rule-lines-v1',
      lines: ['Stay visible.', 'Stay owner-reviewed.'],
      text: 'Stay visible.\nStay owner-reviewed.',
    },
  },
};
