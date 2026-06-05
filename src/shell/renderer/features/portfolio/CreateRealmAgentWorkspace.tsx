import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState, FieldShell, InlineAlert, SelectField, StatusBadge, Surface, TextareaField, TextField } from '@nimiplatform/kit/ui';
import {
  DNA_PRIMARY_ARCHETYPES,
  DNA_SECONDARY_MAX_RECOMMENDED,
  DNA_SECONDARY_TRAITS,
  normalizeCreateRealmAgentDraft,
  selectOasisDefaultWorld,
  validateCreateRealmAgentReadiness,
  type CreateRealmAgentDraftInput,
  type DnaPrimaryArchetype,
  type DnaSecondaryTrait,
  type NormalizedRealmAgentHandleAvailability,
  type ReviewedCreateRealmAgentPayload,
  type SelectableRealmWorld,
} from './create-agent-draft.js';
import {
  checkCreateRealmAgentHandleAvailability,
  createReviewedRealmAgent,
  getCreateRealmAgentWorldPreview,
  listCreateRealmAgentSelectableWorlds,
  type RealmAgentHandleAvailabilityResult,
  type RealmAgentCreateResult,
} from './portfolio-client.js';
import {
  generateAgentSeedFromDescription,
  type AgentSeedGenerationResult,
} from './agent-seed-generator.js';
import {
  defaultReferenceImagePromptFromDraft,
  generateAgentReferenceImage,
  type AgentReferenceImageResult,
} from './agent-reference-image.js';

export type CreatedRealmAgentContext = {
  agentId: string;
  state: string | null;
  handle: string;
  displayName: string;
  publicBio: string;
  selectedWorldId: string;
  needsPostCreateSettings: boolean;
};

type CreateRealmAgentWorkspaceProps = {
  onCreated?: (context: CreatedRealmAgentContext) => void;
  onOpenCreatedAgent?: (agentId: string, target: 'detail' | 'settings') => void;
};

