import { useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState, FieldShell, InlineAlert, SelectField, StatusBadge, Surface, TextareaField, TextField } from '@nimiplatform/kit/ui';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronRight,
  FileUp,
  Image as ImageIcon,
  Lock,
  PencilLine,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  DNA_PRIMARY_ARCHETYPES,
  createRealmAgentHandleCandidate,
  normalizeCreateRealmAgentDraft,
  selectOasisDefaultWorld,
  validateCreateRealmAgentReadiness,
  type CreateRealmAgentDraftInput,
  type DnaPrimaryArchetype,
  type ReviewedCreateRealmAgentPayload,
  type SelectableRealmWorld,
} from './create-agent-draft.js';
import {
  checkCreateRealmAgentHandleAvailability,
  createReviewedRealmAgentWithProfileSettings,
  getCreateRealmAgentWorldPreview,
  listOwnerPortfolioAgents,
  listCreateRealmAgentSelectableWorlds,
  type RealmAgentCreateWithProfileSettingsResult,
  type RealmAgentHandleAvailabilityResult,
} from './portfolio-client.js';
import type { OwnerPortfolioAgent } from './portfolio-data.js';
import { generateAgentSeedFromDescription, type AgentSeedGenerationResult } from './agent-seed-generator.js';
import {
  acceptAgentCreationGraphForRealmCreate,
  agentCreationGraphSourceModeLabel,
  buildAgentCreationGraphFromDraft,
  validateAgentCreationGraphForRealmCreate,
  type AgentCreationGraphSourceField,
  type AgentCreationGraphSourceMode,
} from './agent-creation-graph.js';
import {
  mapCharacterCardToCreateDraft,
  mapCharacterCardToGraphSourceFields,
  parseDownloadedCharacterCardFile,
  type CharacterCardImportResult,
} from './character-card-import.js';
import {
  defaultReferenceImagePromptFromDraft,
  generateAgentReferenceImage,
  type AgentReferenceImageResult,
} from './agent-reference-image.js';
import { useStudioI18n } from '../../i18n/use-studio-i18n.js';
import type { StudioCopyKey } from '../../i18n/studio-copy.js';
import type { StudioTranslateOptions } from '../../i18n/studio-i18n.js';

export type CreatedRealmAgentContext = {
  agentId: string;
  state: string | null;
  handle: string;
  displayName: string;
  selectedWorldId: string;
};

type CreateRealmAgentWorkspaceProps = {
  onCreated?: (context: CreatedRealmAgentContext) => void;
  onOpenCreatedAgent?: (agentId: string, target: 'detail' | 'settings' | 'launch') => void;
};

type StudioTranslator = (key: StudioCopyKey, options?: StudioTranslateOptions) => string;
type CreateStep = 'source' | 'draft' | 'review' | 'confirm';
type ReviewFieldKey = 'handle' | 'displayName' | 'description' | 'dnaPrimary' | 'world';
type ReviewStatus = 'accepted' | 'needs-review' | 'blocked';

type DraftDirection = {
  id: string;
  labelKey: StudioCopyKey;
  sourceLabelKey: StudioCopyKey;
  displayName: string;
  identitySummary: string;
  dnaPrimary: DnaPrimaryArchetype | '';
  toneTags: string[];
  behaviorBoundary: string;
  publicDescription: string;
};

type ReviewField = {
  key: ReviewFieldKey;
  labelKey: StudioCopyKey;
  status: ReviewStatus;
  reasonKey: StudioCopyKey;
  issue: string | null;
};

type ConfirmPreviewField = {
  key: string;
  labelKey: StudioCopyKey;
  value: string;
  emphasized?: boolean;
};

const SOURCE_MODE_OPTIONS: Array<{
  mode: AgentCreationGraphSourceMode;
  titleKey: StudioCopyKey;
  descriptionKey: StudioCopyKey;
}> = [
  {
    mode: 'description',
    titleKey: 'create.source.description.title',
    descriptionKey: 'create.source.description.description',
  },
  {
    mode: 'manual',
    titleKey: 'create.source.manual.title',
    descriptionKey: 'create.source.manual.description',
  },
  {
    mode: 'downloaded-character-card',
    titleKey: 'create.source.characterCard.title',
    descriptionKey: 'create.source.characterCard.description',
  },
  {
    mode: 'existing-agent-remix',
    titleKey: 'create.source.remix.title',
    descriptionKey: 'create.source.remix.description',
  },
];

const SOURCE_MODE_SWITCH_OPTIONS: Array<{
  mode: AgentCreationGraphSourceMode;
  labelKey: StudioCopyKey;
}> = [
  { mode: 'description', labelKey: 'create.modeSwitch.description' },
  { mode: 'manual', labelKey: 'create.modeSwitch.manual' },
  { mode: 'downloaded-character-card', labelKey: 'create.modeSwitch.characterCard' },
  { mode: 'existing-agent-remix', labelKey: 'create.modeSwitch.remix' },
];

const REVIEW_LABEL_KEYS: Record<ReviewFieldKey, StudioCopyKey> = {
  handle: 'create.review.field.handle',
  displayName: 'create.review.field.displayName',
  description: 'create.review.field.description',
  dnaPrimary: 'create.review.field.dnaPrimary',
  world: 'create.review.field.world',
};

const CREATE_FIXED_MESSAGE_KEYS: Record<string, StudioCopyKey> = {
  'handle missing': 'create.error.handleMissing',
  'display name missing': 'create.error.displayNameMissing',
  'concept missing': 'create.error.conceptMissing',
  'selected world missing': 'create.error.selectedWorldMissing',
  'DNA primary archetype missing (Realm requires `dnaPrimary` or full `dna` JSON; we send the archetype-based form)': 'create.error.dnaPrimaryMissing',
  'selected world not source-backed by WorldsService.worldControllerListWorlds': 'create.error.selectedWorldNotSourceBacked',
  'handle availability not checked by AgentsService.agentControllerCheckHandle': 'create.error.handleAvailabilityMissing',
  'handle availability not checked for the current normalized handle': 'create.error.handleAvailabilityStale',
  'Agent handle check requires a non-empty normalized handle.': 'create.error.handleAvailabilityEmpty',
  'Realm handle availability check did not return an availability boolean.': 'create.error.handleAvailabilityMissingBoolean',
  'Realm handle availability check failed.': 'create.error.handleAvailabilityFailed',
  'Realm Create Agent returned no agent object.': 'create.error.realmCreateNoAgent',
  'Realm Create Agent returned no canonical agent id.': 'create.error.realmCreateNoId',
  'Realm Create Agent failed.': 'create.error.realmCreateFailed',
  'Realm owner settings read failed after create.': 'create.error.ownerSettingsReadFailed',
  'reference image prompt empty': 'create.error.referencePromptEmpty',
  'Reference image payload invalid.': 'create.error.referencePayloadInvalid',
  'Runtime imageGenerate scenario transport unavailable: Tauri IPC runtime transport is required.': 'create.error.referenceTransportUnavailable',
  'Runtime imageGenerate scenario returned no readable artifact.': 'create.error.referenceNoArtifact',
  'Runtime imageGenerate produced a local artifact but no http(s) URL that Realm can store as a public reference image.': 'create.error.referenceLocalArtifactNoUrl',
};