function createEmptyDraft(): CreateRealmAgentDraftInput {
  return {
    handle: '',
    displayName: '',
    publicBio: '',
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

const DNA_PRIMARY_DESCRIPTIONS: Record<DnaPrimaryArchetype, string> = {
  CARING: 'Warm, nurturing, supportive presence.',
  PLAYFUL: 'Light-hearted, mischievous, fun-loving.',
  INTELLECTUAL: 'Curious, analytical, learning-driven.',
  CONFIDENT: 'Assertive, decisive, takes initiative.',
  MYSTERIOUS: 'Reserved, introspective, layered.',
  ROMANTIC: 'Emotionally expressive, idealistic.',
};

const DNA_SECONDARY_DESCRIPTIONS: Record<DnaSecondaryTrait, string> = {
  HUMOROUS: 'Quick wit and timing.',
  SARCASTIC: 'Dry, ironic edge.',
  GENTLE: 'Soft tone, measured words.',
  DIRECT: 'Plain-speaking, gets to the point.',
  OPTIMISTIC: 'Sees the upside.',
  REALISTIC: 'Grounded expectations.',
  DRAMATIC: 'Big emotional swings.',
  PASSIONATE: 'Intense investment.',
  REBELLIOUS: 'Pushes against norms.',
  INNOCENT: 'Earnest, sincere outlook.',
  WISE: 'Reflective, perspective-bringing.',
  ECCENTRIC: 'Unusual angles and references.',
};

function worldOptionLabel(world: SelectableRealmWorld): string {
  const type = world.type ? ` · ${world.type}` : '';
  return `${world.name}${type}`;
}

function TechnicalReviewDetails({ children }: { children: ReactNode }) {
  return (
    <details className="ras-technical-details">
      <summary>Create request technical details</summary>
      <div className="mt-3">
        {children}
      </div>
    </details>
  );
}

function ReadinessPreview({
  draft,
  selectableWorldIds,
  handleAvailability,
}: {
  draft: CreateRealmAgentDraftInput;
  selectableWorldIds: string[];
  handleAvailability: NormalizedRealmAgentHandleAvailability | null;
}) {
  const normalizedDraft = normalizeCreateRealmAgentDraft(draft);
  const readiness = validateCreateRealmAgentReadiness(draft, { selectableWorldIds, handleAvailability });

  return (
    <div className="grid gap-4">
      <Surface tone="card" padding="md">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-medium">Visible public fields before submit</div>
          <StatusBadge tone="info">local draft</StatusBadge>
        </div>
        <dl className="mt-3 grid gap-2 text-[length:var(--nimi-type-body-sm-size)]">
          <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
            <dt className="text-[var(--nimi-text-muted)]">Handle</dt>
            <dd className="ras-break-anywhere m-0">@{normalizedDraft.handle || 'not set'}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
            <dt className="text-[var(--nimi-text-muted)]">Display name</dt>
            <dd className="ras-break-anywhere m-0">{normalizedDraft.displayName || 'not set'}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
            <dt className="text-[var(--nimi-text-muted)]">Public bio</dt>
            <dd className="ras-break-anywhere m-0">{normalizedDraft.publicBio || 'not set'}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[140px_1fr]">
            <dt className="text-[var(--nimi-text-muted)]">World ID</dt>
            <dd className="ras-break-anywhere m-0">{normalizedDraft.selectedWorldId || 'not set'}</dd>
          </div>
        </dl>
      </Surface>

      {readiness.ready ? null : (
        <InlineAlert tone="warning">{readiness.errors.join('; ')}</InlineAlert>
      )}
      <TechnicalReviewDetails>
        <pre className="ras-json-preview m-0 min-h-56 overflow-auto rounded-[var(--nimi-radius-field)] border border-[var(--nimi-border-subtle)] bg-[var(--nimi-surface-card)] p-3 text-xs">
          {readiness.payload ? JSON.stringify(readiness.payload, null, 2) : 'Complete handle, display name, concept, and selected world to preview the reviewed create request.'}
        </pre>
      </TechnicalReviewDetails>
    </div>
  );
}

type CreateStage = 'seed' | 'edit';

export function CreateRealmAgentWorkspace({ onCreated, onOpenCreatedAgent }: CreateRealmAgentWorkspaceProps) {
  const [stage, setStage] = useState<CreateStage>('seed');
  const [seedDescription, setSeedDescription] = useState<string>('');
  const [seedResult, setSeedResult] = useState<AgentSeedGenerationResult | null>(null);
  const [isGeneratingSeed, setIsGeneratingSeed] = useState(false);
  const [referenceImagePrompt, setReferenceImagePrompt] = useState<string>('');
  const [referenceImageResult, setReferenceImageResult] = useState<AgentReferenceImageResult | null>(null);
  const [isGeneratingReferenceImage, setIsGeneratingReferenceImage] = useState(false);
  const [draft, setDraft] = useState<CreateRealmAgentDraftInput>(() => createEmptyDraft());
  const [submitResult, setSubmitResult] = useState<RealmAgentCreateResult | null>(null);
  const [createdContext, setCreatedContext] = useState<CreatedRealmAgentContext | null>(null);
  const [localSubmitErrors, setLocalSubmitErrors] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const worldsQuery = useQuery({
    queryKey: ['realm-agent-studio', 'create-agent-worlds'],
    queryFn: () => listCreateRealmAgentSelectableWorlds(),
  });

  const worlds = worldsQuery.data || [];
  const selectableWorldIds = useMemo(() => worlds.map((world) => world.id), [worlds]);
  const oasisWorld = useMemo(() => selectOasisDefaultWorld(worlds), [worlds]);
  const selectedWorld = worlds.find((world) => world.id === draft.selectedWorldId) || null;
  const selectedWorldId = draft.selectedWorldId;
  const normalizedDraft = useMemo(() => normalizeCreateRealmAgentDraft(draft), [draft]);

  const worldPreviewQuery = useQuery({
    queryKey: ['realm-agent-studio', 'create-agent-world-preview', selectedWorldId],
    queryFn: () => getCreateRealmAgentWorldPreview(selectedWorldId),
    enabled: selectedWorldId.length > 0 && Boolean(selectedWorld),
  });
  const handleAvailabilityQuery = useQuery<RealmAgentHandleAvailabilityResult>({
    queryKey: ['realm-agent-studio', 'create-agent-handle-availability', normalizedDraft.handle],
    queryFn: () => checkCreateRealmAgentHandleAvailability(normalizedDraft.handle),
    enabled: normalizedDraft.handle.length > 0,
  });
  const handleAvailability = handleAvailabilityQuery.data?.ok ? handleAvailabilityQuery.data.availability : null;

  useEffect(() => {
    if (!draft.selectedWorldId && oasisWorld) {
      setDraft((current) => current.selectedWorldId ? current : { ...current, selectedWorldId: oasisWorld.id });
    }
  }, [draft.selectedWorldId, oasisWorld]);

  function updateDraft(patch: Partial<CreateRealmAgentDraftInput>) {
    setDraft((current) => ({ ...current, ...patch }));
    setLocalSubmitErrors([]);
    setSubmitResult(null);
    setCreatedContext(null);
  }

  const createMutation = useMutation<RealmAgentCreateResult, Error, ReviewedCreateRealmAgentPayload>({
    mutationFn: (payload) => createReviewedRealmAgent(payload),
    onSuccess: (result) => {
      setSubmitResult(result);
      if (result.ok) {
        const currentDraft = normalizeCreateRealmAgentDraft(draft);
        const context: CreatedRealmAgentContext = {
          agentId: result.canonical.id,
          state: result.canonical.state || null,
          handle: currentDraft.handle,
          displayName: currentDraft.displayName,
          publicBio: currentDraft.publicBio,
          selectedWorldId: currentDraft.selectedWorldId,
          needsPostCreateSettings: currentDraft.publicBio.length > 0,
        };
        setCreatedContext(context);
        setLocalSubmitErrors([]);
        onCreated?.(context);
        void queryClient.invalidateQueries({ queryKey: ['realm-agent-studio', 'owner-portfolio'] });
      }
    },
  });

  function submitCreate() {
    const readiness = validateCreateRealmAgentReadiness(draft, { selectableWorldIds, handleAvailability });
    if (!readiness.ready) {
      setLocalSubmitErrors(readiness.errors);
      setSubmitResult(null);
      return;
    }
    setLocalSubmitErrors([]);
    setSubmitResult(null);
    createMutation.mutate(readiness.payload);
  }

  async function runSeedGeneration() {
    setIsGeneratingSeed(true);
    setSeedResult(null);
    try {
      const result = await generateAgentSeedFromDescription(seedDescription);
      setSeedResult(result);
      if (result.ok) {
        // Merge generated fields into draft, preserve manually-typed defaults
        // (selectedWorldId stays empty so OASIS auto-fill effect kicks in).
        setDraft((current) => ({
          ...current,
          handle: result.seed.handle || current.handle,
          displayName: result.seed.displayName || current.displayName,
          publicBio: result.seed.publicBio || current.publicBio,
          concept: result.seed.concept || current.concept,
          description: result.seed.description || current.description,
          ruleText: result.seed.ruleText || current.ruleText,
          dnaPrimary: result.seed.dnaPrimary || current.dnaPrimary,
          dnaSecondary: result.seed.dnaSecondary.length > 0 ? result.seed.dnaSecondary : current.dnaSecondary,
          originalDescription: seedDescription.trim(),
        }));
        // Seed the reference image prompt as well.
        setReferenceImagePrompt(defaultReferenceImagePromptFromDraft({
          description: seedDescription,
          displayName: result.seed.displayName,
          concept: result.seed.concept,
          dnaPrimary: result.seed.dnaPrimary || '',
        }));
        setStage('edit');
      }
    } finally {
      setIsGeneratingSeed(false);
    }
  }

  function skipSeedAndCreateManually() {
    setDraft((current) => ({
      ...current,
      originalDescription: seedDescription.trim() || current.originalDescription,
    }));
    setReferenceImagePrompt(defaultReferenceImagePromptFromDraft({
      description: seedDescription,
      displayName: draft.displayName,
      concept: draft.concept,
      dnaPrimary: draft.dnaPrimary,
    }));
    setStage('edit');
  }

  function returnToSeedStage() {
    setStage('seed');
    setSubmitResult(null);
    setLocalSubmitErrors([]);
  }

  async function runReferenceImageGeneration() {
    setIsGeneratingReferenceImage(true);
    setReferenceImageResult(null);
    try {
      const prompt = referenceImagePrompt.trim()
        || defaultReferenceImagePromptFromDraft({
          description: draft.originalDescription,
          displayName: draft.displayName,
          concept: draft.concept,
          dnaPrimary: draft.dnaPrimary,
        });
      const result = await generateAgentReferenceImage({ prompt });
      setReferenceImageResult(result);
      if (result.ok) {
        setDraft((current) => ({ ...current, referenceImageUrl: result.referenceImageUrl }));
      }
    } finally {
      setIsGeneratingReferenceImage(false);
    }
  }

  function clearReferenceImage() {
    setDraft((current) => ({ ...current, referenceImageUrl: '' }));
    setReferenceImageResult(null);
  }

  const readiness = validateCreateRealmAgentReadiness(draft, { selectableWorldIds, handleAvailability });
  const handleCheckBlocking = Boolean(normalizedDraft.handle)
    && (handleAvailabilityQuery.isLoading || handleAvailabilityQuery.isError || !handleAvailability?.available);
  const createDisabled = createMutation.isPending || worldsQuery.isLoading || worlds.length === 0 || !selectedWorld || !readiness.ready || handleCheckBlocking;

  if (stage === 'seed') {
    return (
      <Surface tone="panel" padding="lg" className="min-w-0">
        <div className="grid min-w-0 gap-5">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h2 className="m-0 text-xl font-semibold">Create Realm Agent</h2>
            <StatusBadge tone="info">AI seed</StatusBadge>
            <StatusBadge tone="neutral">optional</StatusBadge>
          </div>
          <p className="m-0 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
            Describe your agent in one sentence. Studio asks Runtime's text model to draft handle, display name, personality DNA, and public copy — you'll review and edit each field before submit.
          </p>
          <FieldShell
            label="One-line agent description"
            message="Example: 一个20岁冷酷的中国唐代杀手女孩"
          >
            <TextareaField
              value={seedDescription}
              placeholder="一个20岁冷酷的中国唐代杀手女孩"
              onChange={(event) => setSeedDescription(event.currentTarget.value)}
            />
          </FieldShell>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Button
              tone="primary"
              disabled={!seedDescription.trim() || isGeneratingSeed}
              loading={isGeneratingSeed}
              onClick={() => void runSeedGeneration()}
            >
              Generate draft from description
            </Button>
            <Button tone="ghost" onClick={skipSeedAndCreateManually}>
              Skip — fill manually
            </Button>
          </div>
          {seedResult && !seedResult.ok ? (
            <InlineAlert tone="danger">
              Seed generation failed: {seedResult.message}
            </InlineAlert>
          ) : null}
          <InlineAlert tone="neutral">
            <strong>Privacy:</strong> the description is sent to the Runtime layer — Runtime picks the resolved text model for this surface (your AI settings binding takes precedence when admitted; otherwise Runtime defaults apply). Generated output is a candidate draft only — nothing reaches Realm until you click Create.
          </InlineAlert>
        </div>
      </Surface>
    );
  }

  return (
    <Surface tone="panel" padding="lg" className="min-w-0">
      <div className="grid min-w-0 gap-5 xl:grid-cols-[1fr_400px]">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h2 className="m-0 text-xl font-semibold">Create Realm Agent</h2>
            <StatusBadge tone="info">owner scoped</StatusBadge>
            <StatusBadge tone="neutral">review required</StatusBadge>
            {draft.originalDescription ? (
              <StatusBadge tone="success">AI seeded</StatusBadge>
            ) : null}
            <Button tone="ghost" size="sm" onClick={returnToSeedStage}>
              ← Restart from one-liner
            </Button>
          </div>
          <p className="m-0 mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
            Create a user-owned Realm Agent by selecting a world, defining public identity, and reviewing the request before submit.
          </p>
          {seedResult?.ok && seedResult.rationale ? (
            <InlineAlert tone="info" className="mt-3">
              <strong>AI draft rationale:</strong> {seedResult.rationale}
            </InlineAlert>
          ) : null}

          <div className="mt-4 grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FieldShell label="Agent handle" message="Checked before submit.">
                <TextField
                  value={draft.handle}
                  placeholder="@creator-agent"
                  onChange={(event) => updateDraft({ handle: event.currentTarget.value })}
                />
              </FieldShell>
              <FieldShell label="Display name" message="Visible public identity field.">
                <TextField
                  value={draft.displayName}
                  placeholder="Creator Agent"
                  onChange={(event) => updateDraft({ displayName: event.currentTarget.value })}
                />
              </FieldShell>
            </div>
            {normalizedDraft.handle && handleAvailabilityQuery.isLoading ? (
              <InlineAlert tone="info">Checking handle availability.</InlineAlert>
            ) : null}
            {handleAvailabilityQuery.isError ? (
              <InlineAlert tone="danger">Handle availability check failed.</InlineAlert>
            ) : null}
            {handleAvailabilityQuery.data?.ok === false ? (
              <InlineAlert tone="danger">{handleAvailabilityQuery.data.message}</InlineAlert>
            ) : null}
            {handleAvailability ? (
              <InlineAlert tone={handleAvailability.available ? 'success' : 'danger'}>
                {handleAvailability.available
                  ? `Handle @${handleAvailability.normalized} is available.`
                  : `Handle @${handleAvailability.normalized} is unavailable: ${handleAvailability.message}`}
              </InlineAlert>
            ) : null}
            <FieldShell label="Public bio" message="Short profile bio for review.">
              <TextareaField
                value={draft.publicBio}
                placeholder="Short public bio"
                onChange={(event) => updateDraft({ publicBio: event.currentTarget.value })}
              />
            </FieldShell>
            <InlineAlert tone="warning">Public bio is held in the draft until the profile settings save step.</InlineAlert>
            <div className="grid gap-4 md:grid-cols-2">
              <FieldShell label="Concept" message="Core creative concept for the agent.">
                <TextareaField
                  value={draft.concept}
                  placeholder="Creative concept"
                  onChange={(event) => updateDraft({ concept: event.currentTarget.value })}
                />
              </FieldShell>
              <FieldShell label="Description" message="Public-facing description.">
                <TextareaField
                  value={draft.description}
                  placeholder="Public-facing description"
                  onChange={(event) => updateDraft({ description: event.currentTarget.value })}
                />
              </FieldShell>
            </div>
            <FieldShell label="Visible rules" message="Optional behavior and boundary notes for review.">
              <TextareaField
                value={draft.ruleText}
                placeholder="Style, boundaries, and public behavior rules"
                onChange={(event) => updateDraft({ ruleText: event.currentTarget.value })}
              />
            </FieldShell>
            <FieldShell
              label="DNA primary archetype"
              message="Required by Realm. Backend constructs the full AgentDna JSON from this primary archetype plus optional secondary traits."
              messageTone={draft.dnaPrimary ? 'neutral' : 'danger'}
            >
              <SelectField
                value={draft.dnaPrimary}
                options={[
                  { value: '', label: 'Select an archetype…' },
                  ...DNA_PRIMARY_ARCHETYPES.map((archetype) => ({
                    value: archetype,
                    label: `${archetype} — ${DNA_PRIMARY_DESCRIPTIONS[archetype]}`,
                  })),
                ]}
                onValueChange={(value) => updateDraft({ dnaPrimary: value as DnaPrimaryArchetype | '' })}
              />
            </FieldShell>
            <FieldShell
              label={`DNA secondary traits (optional, up to ${DNA_SECONDARY_MAX_RECOMMENDED} recommended)`}
              message={
                draft.dnaSecondary.length > DNA_SECONDARY_MAX_RECOMMENDED
                  ? `You have ${draft.dnaSecondary.length} traits selected — Realm recommends at most ${DNA_SECONDARY_MAX_RECOMMENDED}. The request will still submit.`
                  : 'Tap to toggle.'
              }
              messageTone={draft.dnaSecondary.length > DNA_SECONDARY_MAX_RECOMMENDED ? 'warning' : 'neutral'}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {DNA_SECONDARY_TRAITS.map((trait) => {
                  const active = draft.dnaSecondary.includes(trait);
                  return (
                    <button
                      key={trait}
                      type="button"
                      title={DNA_SECONDARY_DESCRIPTIONS[trait]}
                      onClick={() => {
                        const next = active
                          ? draft.dnaSecondary.filter((value) => value !== trait)
                          : [...draft.dnaSecondary, trait];
                        updateDraft({ dnaSecondary: next });
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 999,
                        border: `1px solid ${active ? 'var(--nimi-action-primary-bg)' : 'var(--nimi-border-subtle)'}`,
                        background: active
                          ? 'color-mix(in srgb, var(--nimi-action-primary-bg) 12%, transparent)'
                          : 'var(--nimi-surface-card)',
                        color: active ? 'var(--nimi-text-primary)' : 'var(--nimi-text-secondary)',
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: '0.02em',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {trait}
                    </button>
                  );
                })}
              </div>
            </FieldShell>
            <FieldShell
              label="World"
              message={oasisWorld ? `Defaults to OASIS: ${oasisWorld.name}.` : 'OASIS default is unavailable until worlds load.'}
              messageTone={oasisWorld ? 'neutral' : 'danger'}
            >
              <SelectField
                disabled={worldsQuery.isLoading || worlds.length === 0}
                value={draft.selectedWorldId}
                options={worlds.map((world) => ({ value: world.id, label: worldOptionLabel(world) }))}
                onValueChange={(value) => updateDraft({ selectedWorldId: value })}
              />
            </FieldShell>
            {worldsQuery.isError ? (
              <InlineAlert tone="danger">World selection is unavailable.</InlineAlert>
            ) : null}
            {!worldsQuery.isLoading && worlds.length === 0 ? (
              <InlineAlert tone="warning">World selection is unavailable because Realm returned no selectable worlds.</InlineAlert>
            ) : null}
            {!worldsQuery.isLoading && worlds.length > 0 && draft.selectedWorldId && !selectedWorld ? (
              <InlineAlert tone="danger">Selected world is no longer available.</InlineAlert>
            ) : null}
            {!readiness.ready ? (
              <InlineAlert tone="warning">{readiness.errors.join('; ')}</InlineAlert>
            ) : null}
            {localSubmitErrors.length > 0 ? (
              <InlineAlert tone="danger">Create validation failed: {localSubmitErrors.join('; ')}</InlineAlert>
            ) : null}
            {submitResult ? (
              <InlineAlert tone={submitResult.ok ? 'success' : 'danger'}>
                {submitResult.ok
                  ? `Realm Agent created: ${submitResult.canonical.id}. Opening the owner detail lane.`
                  : submitResult.message}
              </InlineAlert>
            ) : null}
            {createdContext ? (
              <Surface tone="card" padding="md">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">Created Realm Agent</div>
                    <div className="ras-break-anywhere mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                      @{createdContext.handle} · {createdContext.agentId}
                    </div>
                  </div>
                  <StatusBadge tone="success">{createdContext.state || 'created'}</StatusBadge>
                </div>
                {createdContext.needsPostCreateSettings ? (
                  <InlineAlert tone="warning" className="mt-3">
                    Public bio is preserved for the post-create owner settings step. It was not submitted in the Realm create request.
                  </InlineAlert>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button tone="secondary" onClick={() => onOpenCreatedAgent?.(createdContext.agentId, 'detail')}>
                    Open created detail
                  </Button>
                  <Button
                    disabled={!createdContext.needsPostCreateSettings}
                    onClick={() => onOpenCreatedAgent?.(createdContext.agentId, 'settings')}
                  >
                    Continue to settings
                  </Button>
                </div>
              </Surface>
            ) : null}
            <Surface tone="card" padding="md">
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>Reference image (optional)</div>
                  <div className="ras-text-muted ras-text-size-sm" style={{ marginTop: 4 }}>
                    Generate a visual reference via Runtime <code>ScenarioService.executeScenario image.generate</code>. The URL passes through <code>CreateAgentDto.referenceImageUrl</code> on submit.
                  </div>
                </div>
                <StatusBadge tone={draft.referenceImageUrl ? 'success' : 'neutral'}>
                  {draft.referenceImageUrl ? 'reference attached' : 'no reference yet'}
                </StatusBadge>
              </div>
              <FieldShell
                label="Image prompt"
                message="Auto-filled from your description + display name + DNA archetype. Edit before generating."
              >
                <TextareaField
                  value={referenceImagePrompt}
                  placeholder={defaultReferenceImagePromptFromDraft({
                    description: draft.originalDescription,
                    displayName: draft.displayName,
                    concept: draft.concept,
                    dnaPrimary: draft.dnaPrimary,
                  })}
                  onChange={(event) => setReferenceImagePrompt(event.currentTarget.value)}
                />
              </FieldShell>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                <Button
                  tone="secondary"
                  disabled={isGeneratingReferenceImage}
                  loading={isGeneratingReferenceImage}
                  onClick={() => void runReferenceImageGeneration()}
                >
                  {draft.referenceImageUrl ? 'Regenerate reference image' : 'Generate reference image'}
                </Button>
                {draft.referenceImageUrl ? (
                  <Button tone="ghost" onClick={clearReferenceImage}>
                    Clear reference image
                  </Button>
                ) : null}
              </div>
              {referenceImageResult && !referenceImageResult.ok ? (
                <InlineAlert tone="danger" className="mt-3">
                  Reference image failed: {referenceImageResult.message}
                </InlineAlert>
              ) : null}
              {draft.referenceImageUrl ? (
                <div style={{ marginTop: 12 }}>
                  <div className="ras-text-muted ras-text-size-sm" style={{ marginBottom: 6 }}>Preview</div>
                  <div
                    style={{
                      width: '100%',
                      maxHeight: 320,
                      overflow: 'hidden',
                      borderRadius: 12,
                      border: '1px solid var(--nimi-border-subtle)',
                      background: 'var(--nimi-surface-active)',
                    }}
                  >
                    <img
                      src={draft.referenceImageUrl}
                      alt="Agent reference"
                      style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                    />
                  </div>
                  <div className="ras-break-anywhere ras-text-muted ras-text-size-sm" style={{ marginTop: 6 }}>
                    {draft.referenceImageUrl}
                  </div>
                </div>
              ) : null}
            </Surface>
            <Button tone="primary" disabled={createDisabled} loading={createMutation.isPending} onClick={submitCreate}>
              Create Realm Agent
            </Button>
          </div>
        </div>

        <div className="grid min-w-0 content-start gap-4">
          <Surface tone="card" padding="md">
            <div className="flex flex-wrap items-center gap-2">
              <div className="font-medium">Selected world preview</div>
              <StatusBadge tone="neutral">world settings</StatusBadge>
            </div>
            {!selectedWorld ? (
              <EmptyState title="No selected world" description="Select a Realm world." />
            ) : worldPreviewQuery.isLoading ? (
              <EmptyState title="Loading world preview" description="Loading selected world settings." />
            ) : worldPreviewQuery.isError ? (
              <InlineAlert tone="danger">Selected-world settings preview is unavailable.</InlineAlert>
            ) : worldPreviewQuery.data ? (
              <div className="mt-3 grid gap-3 text-[length:var(--nimi-type-body-sm-size)]">
                <div>
                  <div className="ras-break-anywhere font-medium">{worldPreviewQuery.data.name}</div>
                  <div className="ras-break-anywhere mt-1 text-[var(--nimi-text-muted)]">{worldPreviewQuery.data.tagline || worldPreviewQuery.data.description || 'basic setting text unavailable'}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone="info">{worldPreviewQuery.data.type || 'type unavailable'}</StatusBadge>
                  <StatusBadge tone="neutral">{worldPreviewQuery.data.status || 'status unavailable'}</StatusBadge>
                  <StatusBadge tone="neutral">{worldPreviewQuery.data.contentRating || 'rating unavailable'}</StatusBadge>
                </div>
                <div className="ras-break-anywhere text-[var(--nimi-text-secondary)]">{worldPreviewQuery.data.overview || 'overview unavailable'}</div>
                <div className="flex flex-wrap gap-2">
                  {worldPreviewQuery.data.themes.length > 0
                    ? worldPreviewQuery.data.themes.map((theme) => <StatusBadge key={theme} tone="neutral">{theme}</StatusBadge>)
                    : <StatusBadge tone="warning">themes unavailable</StatusBadge>}
                </div>
              </div>
            ) : null}
          </Surface>
          <ReadinessPreview draft={draft} selectableWorldIds={selectableWorldIds} handleAvailability={handleAvailability} />
        </div>
      </div>
    </Surface>
  );
}