function translateCreateFixedMessage(message: string, t: StudioTranslator): string {
  const handleUnavailable = message.match(/^handle unavailable: (.+)$/);
  if (handleUnavailable) return t('create.error.handleUnavailable', { message: handleUnavailable[1] });
  const key = CREATE_FIXED_MESSAGE_KEYS[message];
  return key ? t(key) : message;
}

function translateCreateFixedMessages(messages: string[], t: StudioTranslator): string {
  return messages.map((message) => translateCreateFixedMessage(message, t)).join('; ');
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() ? error.message.trim() : '';
}

function createEmptyDraft(): CreateRealmAgentDraftInput {
  return {
    handle: '',
    displayName: '',
    concept: '',
    description: '',
    ruleText: '',
    selectedWorldId: '',
    dnaPrimary: '',
    dnaSecondary: [],
    referenceImageUrl: '',
    originalDescription: '',
  };
}

function worldOptionLabel(world: SelectableRealmWorld): string {
  return world.type ? `${world.name} 路 ${world.type}` : world.name;
}

function sourceModeIcon(mode: AgentCreationGraphSourceMode): ReactNode {
  if (mode === 'manual') return <PencilLine size={30} strokeWidth={1.8} />;
  if (mode === 'downloaded-character-card') return <FileUp size={30} strokeWidth={1.8} />;
  if (mode === 'existing-agent-remix') return <Users size={30} strokeWidth={1.8} />;
  return <Sparkles size={30} strokeWidth={1.8} />;
}

function directionToneTags(draft: CreateRealmAgentDraftInput): string[] {
  const normalized = normalizeCreateRealmAgentDraft(draft);
  if (normalized.dnaSecondary.length > 0) return normalized.dnaSecondary.slice(0, 3);
  if (normalized.dnaPrimary) return [normalized.dnaPrimary];
  return ['owner-reviewed'];
}

function buildDirections(draft: CreateRealmAgentDraftInput, seedResult: AgentSeedGenerationResult | null): DraftDirection[] {
  const normalized = normalizeCreateRealmAgentDraft(draft);
  const baseName = normalized.displayName || 'Untitled Realm Agent';
  const baseSummary = normalized.concept || normalized.originalDescription || normalized.description || 'Owner-provided public Agent IP direction.';
  const baseDescription = normalized.description || normalized.concept || normalized.originalDescription || '';
  const base: DraftDirection = {
    id: 'selected',
    labelKey: seedResult?.ok ? 'create.draft.direction.generated' : 'create.draft.direction.local',
    sourceLabelKey: seedResult?.ok ? 'create.draft.aiCandidate' : 'create.draft.localDraft',
    displayName: baseName,
    identitySummary: baseSummary,
    dnaPrimary: normalized.dnaPrimary,
    toneTags: directionToneTags(draft),
    behaviorBoundary: normalized.ruleText || 'Public behavior stays owner-reviewed; private LocalAgent memory is excluded.',
    publicDescription: baseDescription,
  };

  const directions = [
    base,
    {
      ...base,
      id: 'public-ip',
      labelKey: 'create.draft.direction.publicIp',
      sourceLabelKey: 'create.draft.localDraft',
      identitySummary: `${baseSummary} The public profile emphasizes durable Realm presence and clear owner boundaries.`,
      behaviorBoundary: 'Keep public-facing behavior explicit, reviewable, and separated from runtime-private state.',
    },
    {
      ...base,
      id: 'content-ready',
      labelKey: 'create.draft.direction.contentReady',
      sourceLabelKey: 'create.draft.localDraft',
      publicDescription: baseDescription || baseSummary,
      behaviorBoundary: 'Defer first post, content voice, visual identity, and voice demo to Cockpit after creation.',
    },
  ] satisfies DraftDirection[];
  return directions.slice(0, 3);
}

function applyDirectionToDraft(direction: DraftDirection, current: CreateRealmAgentDraftInput): CreateRealmAgentDraftInput {
  return {
    ...current,
    displayName: direction.displayName,
    concept: direction.identitySummary,
    description: direction.publicDescription || direction.identitySummary,
    dnaPrimary: direction.dnaPrimary || current.dnaPrimary,
    ruleText: '',
    referenceImageUrl: '',
  };
}

function createHandleCandidate(draft: CreateRealmAgentDraftInput, sourceMode: AgentCreationGraphSourceMode): string {
  const normalized = normalizeCreateRealmAgentDraft(draft);
  const source = normalized.displayName || normalized.description || normalized.originalDescription || sourceMode;
  return createRealmAgentHandleCandidate(source);
}

function statusTone(status: ReviewStatus): 'success' | 'warning' | 'danger' {
  if (status === 'accepted') return 'success';
  if (status === 'blocked') return 'danger';
  return 'warning';
}

function statusLabelKey(status: ReviewStatus): StudioCopyKey {
  if (status === 'accepted') return 'create.review.status.accepted';
  if (status === 'blocked') return 'create.review.status.blocked';
  return 'create.review.status.needsReview';
}

function TechnicalDetails({ children }: { children: ReactNode }) {
  const { t } = useStudioI18n();
  return (
    <details className="ras-technical-details">
      <summary>{t('create.technicalDetails')}</summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

export function CreateRealmAgentWorkspace({ onCreated, onOpenCreatedAgent }: CreateRealmAgentWorkspaceProps) {
  const { t } = useStudioI18n();
  const [step, setStep] = useState<CreateStep>('source');
  const [sourceMode, setSourceMode] = useState<AgentCreationGraphSourceMode>('description');
  const [seedDescription, setSeedDescription] = useState<string>('');
  const [seedResult, setSeedResult] = useState<AgentSeedGenerationResult | null>(null);
  const [isGeneratingSeed, setIsGeneratingSeed] = useState(false);
  const [isImportingCharacterCard, setIsImportingCharacterCard] = useState(false);
  const [isCharacterCardDragActive, setIsCharacterCardDragActive] = useState(false);
  const [characterCardImportResult, setCharacterCardImportResult] = useState<CharacterCardImportResult | null>(null);
  const [graphSourceFields, setGraphSourceFields] = useState<AgentCreationGraphSourceField[]>([]);
  const [draft, setDraft] = useState<CreateRealmAgentDraftInput>(() => createEmptyDraft());
  const [graphAcceptedFingerprint, setGraphAcceptedFingerprint] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<RealmAgentCreateWithProfileSettingsResult | null>(null);
  const [createdContext, setCreatedContext] = useState<CreatedRealmAgentContext | null>(null);
  const [localSubmitErrors, setLocalSubmitErrors] = useState<string[]>([]);
  const [manualContinueAttempted, setManualContinueAttempted] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [imagePromptEdited, setImagePromptEdited] = useState(false);
  const [isGeneratingReference, setIsGeneratingReference] = useState(false);
  const [referenceImageResult, setReferenceImageResult] = useState<AgentReferenceImageResult | null>(null);
  const queryClient = useQueryClient();

  const worldsQuery = useQuery({
    queryKey: ['realm-agent-studio', 'create-agent-worlds'],
    queryFn: () => listCreateRealmAgentSelectableWorlds(),
  });
  const remixAgentsQuery = useQuery({
    queryKey: ['realm-agent-studio', 'create-agent-remix-agents'],
    queryFn: () => listOwnerPortfolioAgents(),
    enabled: sourceMode === 'existing-agent-remix',
  });
  const worlds = worldsQuery.data || [];
  const selectableWorldIds = useMemo(() => worlds.map((world) => world.id), [worlds]);
  const oasisWorld = useMemo(() => selectOasisDefaultWorld(worlds), [worlds]);
  const selectedWorld = worlds.find((world) => world.id === draft.selectedWorldId) || null;
  const normalizedDraft = useMemo(() => normalizeCreateRealmAgentDraft(draft), [draft]);
  const activeSourceModeOption = SOURCE_MODE_OPTIONS.find((option) => option.mode === sourceMode) ?? {
    mode: 'description' as const,
    titleKey: 'create.source.description.title' as const,
    descriptionKey: 'create.source.description.description' as const,
  };
  const sourcePanelTitle = sourceMode === 'description'
    ? t('create.aiStartTitle')
    : t(activeSourceModeOption.titleKey);
  const sourcePanelDescription = sourceMode === 'description'
    ? t('create.aiStartDescription')
    : t(activeSourceModeOption.descriptionKey);

  const worldPreviewQuery = useQuery({
    queryKey: ['realm-agent-studio', 'create-agent-world-preview', draft.selectedWorldId],
    queryFn: () => getCreateRealmAgentWorldPreview(draft.selectedWorldId),
    enabled: draft.selectedWorldId.length > 0 && Boolean(selectedWorld),
  });
  const handleAvailabilityQuery = useQuery<RealmAgentHandleAvailabilityResult>({
    queryKey: ['realm-agent-studio', 'create-agent-handle-availability', normalizedDraft.handle],
    queryFn: () => checkCreateRealmAgentHandleAvailability(normalizedDraft.handle),
    enabled: normalizedDraft.handle.length > 0,
  });
  const handleAvailability = handleAvailabilityQuery.data?.ok ? handleAvailabilityQuery.data.availability : null;

  const creationGraph = useMemo(() => buildAgentCreationGraphFromDraft(draft, {
    sourceMode,
    sourceLabel: characterCardImportResult?.ok
      ? characterCardImportResult.card.data.name
      : draft.originalDescription || seedDescription || agentCreationGraphSourceModeLabel(sourceMode),
    runtimeRationale: seedResult?.ok ? seedResult.rationale : '',
    extraSourceFields: graphSourceFields,
    acceptedForCreateFingerprint: graphAcceptedFingerprint,
  }), [characterCardImportResult, draft, graphAcceptedFingerprint, graphSourceFields, seedDescription, seedResult, sourceMode]);
  const creationGraphReview = useMemo(
    () => validateAgentCreationGraphForRealmCreate(creationGraph, graphAcceptedFingerprint),
    [creationGraph, graphAcceptedFingerprint],
  );
  const directions = useMemo(() => buildDirections(draft, seedResult), [draft, seedResult]);
  const readiness = validateCreateRealmAgentReadiness(draft, { selectableWorldIds, handleAvailability });
  const defaultReferenceImagePrompt = useMemo(() => defaultReferenceImagePromptFromDraft({
    description: normalizedDraft.description,
    displayName: normalizedDraft.displayName,
    concept: normalizedDraft.concept,
    dnaPrimary: normalizedDraft.dnaPrimary,
  }), [normalizedDraft.concept, normalizedDraft.description, normalizedDraft.displayName, normalizedDraft.dnaPrimary]);
  const referencePreviewUrl = referenceImageResult?.ok
    ? referenceImageResult.previewUrl || referenceImageResult.referenceImageUrl
    : normalizedDraft.referenceImageUrl;
  const confirmPreviewFields = useMemo<ConfirmPreviewField[]>(() => [
    {
      key: 'displayName',
      labelKey: 'create.preview.field.displayName',
      value: normalizedDraft.displayName || t('common.notSet'),
      emphasized: true,
    },
    {
      key: 'handle',
      labelKey: 'create.preview.field.handle',
      value: normalizedDraft.handle ? `@${normalizedDraft.handle}` : t('common.notSet'),
      emphasized: true,
    },
    {
      key: 'world',
      labelKey: 'create.preview.field.world',
      value: selectedWorld?.name || t('common.notSet'),
    },
    {
      key: 'archetype',
      labelKey: 'create.preview.field.archetype',
      value: normalizedDraft.dnaPrimary || t('common.notSet'),
    },
    {
      key: 'description',
      labelKey: 'create.preview.field.description',
      value: normalizedDraft.description || normalizedDraft.concept || t('common.notSet'),
    },
    ...(normalizedDraft.referenceImageUrl ? [{
      key: 'referenceImage',
      labelKey: 'create.preview.field.referenceImage' as const,
      value: normalizedDraft.referenceImageUrl,
    }] : []),
  ], [normalizedDraft, selectedWorld, t]);

  useEffect(() => {
    if (!draft.selectedWorldId && oasisWorld) {
      setDraft((current) => current.selectedWorldId ? current : { ...current, selectedWorldId: oasisWorld.id });
    }
  }, [draft.selectedWorldId, oasisWorld]);

  useEffect(() => {
    if (!imagePromptEdited) {
      setImagePrompt(defaultReferenceImagePrompt);
    }
  }, [defaultReferenceImagePrompt, imagePromptEdited]);

  useEffect(() => {
    if (!createdContext || !onOpenCreatedAgent) return undefined;
    const openTimer = window.setTimeout(() => {
      onOpenCreatedAgent(createdContext.agentId, 'launch');
    }, 1600);
    return () => window.clearTimeout(openTimer);
  }, [createdContext, onOpenCreatedAgent]);

  function resetOutcome() {
    setLocalSubmitErrors([]);
    setManualContinueAttempted(false);
    setSubmitResult(null);
    setCreatedContext(null);
  }

  function resetSourceArtifacts(nextMode: AgentCreationGraphSourceMode) {
    setSourceMode(nextMode);
    setSeedResult(null);
    setCharacterCardImportResult(null);
    setGraphSourceFields([]);
    setGraphAcceptedFingerprint(null);
    setLocalSubmitErrors([]);
    setSubmitResult(null);
    setCreatedContext(null);
    setImagePromptEdited(false);
    setReferenceImageResult(null);
  }

  function selectSourceMode(nextMode: AgentCreationGraphSourceMode) {
    if (nextMode === sourceMode) return;
    resetSourceArtifacts(nextMode);
    if (nextMode === 'manual') {
      setDraft((current) => ({
        ...current,
        originalDescription: 'Manual entry',
      }));
    }
  }

  function invalidateReview(_keys: ReviewFieldKey[]) {
    void _keys;
    setGraphAcceptedFingerprint(null);
    resetOutcome();
  }

  function updateDraft(patch: Partial<CreateRealmAgentDraftInput>, keys: ReviewFieldKey[]) {
    setDraft((current) => ({ ...current, ...patch }));
    invalidateReview(keys);
  }

  async function runSeedGeneration() {
    setIsGeneratingSeed(true);
    setSeedResult(null);
    invalidateReview(['handle', 'displayName', 'description', 'dnaPrimary']);
    try {
      const result = await generateAgentSeedFromDescription(seedDescription);
      setSeedResult(result);
      if (result.ok) {
        setDraft((current) => ({
          ...current,
          handle: result.seed.handle || current.handle,
          displayName: result.seed.displayName || current.displayName,
          concept: result.seed.concept || current.concept,
          description: result.seed.description || current.description,
          ruleText: '',
          dnaPrimary: result.seed.dnaPrimary || current.dnaPrimary,
          dnaSecondary: result.seed.dnaSecondary.length > 0 ? result.seed.dnaSecondary : current.dnaSecondary,
          referenceImageUrl: '',
          originalDescription: seedDescription.trim(),
        }));
        setImagePromptEdited(false);
        setReferenceImageResult(null);
        setStep('draft');
      }
    } finally {
      setIsGeneratingSeed(false);
    }
  }

  function continueManualEntry() {
    setManualContinueAttempted(true);
    if (!allRequiredAccepted || !creationGraphReview.canAccept) return;
    continueToConfirm();
  }

  async function importCharacterCardFile(file: File | null) {
    if (!file) return;
    setIsCharacterCardDragActive(false);
    resetSourceArtifacts('downloaded-character-card');
    setIsImportingCharacterCard(true);
    try {
      const result = await parseDownloadedCharacterCardFile(file);
      setCharacterCardImportResult(result);
      if (result.ok) {
        setGraphSourceFields(mapCharacterCardToGraphSourceFields(result.card));
        setDraft((current) => ({
          ...current,
          ...mapCharacterCardToCreateDraft(result.card),
        }));
        setImagePromptEdited(false);
        setReferenceImageResult(null);
        invalidateReview(['handle', 'displayName', 'description', 'dnaPrimary']);
        setStep('draft');
      }
    } finally {
      setIsImportingCharacterCard(false);
    }
  }

  function handleCharacterCardDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (isImportingCharacterCard) return;
    const file = event.dataTransfer.files?.[0] || null;
    void importCharacterCardFile(file);
  }

  function remixFromAgent(agent: OwnerPortfolioAgent) {
    resetSourceArtifacts('existing-agent-remix');
    const baseDescription = [
      agent.displayName,
      agent.worldName ? `World: ${agent.worldName}` : '',
      agent.realmState ? `Realm state: ${agent.realmState}` : '',
    ].filter(Boolean).join('\n');
    const nextDraft = {
      ...createEmptyDraft(),
      handle: createHandleCandidate({
        ...createEmptyDraft(),
        displayName: `${agent.handle} remix`,
        description: baseDescription,
      }, 'existing-agent-remix'),
      displayName: `${agent.displayName} Remix`,
      concept: baseDescription || `Public remix direction from @${agent.handle}.`,
      description: baseDescription || agent.displayName,
      selectedWorldId: draft.selectedWorldId,
      originalDescription: `Existing owned Realm Agent: @${agent.handle}`,
    };
    setDraft(nextDraft);
    setImagePromptEdited(false);
    setReferenceImageResult(null);
    setGraphSourceFields([
      {
        key: 'remix.agent',
        label: 'Existing owned Realm Agent',
        value: `@${agent.handle} / ${agent.displayName}`,
        status: 'mapped',
        targetSection: 'sourceProvenance',
      },
      ...(agent.worldName ? [{
        key: 'remix.world',
        label: 'Source agent world',
        value: agent.worldName,
        status: 'candidateOnly' as const,
        targetSection: 'worldview' as const,
      }] : []),
    ]);
    invalidateReview(['handle', 'displayName', 'description', 'dnaPrimary']);
    setStep('draft');
  }

  function selectDirection(direction: DraftDirection) {
    setDraft((current) => applyDirectionToDraft(direction, current));
    setImagePromptEdited(false);
    setReferenceImageResult(null);
    invalidateReview(['displayName', 'description', 'dnaPrimary']);
    setStep('review');
  }

  async function generateReferenceImageCandidate() {
    setIsGeneratingReference(true);
    setReferenceImageResult(null);
    resetOutcome();
    try {
      const result = await generateAgentReferenceImage({
        prompt: imagePrompt,
        aspectRatio: '1:1',
      });
      setReferenceImageResult(result);
      if (result.ok) {
        updateDraft({ referenceImageUrl: result.referenceImageUrl }, []);
      }
    } finally {
      setIsGeneratingReference(false);
    }
  }

  function clearReferenceImageCandidate() {
    setReferenceImageResult(null);
    updateDraft({ referenceImageUrl: '' }, []);
  }

  function regenerateField(field: ReviewFieldKey) {
    if (field === 'handle') {
      updateDraft({ handle: createHandleCandidate(draft, sourceMode) }, ['handle']);
      return;
    }
    if (field === 'displayName') {
      const next = directions[1]?.displayName && directions[1].displayName !== draft.displayName
        ? directions[1].displayName
        : `${draft.displayName || 'Realm Agent'} Studio`;
      updateDraft({ displayName: next }, ['displayName']);
      return;
    }
    if (field === 'description') {
      const next = directions[1]?.publicDescription
        || directions[1]?.identitySummary
        || directions[0]?.publicDescription
        || directions[0]?.identitySummary
        || draft.description;
      updateDraft({ description: next, concept: directions[0]?.identitySummary || next }, ['description']);
      return;
    }
    if (field === 'dnaPrimary') {
      const currentIndex = DNA_PRIMARY_ARCHETYPES.indexOf(normalizedDraft.dnaPrimary as DnaPrimaryArchetype);
      const next = currentIndex >= 0
        ? DNA_PRIMARY_ARCHETYPES[(currentIndex + 1) % DNA_PRIMARY_ARCHETYPES.length]
        : (directions[0]?.dnaPrimary || 'MYSTERIOUS');
      updateDraft({ dnaPrimary: next }, ['dnaPrimary']);
      return;
    }
    if (field === 'world' && oasisWorld) {
      updateDraft({ selectedWorldId: oasisWorld.id }, ['world']);
    }
  }

  function reviewStatus(field: ReviewFieldKey): ReviewStatus {
    if (field === 'handle') {
      if (!normalizedDraft.handle || handleAvailabilityQuery.isError || (handleAvailability && !handleAvailability.available)) return 'blocked';
      if (handleAvailabilityQuery.isLoading || handleAvailabilityQuery.isFetching || !handleAvailability) return 'needs-review';
      return 'accepted';
    }
    if (field === 'displayName') return normalizedDraft.displayName ? 'accepted' : 'blocked';
    if (field === 'description') return normalizedDraft.description ? 'accepted' : 'blocked';
    if (field === 'dnaPrimary') return normalizedDraft.dnaPrimary ? 'accepted' : 'blocked';
    if (field === 'world') {
      if (worldsQuery.isLoading) return 'needs-review';
      if (!normalizedDraft.selectedWorldId || worldsQuery.isError || !selectedWorld) return 'blocked';
      return 'accepted';
    }
    return 'blocked';
  }

  function reviewIssue(field: ReviewFieldKey): string | null {
    if (field === 'handle') {
      if (!normalizedDraft.handle) return t('create.error.handleMissing');
      if (handleAvailabilityQuery.isLoading || handleAvailabilityQuery.isFetching) return t('create.review.issue.handleChecking');
      if (handleAvailabilityQuery.isError) return t('create.error.handleAvailabilityFailed');
      if (handleAvailability && !handleAvailability.available) {
        return translateCreateFixedMessage(`handle unavailable: ${handleAvailability.message}`, t);
      }
      if (!handleAvailability) return t('create.error.handleAvailabilityMissing');
      return null;
    }
    if (field === 'displayName') return normalizedDraft.displayName ? null : t('create.error.displayNameMissing');
    if (field === 'description') return normalizedDraft.description ? null : t('create.error.conceptMissing');
    if (field === 'dnaPrimary') return normalizedDraft.dnaPrimary ? null : t('create.error.dnaPrimaryMissing');
    if (field === 'world') {
      if (worldsQuery.isLoading) return t('create.review.issue.worldLoading');
      if (worldsQuery.isError) return t('create.worldSelectionUnavailable', { message: errorMessage(worldsQuery.error) });
      if (!normalizedDraft.selectedWorldId) return t('create.error.selectedWorldMissing');
      if (!selectedWorld) return t('create.error.selectedWorldNotSourceBacked');
    }
    return null;
  }

  const reviewFields: ReviewField[] = [
    {
      key: 'handle',
      labelKey: REVIEW_LABEL_KEYS.handle,
      status: reviewStatus('handle'),
      reasonKey: handleAvailability?.available ? 'create.review.reason.handleChecked' : 'create.review.reason.handleBlocked',
      issue: reviewIssue('handle'),
    },
    {
      key: 'displayName',
      labelKey: REVIEW_LABEL_KEYS.displayName,
      status: reviewStatus('displayName'),
      reasonKey: normalizedDraft.displayName ? 'create.review.reason.ownerVisible' : 'create.review.reason.missing',
      issue: reviewIssue('displayName'),
    },
    {
      key: 'description',
      labelKey: REVIEW_LABEL_KEYS.description,
      status: reviewStatus('description'),
      reasonKey: normalizedDraft.description ? 'create.review.reason.ownerVisible' : 'create.review.reason.missing',
      issue: reviewIssue('description'),
    },
    {
      key: 'dnaPrimary',
      labelKey: REVIEW_LABEL_KEYS.dnaPrimary,
      status: reviewStatus('dnaPrimary'),
      reasonKey: normalizedDraft.dnaPrimary ? 'create.review.reason.ownerVisible' : 'create.review.reason.missing',
      issue: reviewIssue('dnaPrimary'),
    },
    {
      key: 'world',
      labelKey: REVIEW_LABEL_KEYS.world,
      status: reviewStatus('world'),
      reasonKey: selectedWorld ? 'create.review.reason.worldSourceBacked' : 'create.review.reason.worldBlocked',
      issue: reviewIssue('world'),
    },
  ];

  const allRequiredAccepted = reviewFields.every((field) => field.status === 'accepted');
  const createMutation = useMutation<RealmAgentCreateWithProfileSettingsResult, Error, ReviewedCreateRealmAgentPayload>({
    mutationFn: (payload) => createReviewedRealmAgentWithProfileSettings(payload),
    onSuccess: (result) => {
      setSubmitResult(result);
      if (result.ok) {
        const currentDraft = normalizeCreateRealmAgentDraft(draft);
        const context: CreatedRealmAgentContext = {
          agentId: result.canonical.id,
          state: result.canonical.state || null,
          handle: currentDraft.handle,
          displayName: currentDraft.displayName,
          selectedWorldId: currentDraft.selectedWorldId,
        };
        setCreatedContext(context);
        setLocalSubmitErrors([]);
        onCreated?.(context);
        void queryClient.invalidateQueries({ queryKey: ['realm-agent-studio', 'owner-portfolio'] });
      }
    },
  });
  const createDisabled = createMutation.isPending
    || !readiness.ready
    || !allRequiredAccepted
    || !creationGraphReview.ready
    || Boolean(normalizedDraft.handle && (handleAvailabilityQuery.isLoading || handleAvailabilityQuery.isError || !handleAvailability?.available));

  function continueToConfirm() {
    if (!allRequiredAccepted || !creationGraphReview.canAccept) return;
    setGraphAcceptedFingerprint(acceptAgentCreationGraphForRealmCreate(creationGraph));
    setStep('confirm');
  }

  function submitCreate() {
    if (!allRequiredAccepted || !creationGraphReview.ready) {
      setLocalSubmitErrors([
        ...reviewFields.filter((field) => field.status !== 'accepted').map((field) => t(field.labelKey)),
        ...creationGraphReview.errors,
      ]);
      return;
    }
    const nextReadiness = validateCreateRealmAgentReadiness(draft, { selectableWorldIds, handleAvailability });
    if (!nextReadiness.ready) {
      setLocalSubmitErrors(nextReadiness.errors);
      return;
    }
    setLocalSubmitErrors([]);
    setSubmitResult(null);
    createMutation.mutate(nextReadiness.payload);
  }

  function resetCreateWorkflow() {
    setStep('source');
    setSourceMode('description');
    setSeedDescription('');
    setSeedResult(null);
    setIsGeneratingSeed(false);
    setIsImportingCharacterCard(false);
    setIsCharacterCardDragActive(false);
    setCharacterCardImportResult(null);
    setGraphSourceFields([]);
    setDraft(createEmptyDraft());
    setGraphAcceptedFingerprint(null);
    setSubmitResult(null);
    setCreatedContext(null);
    setLocalSubmitErrors([]);
    setManualContinueAttempted(false);
    setImagePrompt('');
    setImagePromptEdited(false);
    setIsGeneratingReference(false);
    setReferenceImageResult(null);
  }

  function renderSourceModePanel() {
    if (sourceMode === 'description') {
      return (
        <>
          <div className="ras-create-prompt-field">
            <TextareaField
              aria-label={t('create.oneLineLabel')}
              className="ras-create-prompt-field__shell"
              textareaClassName="ras-create-prompt-field__textarea"
              value={seedDescription}
              placeholder={t('create.oneLinePlaceholder')}
              onChange={(event) => setSeedDescription(event.currentTarget.value)}
            />
            <button
              type="button"
              className="ras-create-prompt-field__submit"
              disabled={!seedDescription.trim() || isGeneratingSeed}
              aria-label={t('create.generateFromDescription')}
              onClick={() => void runSeedGeneration()}
            >
              {isGeneratingSeed ? (
                <RefreshCw className="ras-create-prompt-field__spinner" size={22} strokeWidth={2} />
              ) : (
                <ArrowUp size={24} strokeWidth={2.2} />
              )}
            </button>
          </div>
          {seedResult && !seedResult.ok ? <InlineAlert tone="danger">{t('create.seedGenerationFailed', { message: seedResult.message })}</InlineAlert> : null}
        </>
      );
    }

    if (sourceMode === 'manual') {
      return (
        <>
          <InlineAlert tone="neutral">{t('create.manualEntryDescription')}</InlineAlert>
          {renderManualEntryTable()}
          <div className="ras-create-primary-panel__footer">
            <strong>{t('create.review.autosavedProgress', { count: reviewFields.filter((field) => field.status === 'accepted').length, total: reviewFields.length })}</strong>
            <Button tone="primary" trailingIcon={<ArrowRight size={16} strokeWidth={1.9} />} onClick={continueManualEntry}>
              {t('create.review.continueConfirm')}
            </Button>
          </div>
        </>
      );
    }

    if (sourceMode === 'downloaded-character-card') {
      return (
        <>
          <div className="ras-create-character-card-field">
            <label
              className="ras-create-character-card-dropzone"
              data-drag-active={isCharacterCardDragActive || undefined}
              data-disabled={isImportingCharacterCard || undefined}
              onDragEnter={(event) => {
                event.preventDefault();
                if (!isImportingCharacterCard) setIsCharacterCardDragActive(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (!isImportingCharacterCard) setIsCharacterCardDragActive(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                setIsCharacterCardDragActive(false);
              }}
              onDrop={handleCharacterCardDrop}
            >
              <input
                className="ras-create-character-card-dropzone__input"
                type="file"
                accept=".json,.png,application/json,image/png"
                aria-label={t('create.characterCardDropzoneTitle')}
                disabled={isImportingCharacterCard}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] || null;
                  void importCharacterCardFile(file);
                  event.currentTarget.value = '';
                }}
              />
              <span className="ras-create-character-card-dropzone__icon" aria-hidden="true">
                <ImageIcon size={48} strokeWidth={1.75} />
              </span>
              <span className="ras-create-character-card-dropzone__title">{t('create.characterCardDropzoneTitle')}</span>
            </label>
            <p className="ras-create-character-card-field__message">{t('create.characterCardFieldMessage')}</p>
          </div>
          {isImportingCharacterCard ? <InlineAlert tone="info">{t('create.importingCharacterCard')}</InlineAlert> : null}
          {characterCardImportResult && !characterCardImportResult.ok ? <InlineAlert tone="danger">{t('create.characterCardImportFailed', { message: characterCardImportResult.message })}</InlineAlert> : null}
          {characterCardImportResult?.ok ? <InlineAlert tone="success">{t('create.characterCardImported', { name: characterCardImportResult.card.data.name, format: characterCardImportResult.card.sourceFormat.toUpperCase() })}</InlineAlert> : null}
        </>
      );
    }

    return (
      <>
        <InlineAlert tone="neutral">{t('create.remix.boundary')}</InlineAlert>
        {remixAgentsQuery.isLoading ? <EmptyState title={t('create.remix.loadingTitle')} description={t('create.remix.loadingDescription')} /> : null}
        {remixAgentsQuery.isError ? <InlineAlert tone="danger">{t('create.remix.unavailable')}</InlineAlert> : null}
        {remixAgentsQuery.data && remixAgentsQuery.data.length > 0 ? (
          <div className="ras-create-source-list">
            {remixAgentsQuery.data.map((agent) => (
              <article key={agent.id} className="ras-create-source-list__item">
                <div>
                  <strong>{agent.displayName}</strong>
                  <span>@{agent.handle}</span>
                </div>
                <Button tone="secondary" size="sm" onClick={() => remixFromAgent(agent)}>{t('create.remix.use')}</Button>
              </article>
            ))}
          </div>
        ) : null}
      </>
    );
  }

  function renderManualEntryTable() {
    const showValidation = manualContinueAttempted;
    return (
      <div className="ras-create-manual-table" aria-label={t('create.manualEntryTitle')}>
        {reviewFields.map((field) => (
          <div key={field.key} className="ras-create-manual-row" data-status={showValidation ? field.status : undefined}>
            <div className="ras-create-manual-row__label">
              <strong>{t(field.labelKey)}</strong>
              <span>{t(field.reasonKey)}</span>
            </div>
            <div className="ras-create-manual-row__editor">
              {renderReviewEditor(field, { showValidation })}
              {showValidation && field.issue ? <InlineAlert tone={field.status === 'needs-review' ? 'warning' : 'danger'}>{field.issue}</InlineAlert> : null}
            </div>
            {showValidation ? <StatusBadge tone={statusTone(field.status)}>{t(statusLabelKey(field.status))}</StatusBadge> : null}
          </div>
        ))}
        {showValidation && !creationGraphReview.canAccept && creationGraphReview.errors.length > 0 ? (
          <InlineAlert tone="danger">{creationGraphReview.errors.join('; ')}</InlineAlert>
        ) : null}
      </div>
    );
  }

  function renderReviewEditor(field: ReviewField, options: { showValidation?: boolean } = {}) {
    const invalid = options.showValidation !== false && field.status === 'blocked';
    return (
      <div className="ras-create-review-editor">
        {field.key === 'handle' ? (
          <TextField
            aria-label={t('create.handleLabel')}
            tone={invalid ? 'danger' : 'default'}
            value={draft.handle}
            placeholder={t('create.handlePlaceholder')}
            onChange={(event) => updateDraft({ handle: event.currentTarget.value }, ['handle'])}
          />
        ) : null}
        {field.key === 'displayName' ? (
          <TextField
            aria-label={t('create.displayNameLabel')}
            tone={invalid ? 'danger' : 'default'}
            value={draft.displayName}
            placeholder={t('create.displayNamePlaceholder')}
            onChange={(event) => updateDraft({ displayName: event.currentTarget.value }, ['displayName'])}
          />
        ) : null}
        {field.key === 'description' ? (
          <TextareaField
            aria-label={t('create.profileDescriptionLabel')}
            tone={invalid ? 'danger' : 'default'}
            value={draft.description}
            placeholder={t('create.profileDescriptionPlaceholder')}
            onChange={(event) => updateDraft({ description: event.currentTarget.value, concept: event.currentTarget.value }, ['description'])}
          />
        ) : null}
        {field.key === 'dnaPrimary' ? (
          <SelectField
            aria-label={t('create.dnaPrimaryLabel')}
            value={draft.dnaPrimary}
            placeholder={t('create.dnaPrimaryPlaceholder')}
            options={[{ value: '', label: t('create.dnaPrimaryPlaceholder') }, ...DNA_PRIMARY_ARCHETYPES.map((value) => ({ value, label: value }))]}
            onValueChange={(value) => updateDraft({ dnaPrimary: value as DnaPrimaryArchetype | '' }, ['dnaPrimary'])}
          />
        ) : null}
        {field.key === 'world' ? (
          <SelectField
            aria-label={t('create.worldLabel')}
            disabled={worldsQuery.isLoading || worlds.length === 0}
            value={draft.selectedWorldId}
            placeholder={oasisWorld ? t('create.worldDefault', { name: oasisWorld.name }) : t('create.worldDefaultUnavailable')}
            options={worlds.map((world) => ({ value: world.id, label: worldOptionLabel(world) }))}
            onValueChange={(value) => updateDraft({ selectedWorldId: value }, ['world'])}
          />
        ) : null}
      </div>
    );
  }

  function renderReferenceImagePanel() {
    return (
      <div className="ras-create-reference-panel">
        <div className="ras-create-reference-panel__content">
          <div className="ras-create-reference-panel__header">
            <div>
              <strong>{t('create.referenceTitle')}</strong>
              <p>{t('create.referenceDescription')}</p>
            </div>
            <StatusBadge tone={normalizedDraft.referenceImageUrl ? 'success' : 'neutral'}>
              {normalizedDraft.referenceImageUrl ? t('create.referenceAttached') : t('create.noReferenceYet')}
            </StatusBadge>
          </div>
          <FieldShell label={t('create.imagePromptLabel')} message={t('create.imagePromptMessage')}>
            <TextareaField
              value={imagePrompt}
              rows={3}
              placeholder={defaultReferenceImagePrompt}
              onChange={(event) => {
                setImagePromptEdited(true);
                setImagePrompt(event.currentTarget.value);
              }}
            />
          </FieldShell>
          {referenceImageResult && !referenceImageResult.ok ? (
            <InlineAlert tone="danger">
              {t('create.referenceFailed', { message: translateCreateFixedMessage(referenceImageResult.message, t) })}
            </InlineAlert>
          ) : null}
          <div className="ras-create-reference-panel__actions">
            <Button
              tone="secondary"
              disabled={!imagePrompt.trim() || isGeneratingReference}
              loading={isGeneratingReference}
              leadingIcon={<ImageIcon size={16} strokeWidth={1.9} />}
              onClick={() => void generateReferenceImageCandidate()}
            >
              {normalizedDraft.referenceImageUrl ? t('create.regenerateReference') : t('create.generateReference')}
            </Button>
            {normalizedDraft.referenceImageUrl ? (
              <Button tone="ghost" size="sm" onClick={clearReferenceImageCandidate}>
                {t('create.clearReference')}
              </Button>
            ) : null}
          </div>
        </div>
        <div className="ras-create-reference-preview">
          {referencePreviewUrl ? (
            <img src={referencePreviewUrl} alt={t('create.referenceAlt')} />
          ) : (
            <div>
              <ImageIcon size={28} strokeWidth={1.8} />
              <span>{t('create.noReferenceYet')}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderSourceModeSwitch() {
    return (
      <div className="ras-create-mode-switch" role="tablist" aria-label={t('create.modeSwitch.ariaLabel')}>
        {SOURCE_MODE_SWITCH_OPTIONS.map((option) => {
          const selected = option.mode === sourceMode;
          return (
            <button
              key={option.mode}
              type="button"
              role="tab"
              aria-selected={selected}
              className="ras-create-mode-switch__item"
              data-selected={selected || undefined}
              onClick={() => selectSourceMode(option.mode)}
            >
              {t(option.labelKey)}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Surface tone="panel" padding="lg" className="ras-create-workspace">
      <div className="ras-create-workspace__hero">
        <div>
          <h2 className="m-0 ras-create-workspace__title">{t('create.title')}</h2>
        </div>
      </div>
      {step === 'source' ? (
        <section className="ras-create-stage ras-create-source-landing">
          <div className="ras-create-primary-panel ras-create-ai-panel">
            <div className="ras-create-ai-panel__orb" aria-hidden="true">
              {sourceModeIcon(sourceMode)}
            </div>
            <div className="ras-create-ai-panel__copy">
              <h3>{sourcePanelTitle}</h3>
              <p>{sourcePanelDescription}</p>
            </div>
            {renderSourceModeSwitch()}
            <div className="ras-create-mode-panel">
              {renderSourceModePanel()}
            </div>
          </div>

          <div className="ras-create-source-footer">
            <Lock size={15} strokeWidth={1.8} />
            <span>{t('create.sourceFooter')}</span>
          </div>
        </section>
      ) : null}

      {step === 'draft' ? (
        <section className="ras-create-stage" aria-labelledby="ras-create-draft-heading">
          <div className="ras-create-toolbar">
            <div className="ras-create-toolbar__right">
              {sourceMode === 'description' ? (
                <Button tone="secondary" disabled={!seedDescription.trim() || isGeneratingSeed} loading={isGeneratingSeed} leadingIcon={<RefreshCw size={16} strokeWidth={1.9} />} onClick={() => void runSeedGeneration()}>{t('create.draft.regenerate')}</Button>
              ) : null}
              <Button tone="primary" trailingIcon={<ArrowRight size={16} strokeWidth={1.9} />} onClick={() => setStep('review')}>{t('create.draft.continueReview')}</Button>
            </div>
          </div>
          <h3 id="ras-create-draft-heading" className="ras-create-stage__title">{t('create.step.draft')}</h3>
          <div className="ras-create-direction-grid">
            {directions.map((direction, index) => (
              <article key={direction.id} className="ras-create-direction-card" data-recommended={index === 0 || undefined}>
                <div className="ras-create-direction-card__header">
                  {index === 0 ? <span className="ras-create-recommend">{t('create.reviewRequired')}</span> : null}
                  <h4>{t(direction.labelKey)}</h4>
                  <StatusBadge tone={direction.sourceLabelKey === 'create.draft.aiCandidate' ? 'info' : 'neutral'}>{t(direction.sourceLabelKey)}</StatusBadge>
                </div>
                <dl className="ras-create-direction-card__body">
                  <div><dt>{t('create.draft.displayName')}</dt><dd>{direction.displayName}</dd></div>
                  <div><dt>{t('create.draft.identitySummary')}</dt><dd>{direction.identitySummary}</dd></div>
                  <div><dt>{t('create.draft.dnaPrimary')}</dt><dd>{direction.dnaPrimary || t('common.notSet')}</dd></div>
                  <div><dt>{t('create.draft.toneTags')}</dt><dd>{direction.toneTags.join(' / ')}</dd></div>
                  <div><dt>{t('create.draft.behaviorBoundary')}</dt><dd>{direction.behaviorBoundary}</dd></div>
                  <div><dt>{t('create.draft.publicDescription')}</dt><dd>{direction.publicDescription || t('common.notSet')}</dd></div>
                </dl>
                <Button tone={index === 0 ? 'primary' : 'secondary'} onClick={() => selectDirection(direction)}>{t('create.draft.useDirection')}</Button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {step === 'review' ? (
        <section className="ras-create-stage" aria-labelledby="ras-create-review-heading">
          <div className="ras-create-toolbar">
            <Button tone="ghost" leadingIcon={<ArrowLeft size={16} strokeWidth={1.9} />} onClick={() => setStep(sourceMode === 'manual' ? 'source' : 'draft')}>{t('create.review.backToDraft')}</Button>
            <div className="ras-create-toolbar__right">
              <strong>{t('create.review.autosavedProgress', { count: reviewFields.filter((field) => field.status === 'accepted').length, total: reviewFields.length })}</strong>
              <Button tone="primary" disabled={!allRequiredAccepted || !creationGraphReview.canAccept} trailingIcon={<ArrowRight size={16} strokeWidth={1.9} />} onClick={continueToConfirm}>{t('create.review.continueConfirm')}</Button>
            </div>
          </div>
          <h3 id="ras-create-review-heading" className="ras-create-stage__title">{t('create.step.review')}</h3>
          <div className="ras-create-review-table">
            {reviewFields.map((field) => (
              <div key={field.key} className="ras-create-review-row" data-status={field.status}>
                <div className="ras-create-review-row__content">
                  <div>
                    <div className="ras-create-review-field">
                      <strong>{t(field.labelKey)}</strong>
                      {renderReviewEditor(field)}
                    </div>
                    <div className="ras-text-muted ras-text-size-sm">{t(field.reasonKey)}</div>
                    {field.issue ? <InlineAlert tone={field.status === 'needs-review' ? 'warning' : 'danger'}>{field.issue}</InlineAlert> : null}
                  </div>
                </div>
                <StatusBadge tone={statusTone(field.status)}>{t(statusLabelKey(field.status))}</StatusBadge>
                <div className="ras-create-review-row__actions">
                  <Button tone="ghost" size="sm" onClick={() => regenerateField(field.key)}>{t('create.review.regenerate')}</Button>
                </div>
              </div>
            ))}
          </div>
          {renderReferenceImagePanel()}
          {!creationGraphReview.ready ? (
            <InlineAlert tone={creationGraphReview.canAccept ? 'warning' : 'danger'}>{creationGraphReview.errors.join('; ')}</InlineAlert>
          ) : null}
          <details className="ras-create-later" open={false}>
            <summary><ChevronRight size={17} strokeWidth={1.9} /> {t('create.later.title')}</summary>
            <p className="m-0 mt-2 ras-text-muted ras-text-size-sm">{t('create.later.description')}</p>
            <div className="ras-create-later__grid">
              {['visualBrief', 'voiceBrief', 'firstPost', 'contentVoice'].map((item) => (
                <div key={item} className="ras-create-later__item">
                  <span>{t(`create.later.${item}` as StudioCopyKey)}</span>
                  <StatusBadge tone="neutral">{t('create.later.deferred')}</StatusBadge>
                </div>
              ))}
            </div>
          </details>
        </section>
      ) : null}

      {step === 'confirm' ? (
        <section className="ras-create-stage" aria-labelledby="ras-create-confirm-heading">
          {createdContext && submitResult?.ok ? (
            <div className="ras-create-success-card">
              <span className="ras-create-success-card__icon"><Check size={36} strokeWidth={1.8} /></span>
              <h3 id="ras-create-confirm-heading">{t('create.createdCardTitle')}</h3>
              <p>{t('create.confirm.openingLaunch', { handle: createdContext.handle })}</p>
              <div className="ras-create-success-card__identity">
                <strong>{createdContext.displayName}</strong>
                <span>@{createdContext.handle}</span>
              </div>
              <div className="ras-create-success-card__actions">
                <Button tone="secondary" onClick={resetCreateWorkflow}>{t('create.title')}</Button>
                <Button tone="secondary" onClick={() => onOpenCreatedAgent?.(createdContext.agentId, 'detail')}>{t('create.openCockpit')}</Button>
                <Button tone="primary" onClick={() => onOpenCreatedAgent?.(createdContext.agentId, 'launch')}>{t('create.openLaunch')}</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="ras-create-toolbar">
                <Button tone="ghost" leadingIcon={<ArrowLeft size={16} strokeWidth={1.9} />} onClick={() => setStep('review')}>{t('create.confirm.backToReview')}</Button>
                <Button tone="primary" disabled={createDisabled} loading={createMutation.isPending} leadingIcon={<Sparkles size={16} strokeWidth={2} />} onClick={submitCreate}>{t('create.submit')}</Button>
              </div>
              <h3 id="ras-create-confirm-heading" className="ras-create-stage__title">{t('create.step.confirm')}</h3>
              {!readiness.ready ? <InlineAlert tone="danger">{translateCreateFixedMessages(readiness.errors, t)}</InlineAlert> : null}
              {localSubmitErrors.length > 0 ? <InlineAlert tone="danger">{t('create.validationFailed', { errors: translateCreateFixedMessages(localSubmitErrors, t) })}</InlineAlert> : null}
              {submitResult && !submitResult.ok ? (
                <InlineAlert tone="danger">
                  {t('create.createdPartial', { message: translateCreateFixedMessage(submitResult.message, t), created: submitResult.createdCanonical ? t('create.createdAgentId', { id: submitResult.createdCanonical.id }) : '' })}
                </InlineAlert>
              ) : null}
              <div className="ras-create-confirm-panel">
                <div className="ras-create-confirm-panel__header">
                  <strong>{t('create.confirm.previewTitle')}</strong>
                  <span>{t('create.confirm.previewSubtitle')}</span>
                </div>
                {readiness.ready ? (
                  <div className="ras-create-agent-preview">
                    <div className="ras-create-agent-preview__hero">
                      <div className="ras-create-agent-preview__avatar" aria-hidden="true">
                        {normalizedDraft.referenceImageUrl ? (
                          <img src={normalizedDraft.referenceImageUrl} alt="" />
                        ) : (
                          (normalizedDraft.displayName || normalizedDraft.handle || 'A').slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div>
                        <h4>{normalizedDraft.displayName}</h4>
                        <p>@{normalizedDraft.handle}</p>
                      </div>
                    </div>
                    <div className="ras-create-confirm-list">
                      {confirmPreviewFields.map((field) => (
                        <div key={field.key} className="ras-create-confirm-row" data-emphasized={field.emphasized || undefined}>
                          <span>{t(field.labelKey)}</span>
                          <span>{field.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <EmptyState title={t('create.confirm.blockedTitle')} description={t('create.confirm.blockedDescription')} />}
              </div>
              <TechnicalDetails>
                <pre className="ras-json-preview m-0 max-h-72 overflow-auto rounded-[var(--nimi-radius-field)] border border-[var(--nimi-border-subtle)] bg-[var(--nimi-surface-card)] p-3 text-xs">
                  {JSON.stringify({ graph: creationGraph, readiness }, null, 2)}
                </pre>
              </TechnicalDetails>
            </>
          )}
        </section>
      ) : null}

      {worldsQuery.isError ? <InlineAlert tone="danger"><AlertTriangle size={15} strokeWidth={1.8} /> {t('create.worldSelectionUnavailable', { message: errorMessage(worldsQuery.error) })}</InlineAlert> : null}
      {!worldsQuery.isError && !worldsQuery.isLoading && worlds.length === 0 ? <InlineAlert tone="warning">{t('create.noSelectableWorlds')}</InlineAlert> : null}
      {worldPreviewQuery.isError ? <InlineAlert tone="danger">{t('create.worldPreview.unavailable')}</InlineAlert> : null}
    </Surface>
  );
}
