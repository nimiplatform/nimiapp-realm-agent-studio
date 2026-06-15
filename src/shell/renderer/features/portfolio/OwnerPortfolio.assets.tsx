import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, EmptyState, FieldShell, InlineAlert, SelectField, StatusBadge, Surface, TextareaField, TextField } from '@nimiplatform/kit/ui';
import type { OwnerPortfolioAgentDetail } from './portfolio-data.js';
import {
  generateReviewedAvatarPackageCandidate,
  generateReviewedVisualImageCandidate,
  promoteReviewedForgeImportedProfileMedia,
  promoteReviewedForgeImportedVoice,
  selectReviewedAgentAvatarUrl,
  synthesizeReviewedVoiceDemo,
  type ForgeImportedProfileMediaPromotionResult,
  type ForgeImportedVoiceInput,
  type ForgeImportedVoicePromotionResult,
  type RealmAgentAvatarSelectResult,
  type RuntimeVisualImageGenerationResult,
  type RuntimeVoiceDemoSynthesisResult,
} from './portfolio-client.js';
import {
  uploadReviewedIdentityMediaResource,
  type DirectMediaResourceUploadResult,
} from './portfolio-client.js';
import {
  AVATAR_PACKAGE_CANDIDATE_NOTICE,
  AVATAR_PACKAGE_TARGETS,
  MEDIA_CANDIDATE_BINDING_POINTS,
  MEDIA_CANDIDATE_RESOURCE_TYPES,
  VISUAL_IMAGE_CANDIDATE_NOTICE,
  VOICE_DEMO_CANDIDATE_NOTICE,
  buildReviewedAvatarPackageCandidatePayload,
  buildReviewedVisualImageCandidatePayload,
  buildReviewedVoiceDemoCandidatePayload,
  type AvatarPackageTarget,
  type MediaCandidateBindingPoint,
  type VisualCandidateResourceType,
  type VisualMediaCandidateInput,
  type VoiceDemoCandidateInput,
} from './media-voice-candidate.js';
import {
  appendLocalCreativeAssetHistory,
  loadLocalCreativeAssetHistory,
  type CreativeAssetHistoryRecord,
} from './creative-asset-history.js';
import { CandidateFactGrid, TechnicalReviewDetails } from './OwnerPortfolio.shared.js';

export function createVisualMediaCandidateInput(): VisualMediaCandidateInput {
  return {
    resourceType: 'IMAGE',
    bindingPoint: 'AGENT_CANDIDATE',
    prompt: '',
    notes: '',
  };
}

export function createVisualImageGenerationDraft(): VisualMediaCandidateInput & { aspectRatio: string } {
  return {
    ...createVisualMediaCandidateInput(),
    aspectRatio: '1:1',
  };
}

export function createAvatarPackageCandidateDraft(): VisualMediaCandidateInput & {
  aspectRatio: string;
  packageTarget: AvatarPackageTarget;
  motionNotes: string;
  interactionNotes: string;
} {
  return {
    ...createVisualMediaCandidateInput(),
    bindingPoint: 'AGENT_AVATAR',
    aspectRatio: '1:1',
    packageTarget: 'LIVE2D',
    motionNotes: '',
    interactionNotes: '',
  };
}

export function createVoiceDemoCandidateInput(agent: OwnerPortfolioAgentDetail): VoiceDemoCandidateInput {
  return {
    scriptText: agent.greeting.value || '',
  };
}

export type ReviewedVoiceConfigDraft = {
  voiceId: string;
  description: string;
  emotionEnabled: boolean;
  speed: string;
  pitch: string;
  speechModelId: string;
  speechRoutePolicy: 'local' | 'cloud';
};

export function createReviewedVoiceConfigDraft(agent: OwnerPortfolioAgentDetail): ReviewedVoiceConfigDraft {
  const voice = agent.voice ?? {
    voiceId: '',
    description: '',
    emotionEnabled: null,
    speed: null,
    pitch: null,
    speechModelId: '',
    speechRoutePolicy: null,
  };
  return {
    voiceId: voice.voiceId,
    description: voice.description,
    emotionEnabled: voice.emotionEnabled ?? true,
    speed: voice.speed === null ? '' : String(voice.speed),
    pitch: voice.pitch === null ? '' : String(voice.pitch),
    speechModelId: voice.speechModelId,
    speechRoutePolicy: voice.speechRoutePolicy ?? 'local',
  };
}

function normalizeOptionalNumberText(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : undefined;
}

function buildReviewedVoiceConfigInput(draft: ReviewedVoiceConfigDraft): ForgeImportedVoiceInput {
  return {
    ...(draft.voiceId.trim() ? { voiceId: draft.voiceId.trim() } : {}),
    ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
    emotionEnabled: draft.emotionEnabled,
    ...(normalizeOptionalNumberText(draft.speed) !== undefined ? { speed: normalizeOptionalNumberText(draft.speed) } : {}),
    ...(normalizeOptionalNumberText(draft.pitch) !== undefined ? { pitch: normalizeOptionalNumberText(draft.pitch) } : {}),
    ...(draft.speechModelId.trim() ? { speechModelId: draft.speechModelId.trim() } : {}),
    speechRoutePolicy: draft.speechRoutePolicy,
  };
}

export function MediaVoiceCandidateWorkspace({ agent, onAgentWrite }: { agent: OwnerPortfolioAgentDetail; onAgentWrite: () => Promise<void> }) {
  const [visualImageDraft, setVisualImageDraft] = useState(() => createVisualImageGenerationDraft());
  const [visualImageResult, setVisualImageResult] = useState<RuntimeVisualImageGenerationResult | null>(null);
  const [isGeneratingVisualImage, setIsGeneratingVisualImage] = useState(false);
  const [avatarPackageDraft, setAvatarPackageDraft] = useState(() => createAvatarPackageCandidateDraft());
  const [avatarPackageResult, setAvatarPackageResult] = useState<RuntimeVisualImageGenerationResult | null>(null);
  const [isGeneratingAvatarPackage, setIsGeneratingAvatarPackage] = useState(false);
  const [identityUploadReviewed, setIdentityUploadReviewed] = useState(false);
  const [identityUploadFile, setIdentityUploadFile] = useState<File | null>(null);
  const [identityUploadResult, setIdentityUploadResult] = useState<DirectMediaResourceUploadResult | null>(null);
  const [isUploadingIdentityResource, setIsUploadingIdentityResource] = useState(false);
  const [creativeHistory, setCreativeHistory] = useState<CreativeAssetHistoryRecord[]>([]);
  const [avatarUrlDraft, setAvatarUrlDraft] = useState(() => agent.avatarUrl || '');
  const [avatarReviewed, setAvatarReviewed] = useState(false);
  const [profileCoverUrlDraft, setProfileCoverUrlDraft] = useState(() => agent.profileCoverUrl.value || '');
  const [avatarResult, setAvatarResult] = useState<RealmAgentAvatarSelectResult | ForgeImportedProfileMediaPromotionResult | null>(null);
  const [isSelectingAvatar, setIsSelectingAvatar] = useState(false);
  const [voiceConfigDraft, setVoiceConfigDraft] = useState<ReviewedVoiceConfigDraft>(() => createReviewedVoiceConfigDraft(agent));
  const [voiceConfigReviewed, setVoiceConfigReviewed] = useState(false);
  const [voiceConfigResult, setVoiceConfigResult] = useState<ForgeImportedVoicePromotionResult | null>(null);
  const [isPromotingVoiceConfig, setIsPromotingVoiceConfig] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState<VoiceDemoCandidateInput>(() => createVoiceDemoCandidateInput(agent));
  const [voiceResult, setVoiceResult] = useState<RuntimeVoiceDemoSynthesisResult | null>(null);
  const [isSynthesizingVoice, setIsSynthesizingVoice] = useState(false);
  const visualImagePayload = useMemo(() => buildReviewedVisualImageCandidatePayload(visualImageDraft, agent), [agent, visualImageDraft]);
  const avatarPackagePayload = useMemo(() => buildReviewedAvatarPackageCandidatePayload(avatarPackageDraft, agent), [agent, avatarPackageDraft]);
  const voicePayload = useMemo(() => buildReviewedVoiceDemoCandidatePayload(voiceDraft, agent), [agent, voiceDraft]);
  const avatarUrlChanged = avatarUrlDraft.trim() !== (agent.avatarUrl || '');
  const profileCoverUrlChanged = profileCoverUrlDraft.trim() !== (agent.profileCoverUrl.value || '');
  const profileMediaChanged = avatarUrlChanged || (agent.ownerScope === 'forge-imported-system' && profileCoverUrlChanged);
  const voiceConfigChanged = JSON.stringify(createReviewedVoiceConfigDraft(agent)) !== JSON.stringify(voiceConfigDraft);
  const visualResourceTypes = MEDIA_CANDIDATE_RESOURCE_TYPES.filter((resourceType): resourceType is VisualCandidateResourceType => resourceType === 'IMAGE');
  const visualBindingPoints = MEDIA_CANDIDATE_BINDING_POINTS.filter((bindingPoint) => bindingPoint !== 'AGENT_VOICE_SAMPLE');
  const visualPreviewUrl = visualImageResult?.ok ? visualImageResult.runtime.previewUrls[0] || '' : '';
  const avatarPackagePreviewUrl = avatarPackageResult?.ok ? avatarPackageResult.runtime.previewUrls[0] || '' : '';
  const voicePreviewUrl = voiceResult?.ok ? voiceResult.runtime.previewUrls[0] || '' : '';

  useEffect(() => {
    setVisualImageDraft(createVisualImageGenerationDraft());
    setVisualImageResult(null);
    setIsGeneratingVisualImage(false);
    setAvatarPackageDraft(createAvatarPackageCandidateDraft());
    setAvatarPackageResult(null);
    setIsGeneratingAvatarPackage(false);
    setIdentityUploadReviewed(false);
    setIdentityUploadFile(null);
    setIdentityUploadResult(null);
    setIsUploadingIdentityResource(false);
    setCreativeHistory(loadLocalCreativeAssetHistory(agent.id));
    setAvatarUrlDraft(agent.avatarUrl || '');
    setProfileCoverUrlDraft(agent.profileCoverUrl.value || '');
    setAvatarReviewed(false);
    setAvatarResult(null);
    setIsSelectingAvatar(false);
    setVoiceConfigDraft(createReviewedVoiceConfigDraft(agent));
    setVoiceConfigReviewed(false);
    setVoiceConfigResult(null);
    setIsPromotingVoiceConfig(false);
    setVoiceDraft(createVoiceDemoCandidateInput(agent));
    setVoiceResult(null);
    setIsSynthesizingVoice(false);
  }, [agent.id]);

  function updateVisualImageDraft(patch: Partial<typeof visualImageDraft>) {
    setVisualImageDraft((current) => ({ ...current, ...patch }));
    setVisualImageResult(null);
  }

  function updateAvatarPackageDraft(patch: Partial<typeof avatarPackageDraft>) {
    setAvatarPackageDraft((current) => ({ ...current, ...patch }));
    setAvatarPackageResult(null);
  }

  function updateAvatarUrlDraft(value: string) {
    setAvatarUrlDraft(value);
    setAvatarReviewed(false);
    setAvatarResult(null);
  }

  function updateProfileCoverUrlDraft(value: string) {
    setProfileCoverUrlDraft(value);
    setAvatarReviewed(false);
    setAvatarResult(null);
  }

  function updateVoiceConfigDraft(patch: Partial<ReviewedVoiceConfigDraft>) {
    setVoiceConfigDraft((current) => ({ ...current, ...patch }));
    setVoiceConfigReviewed(false);
    setVoiceConfigResult(null);
  }

  function updateVoiceDraft(patch: Partial<VoiceDemoCandidateInput>) {
    setVoiceDraft((current) => ({ ...current, ...patch }));
    setVoiceResult(null);
  }

  async function selectAvatarUrl() {
    setIsSelectingAvatar(true);
    setAvatarResult(null);
    try {
      const result = agent.ownerScope === 'forge-imported-system'
        ? await promoteReviewedForgeImportedProfileMedia(agent, {
          ...(avatarUrlChanged ? { avatarUrl: avatarUrlDraft } : {}),
          ...(profileCoverUrlChanged ? { profileCoverUrl: profileCoverUrlDraft } : {}),
        })
        : await selectReviewedAgentAvatarUrl(agent.id, avatarUrlDraft);
      setAvatarResult(result);
      if (result.ok) {
        await onAgentWrite();
      }
    } finally {
      setIsSelectingAvatar(false);
    }
  }

  async function promoteVoiceConfig() {
    setIsPromotingVoiceConfig(true);
    setVoiceConfigResult(null);
    try {
      const result = await promoteReviewedForgeImportedVoice(agent, buildReviewedVoiceConfigInput(voiceConfigDraft));
      setVoiceConfigResult(result);
      if (result.ok) {
        await onAgentWrite();
      }
    } finally {
      setIsPromotingVoiceConfig(false);
    }
  }

  async function generateVisualImageCandidate() {
    setIsGeneratingVisualImage(true);
    setVisualImageResult(null);
    try {
      const result = await generateReviewedVisualImageCandidate(visualImageDraft, agent);
      setVisualImageResult(result);
      if (result.ok) {
        setCreativeHistory(appendLocalCreativeAssetHistory(agent.id, {
          kind: 'runtime-image-candidate',
          label: 'Runtime image candidate',
          source: result.source,
          detail: result.runtime.previewUrls[0] || result.runtime.artifactUris[0] || result.runtime.artifactIds[0] || result.runtime.jobId || 'image artifact generated',
          artifactIds: result.runtime.artifactIds,
          ...(result.runtime.traceId ? { traceId: result.runtime.traceId } : {}),
        }));
      }
    } finally {
      setIsGeneratingVisualImage(false);
    }
  }

  async function generateAvatarPackageCandidate() {
    setIsGeneratingAvatarPackage(true);
    setAvatarPackageResult(null);
    try {
      const result = await generateReviewedAvatarPackageCandidate(avatarPackageDraft, agent);
      setAvatarPackageResult(result);
      if (result.ok) {
        const avatarPackage = result.draft.source === 'realm-agent-studio.reviewed-avatar-package-candidate'
          ? result.draft.avatarPackage
          : null;
        setCreativeHistory(appendLocalCreativeAssetHistory(agent.id, {
          kind: 'avatar-package-candidate',
          label: 'Avatar package candidate',
          source: result.source,
          detail: [
            avatarPackage ? avatarPackage.target : avatarPackageDraft.packageTarget,
            result.runtime.previewUrls[0] || result.runtime.artifactUris[0] || result.runtime.artifactIds[0] || result.runtime.jobId || 'avatar package design sheet generated',
          ].filter(Boolean).join(' / '),
          artifactIds: result.runtime.artifactIds,
          ...(result.runtime.traceId ? { traceId: result.runtime.traceId } : {}),
        }));
      }
    } finally {
      setIsGeneratingAvatarPackage(false);
    }
  }

  async function uploadIdentityResource() {
    if (!identityUploadFile) {
      setIdentityUploadResult({
        ok: false,
        source: 'Realm ResourcesService direct upload + finalizeResource',
        attachmentTruth: false,
        publicTruth: false,
        failure: 'media-upload-file-invalid',
        message: 'Reviewed identity Resource upload requires a selected image file.',
        submitted: null,
      });
      return;
    }

    setIsUploadingIdentityResource(true);
    setIdentityUploadResult(null);
    try {
      const result = await uploadReviewedIdentityMediaResource({
        resourceType: 'IMAGE',
        file: identityUploadFile,
        agent,
        tags: ['realm-agent-studio', 'identity-candidate'],
      });
      setIdentityUploadResult(result);
      if (result.ok) {
        setCreativeHistory(appendLocalCreativeAssetHistory(agent.id, {
          kind: 'identity-resource-upload',
          label: 'Identity Resource upload',
          source: result.source,
          detail: result.canonical.id,
          resourceId: result.canonical.id,
        }));
      }
    } finally {
      setIsUploadingIdentityResource(false);
    }
  }

  async function synthesizeVoiceDemo() {
    setIsSynthesizingVoice(true);
    setVoiceResult(null);
    try {
      const result = await synthesizeReviewedVoiceDemo(voiceDraft, agent);
      setVoiceResult(result);
      if (result.ok) {
        setCreativeHistory(appendLocalCreativeAssetHistory(agent.id, {
          kind: 'voice-demo-candidate',
          label: 'Voice demo candidate',
          source: result.source,
          detail: result.runtime.previewUrls[0] || result.runtime.artifactIds[0] || result.runtime.jobId || 'voice artifact generated',
          artifactIds: result.runtime.artifactIds,
          ...(result.runtime.traceId ? { traceId: result.runtime.traceId } : {}),
        }));
      }
    } finally {
      setIsSynthesizingVoice(false);
    }
  }

  return (
    <Surface tone="panel" padding="lg" className="mt-5">
      <div className="grid min-w-0 gap-5 xl:grid-cols-[1fr_1fr]">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h3 className="m-0 text-xl font-semibold">Visual identity candidate</h3>
            <StatusBadge tone="warning">local preview</StatusBadge>
            <StatusBadge tone="neutral">not published</StatusBadge>
          </div>
          <p className="m-0 mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
            Update the public avatar URL now. Generated and uploaded identity assets remain local previews until the owner asset publishing path is admitted.
          </p>
          <div className="mt-4 grid gap-4">
            <Surface tone="card" padding="md">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {agent.ownerScope === 'forge-imported-system' ? 'Reviewed profile media promotion' : 'Avatar URL selection'}
                  </div>
                  <div className="mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                    {agent.ownerScope === 'forge-imported-system'
                      ? 'Saves reviewed portrait and cover URLs through the Forge-imported system-agent lane.'
                      : 'Saves the reviewed avatar URL on the public profile. It does not publish generated asset candidates.'}
                  </div>
                </div>
                <StatusBadge tone="info">Realm save</StatusBadge>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[80px_1fr]">
                <div className="h-20 w-20 overflow-hidden rounded-[var(--nimi-radius-md)] bg-[var(--nimi-surface-active)]">
                  {avatarUrlDraft.trim() ? <img src={avatarUrlDraft.trim()} alt="" className="h-full w-full object-cover" /> : null}
                </div>
                <div className="grid gap-3">
                  <FieldShell label="Avatar URL" message="Owner-reviewed http(s) URL only.">
                    <TextField
                      value={avatarUrlDraft}
                      placeholder="https://..."
                      onChange={(event) => updateAvatarUrlDraft(event.currentTarget.value)}
                    />
                  </FieldShell>
                  {agent.ownerScope === 'forge-imported-system' ? (
                    <FieldShell label="Profile cover URL" message="Owner-reviewed http(s) URL only.">
                      <TextField
                        value={profileCoverUrlDraft}
                        placeholder="https://..."
                        onChange={(event) => updateProfileCoverUrlDraft(event.currentTarget.value)}
                      />
                    </FieldShell>
                  ) : null}
                  <Checkbox
                    checked={avatarReviewed}
                    onChange={(event) => setAvatarReviewed(event.currentTarget.checked)}
                    label="Human review complete"
                  />
                  <div className="flex flex-wrap gap-3">
                    <Button
                      disabled={!profileMediaChanged || !avatarReviewed || isSelectingAvatar}
                      loading={isSelectingAvatar}
                      onClick={() => void selectAvatarUrl()}
                    >
                      {agent.ownerScope === 'forge-imported-system' ? 'Promote reviewed profile media' : 'Select avatar URL'}
                    </Button>
                  </div>
                </div>
              </div>
              {avatarResult ? (
                <InlineAlert tone={avatarResult.ok ? 'success' : 'danger'} className="mt-3">
                  {avatarResult.ok
                    ? 'Reviewed profile media saved. The profile has been refreshed.'
                    : avatarResult.message}
                </InlineAlert>
              ) : null}
              {avatarResult ? (
                <TechnicalReviewDetails title="Profile media save response">
                  <pre className="ras-json-preview m-0 min-h-24 overflow-auto rounded-[var(--nimi-radius-field)] border border-[var(--nimi-border-subtle)] bg-[var(--nimi-surface-panel)] p-3 text-xs">
                    {JSON.stringify(avatarResult, null, 2)}
                  </pre>
                </TechnicalReviewDetails>
              ) : null}
            </Surface>
            <div className="grid gap-3 md:grid-cols-[160px_1fr]">
              <FieldShell label="Asset type" message="Local preview category.">
                <SelectField
                  value={visualImageDraft.resourceType}
                  options={visualResourceTypes.map((resourceType) => ({ value: resourceType, label: resourceType }))}
                  onValueChange={(value) => updateVisualImageDraft({ resourceType: value as VisualCandidateResourceType })}
                />
              </FieldShell>
              <FieldShell label="Profile slot" message="Where this candidate would be used after review.">
                <SelectField
                  value={visualImageDraft.bindingPoint}
                  options={visualBindingPoints.map((bindingPoint) => ({ value: bindingPoint, label: bindingPoint }))}
                  onValueChange={(value) => updateVisualImageDraft({ bindingPoint: value as MediaCandidateBindingPoint })}
                />
              </FieldShell>
            </div>
            <FieldShell label="Visual prompt" message="Describe the avatar, portrait, or visual direction.">
              <TextareaField
                value={visualImageDraft.prompt}
                placeholder="Describe the avatar, portrait, or candidate visual"
                onChange={(event) => updateVisualImageDraft({ prompt: event.currentTarget.value })}
              />
            </FieldShell>
            <FieldShell label="Notes" message="Composition, references, and review notes.">
              <TextareaField
                value={visualImageDraft.notes}
                placeholder="Composition, reference, or review notes"
                onChange={(event) => updateVisualImageDraft({ notes: event.currentTarget.value })}
              />
            </FieldShell>
            <Surface tone="card" padding="md">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">Runtime image candidate</div>
                  <div className="mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                    Generate one reviewed visual candidate for local history. Public profile binding remains separate.
                  </div>
                </div>
                <StatusBadge tone="info">AI candidate</StatusBadge>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[150px_1fr]">
                <FieldShell label="Aspect ratio">
                  <SelectField
                    value={visualImageDraft.aspectRatio}
                    options={[
                      { value: '1:1', label: '1:1' },
                      { value: '4:5', label: '4:5' },
                      { value: '16:9', label: '16:9' },
                    ]}
                    onValueChange={(value) => updateVisualImageDraft({ aspectRatio: value })}
                  />
                </FieldShell>
                <CandidateFactGrid
                  facts={[{
                    label: 'Model source',
                    value: 'AI model config / image.generate',
                  }]}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  disabled={!visualImagePayload.changed || isGeneratingVisualImage}
                  loading={isGeneratingVisualImage}
                  onClick={() => void generateVisualImageCandidate()}
                >
                  Generate image candidate
                </Button>
              </div>
              <InlineAlert tone={visualImagePayload.changed ? 'info' : 'warning'} className="mt-3">
                {visualImagePayload.changed ? VISUAL_IMAGE_CANDIDATE_NOTICE : visualImagePayload.errors.join('; ')}
              </InlineAlert>
              {visualImageResult ? (
                <InlineAlert tone={visualImageResult.ok ? 'success' : 'danger'} className="mt-3">
                  {visualImageResult.ok
                    ? 'Image candidate generated for local review. It has not been published to the profile.'
                    : visualImageResult.message}
                </InlineAlert>
              ) : null}
              {visualImageResult?.ok ? (
                <div className="mt-3 grid gap-3">
                  {visualPreviewUrl ? (
                    <Surface tone="panel" padding="md">
                      <div className="mb-2 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">Preview</div>
                      <div className="overflow-hidden rounded-[var(--nimi-radius-panel)] border border-[var(--nimi-border-subtle)] bg-[var(--nimi-surface-panel)]">
                        <img src={visualPreviewUrl} alt="Generated visual identity candidate" className="block h-auto max-h-80 w-full object-contain" />
                      </div>
                    </Surface>
                  ) : null}
                  <CandidateFactGrid
                    facts={[{
                      label: 'Candidate output',
                      value: visualImageResult.runtime.artifacts.length > 0
                        ? `${visualImageResult.runtime.artifacts.length} generated artifact${visualImageResult.runtime.artifacts.length === 1 ? '' : 's'}`
                        : 'Runtime output recorded',
                    }, {
                      label: 'Public state',
                      value: 'Candidate only',
                    }]}
                  />
                </div>
              ) : null}
              <TechnicalReviewDetails title="Image generation technical details">
                <pre className="ras-json-preview m-0 min-h-32 overflow-auto rounded-[var(--nimi-radius-field)] border border-[var(--nimi-border-subtle)] bg-[var(--nimi-surface-panel)] p-3 text-xs">
                  {visualImagePayload.payload ? JSON.stringify({
                    request: visualImagePayload.payload.runtime.request,
                    result: visualImageResult,
                  }, null, 2) : visualImagePayload.errors.join('; ')}
                </pre>
              </TechnicalReviewDetails>
            </Surface>
            <Surface tone="card" padding="md">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">Avatar package candidate</div>
                  <div className="mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                    Generate a reviewed design sheet and rigging brief for a future Sprite2D, Live2D, or VRM package.
                  </div>
                </div>
                <StatusBadge tone="warning">candidate only</StatusBadge>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[150px_1fr]">
                <FieldShell label="Target">
                  <SelectField
                    value={avatarPackageDraft.packageTarget}
                    options={AVATAR_PACKAGE_TARGETS.map((target) => ({ value: target, label: target }))}
                    onValueChange={(value) => updateAvatarPackageDraft({ packageTarget: value as AvatarPackageTarget })}
                  />
                </FieldShell>
                <FieldShell label="Aspect ratio">
                  <SelectField
                    value={avatarPackageDraft.aspectRatio}
                    options={[
                      { value: '1:1', label: '1:1' },
                      { value: '4:5', label: '4:5' },
                      { value: '16:9', label: '16:9' },
                    ]}
                    onValueChange={(value) => updateAvatarPackageDraft({ aspectRatio: value })}
                  />
                </FieldShell>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <FieldShell label="Motion notes" message="Idle, speaking, listening, and expression posture.">
                  <TextareaField
                    value={avatarPackageDraft.motionNotes}
                    placeholder="Idle and speaking posture for review"
                    onChange={(event) => updateAvatarPackageDraft({ motionNotes: event.currentTarget.value })}
                  />
                </FieldShell>
                <FieldShell label="Interaction notes" message="Allowed avatar reactions and presentation boundaries.">
                  <TextareaField
                    value={avatarPackageDraft.interactionNotes}
                    placeholder="Interaction boundaries for future rigging"
                    onChange={(event) => updateAvatarPackageDraft({ interactionNotes: event.currentTarget.value })}
                  />
                </FieldShell>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  disabled={!avatarPackagePayload.changed || isGeneratingAvatarPackage}
                  loading={isGeneratingAvatarPackage}
                  onClick={() => void generateAvatarPackageCandidate()}
                >
                  Generate avatar package candidate
                </Button>
              </div>
              <InlineAlert tone={avatarPackagePayload.changed ? 'info' : 'warning'} className="mt-3">
                {avatarPackagePayload.changed ? AVATAR_PACKAGE_CANDIDATE_NOTICE : avatarPackagePayload.errors.join('; ')}
              </InlineAlert>
              {avatarPackageResult ? (
                <InlineAlert tone={avatarPackageResult.ok ? 'success' : 'danger'} className="mt-3">
                  {avatarPackageResult.ok
                    ? 'Avatar package candidate generated for local review. It is not a published Live2D/VRM asset.'
                    : avatarPackageResult.message}
                </InlineAlert>
              ) : null}
              {avatarPackageResult?.ok ? (
                <div className="mt-3 grid gap-3">
                  {avatarPackagePreviewUrl ? (
                    <Surface tone="panel" padding="md">
                      <div className="mb-2 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">Design sheet preview</div>
                      <div className="overflow-hidden rounded-[var(--nimi-radius-panel)] border border-[var(--nimi-border-subtle)] bg-[var(--nimi-surface-panel)]">
                        <img src={avatarPackagePreviewUrl} alt="Generated avatar package design sheet" className="block h-auto max-h-80 w-full object-contain" />
                      </div>
                    </Surface>
                  ) : null}
                  <CandidateFactGrid
                    facts={[{
                      label: 'Package target',
                      value: avatarPackageResult.draft.source === 'realm-agent-studio.reviewed-avatar-package-candidate'
                        ? avatarPackageResult.draft.avatarPackage.target
                        : avatarPackageDraft.packageTarget,
                    }, {
                      label: 'Generated output',
                      value: 'Design sheet and rigging brief',
                    }, {
                      label: 'Public state',
                      value: 'Candidate only',
                    }]}
                  />
                </div>
              ) : null}
              <TechnicalReviewDetails title="Avatar package technical details">
                <pre className="ras-json-preview m-0 min-h-32 overflow-auto rounded-[var(--nimi-radius-field)] border border-[var(--nimi-border-subtle)] bg-[var(--nimi-surface-panel)] p-3 text-xs">
                  {avatarPackagePayload.payload ? JSON.stringify({
                    candidate: avatarPackagePayload.payload,
                    result: avatarPackageResult,
                  }, null, 2) : avatarPackagePayload.errors.join('; ')}
                </pre>
              </TechnicalReviewDetails>
            </Surface>
            <Surface tone="card" padding="md">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">Upload identity Resource</div>
                  <div className="mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                    Upload an owner-reviewed image as a READY Resource for local identity review. It is not a profile binding.
                  </div>
                </div>
                <StatusBadge tone="info">Resource upload</StatusBadge>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                <FieldShell label="Identity image" message={identityUploadReviewed ? 'Owner-reviewed image only.' : 'Human review complete is required before upload.'} messageTone={identityUploadReviewed ? 'neutral' : 'danger'}>
                  <TextField
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      setIdentityUploadFile(event.currentTarget.files?.[0] ?? null);
                      setIdentityUploadResult(null);
                    }}
                  />
                </FieldShell>
                <div className="flex items-end">
                  <Checkbox
                    checked={identityUploadReviewed}
                    onChange={(event) => setIdentityUploadReviewed(event.currentTarget.checked)}
                    label="Human review complete"
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <Button
                  disabled={!identityUploadReviewed || !identityUploadFile || isUploadingIdentityResource}
                  loading={isUploadingIdentityResource}
                  onClick={() => void uploadIdentityResource()}
                >
                  Upload identity Resource
                </Button>
              </div>
              {identityUploadResult ? (
                <InlineAlert tone={identityUploadResult.ok ? 'success' : 'danger'} className="mt-3">
                  {identityUploadResult.ok
                    ? `Identity Resource uploaded for local review as ${identityUploadResult.canonical.id}. Public profile binding remains deferred.`
                    : identityUploadResult.message}
                </InlineAlert>
              ) : null}
              {identityUploadResult ? (
                <TechnicalReviewDetails title="Identity upload response">
                  <pre className="ras-json-preview m-0 min-h-24 overflow-auto rounded-[var(--nimi-radius-field)] border border-[var(--nimi-border-subtle)] bg-[var(--nimi-surface-panel)] p-3 text-xs">
                    {JSON.stringify(identityUploadResult, null, 2)}
                  </pre>
                </TechnicalReviewDetails>
              ) : null}
            </Surface>
            <Surface tone="card" padding="md">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">Public asset publishing is not enabled yet</div>
                  <div className="mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                    Generated portraits and voice samples stay in local preview until Realm exposes a reviewed owner publishing path.
                  </div>
                </div>
                <StatusBadge tone="warning">local only</StatusBadge>
              </div>
              <InlineAlert tone="warning" className="mt-3">
                You can review candidates here, but this workflow will not publish them as profile assets yet.
              </InlineAlert>
            </Surface>
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h3 className="m-0 text-xl font-semibold">Voice demo candidate</h3>
            <StatusBadge tone="info">AI assisted</StatusBadge>
            <StatusBadge tone="neutral">sample only</StatusBadge>
            <StatusBadge tone={agent.ownerScope === 'forge-imported-system' ? 'success' : 'warning'}>
              {agent.ownerScope === 'forge-imported-system' ? 'voice profile writable' : 'not published'}
            </StatusBadge>
          </div>
          <p className="m-0 mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
            {agent.ownerScope === 'forge-imported-system'
              ? 'Generate a voice sample for review, then promote reviewed voice identity into the Forge-imported RealmAgent profile.'
              : 'Generate a voice sample for review. Publishing the sample as a public profile asset is deferred until the owner asset path is available.'}
          </p>
          <div className="mt-4 grid gap-4">
            <Surface tone="card" padding="md">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">Sample type</div>
                  <div className="mt-1 font-medium">Audio</div>
                </div>
                <div>
                  <div className="text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">Review state</div>
                  <div className="mt-1 font-medium">Local sample</div>
                </div>
              </div>
            </Surface>
            {agent.ownerScope === 'forge-imported-system' ? (
              <Surface tone="card" padding="md">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">Reviewed voice profile</div>
                    <div className="mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                      Saves reviewed voice and accent configuration to `dna.voice` for Agent Chat profile context.
                    </div>
                  </div>
                  <StatusBadge tone="info">Realm save</StatusBadge>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <FieldShell label="Voice ID" message="Preset voice id or admitted provider voice reference.">
                    <TextField
                      value={voiceConfigDraft.voiceId}
                      placeholder="zh_narrator"
                      onChange={(event) => updateVoiceConfigDraft({ voiceId: event.currentTarget.value })}
                    />
                  </FieldShell>
                  <FieldShell label="Emotion">
                    <Checkbox
                      checked={voiceConfigDraft.emotionEnabled}
                      onChange={(event) => updateVoiceConfigDraft({ emotionEnabled: event.currentTarget.checked })}
                      label="Emotion modulation enabled"
                    />
                  </FieldShell>
                  <FieldShell label="Speed" message="-50 to 100">
                    <TextField
                      type="number"
                      value={voiceConfigDraft.speed}
                      placeholder="-8"
                      onChange={(event) => updateVoiceConfigDraft({ speed: event.currentTarget.value })}
                    />
                  </FieldShell>
              <FieldShell label="Pitch" message="-12 to 12">
                <TextField
                  type="number"
                  value={voiceConfigDraft.pitch}
                  placeholder="-1"
                  onChange={(event) => updateVoiceConfigDraft({ pitch: event.currentTarget.value })}
                />
              </FieldShell>
              <FieldShell label="Speech model" message="Runtime speech.synthesize model id.">
                <TextField
                  value={voiceConfigDraft.speechModelId}
                  placeholder="speech/qwen3tts"
                  onChange={(event) => updateVoiceConfigDraft({ speechModelId: event.currentTarget.value })}
                />
              </FieldShell>
              <FieldShell label="Speech route">
                <SelectField
                  value={voiceConfigDraft.speechRoutePolicy}
                  options={[
                    { value: 'local', label: 'local' },
                    { value: 'cloud', label: 'cloud' },
                  ]}
                  onValueChange={(value) => updateVoiceConfigDraft({ speechRoutePolicy: value as 'local' | 'cloud' })}
                />
              </FieldShell>
            </div>
                <FieldShell label="Voice description" message="Reviewed accent, cadence, and timbre note." className="mt-3">
                  <TextareaField
                    value={voiceConfigDraft.description}
                    placeholder="Reviewed Song literati narrator with measured cadence."
                    onChange={(event) => updateVoiceConfigDraft({ description: event.currentTarget.value })}
                  />
                </FieldShell>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Checkbox
                    checked={voiceConfigReviewed}
                    onChange={(event) => setVoiceConfigReviewed(event.currentTarget.checked)}
                    label="Human review complete"
                  />
                  <Button
                    disabled={!voiceConfigChanged || !voiceConfigReviewed || isPromotingVoiceConfig}
                    loading={isPromotingVoiceConfig}
                    onClick={() => void promoteVoiceConfig()}
                  >
                    Promote reviewed voice
                  </Button>
                </div>
                {voiceConfigResult ? (
                  <InlineAlert tone={voiceConfigResult.ok ? 'success' : 'danger'} className="mt-3">
                    {voiceConfigResult.ok
                      ? 'Reviewed voice saved. The profile has been refreshed.'
                      : voiceConfigResult.message}
                  </InlineAlert>
                ) : null}
                {voiceConfigResult ? (
                  <TechnicalReviewDetails title="Voice profile save response">
                    <pre className="ras-json-preview m-0 min-h-24 overflow-auto rounded-[var(--nimi-radius-field)] border border-[var(--nimi-border-subtle)] bg-[var(--nimi-surface-panel)] p-3 text-xs">
                      {JSON.stringify(voiceConfigResult, null, 2)}
                    </pre>
                  </TechnicalReviewDetails>
                ) : null}
              </Surface>
            ) : null}
            <FieldShell label="Demo script" message="Short text the agent will speak for the sample.">
              <TextareaField
                value={voiceDraft.scriptText}
                placeholder="Short public voice demo script"
                onChange={(event) => updateVoiceDraft({ scriptText: event.currentTarget.value })}
              />
            </FieldShell>
            <CandidateFactGrid
              facts={[{
                label: 'Model source',
                value: 'AI model config / audio.synthesize',
              }]}
            />
            <InlineAlert tone={voicePayload.changed ? 'info' : 'warning'}>
              {voicePayload.changed ? VOICE_DEMO_CANDIDATE_NOTICE : voicePayload.errors.join('; ')}
            </InlineAlert>
            <div className="flex flex-wrap gap-3">
              <Button disabled={!voicePayload.changed || isSynthesizingVoice} loading={isSynthesizingVoice} onClick={() => void synthesizeVoiceDemo()}>
                Synthesize voice demo
              </Button>
            </div>
            {voiceResult ? (
              <InlineAlert tone={voiceResult.ok ? 'info' : 'danger'}>
                  {voiceResult.ok
                  ? 'Voice sample generated for local review. It has not been published to the profile.'
                  : voiceResult.message}
              </InlineAlert>
            ) : null}
            {voiceResult?.ok ? (
              <div className="grid gap-3">
                {voicePreviewUrl ? (
                  <div>
                    <div className="mb-2 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">Playback</div>
                    <audio src={voicePreviewUrl} controls className="w-full" />
                  </div>
                ) : null}
                <CandidateFactGrid
                  facts={[{
                    label: 'Candidate output',
                    value: voiceResult.runtime.artifacts.length > 0
                      ? `${voiceResult.runtime.artifacts.length} generated artifact${voiceResult.runtime.artifacts.length === 1 ? '' : 's'}`
                      : 'Runtime output recorded',
                  }, {
                    label: 'Review state',
                    value: 'Local review',
                  }, {
                    label: 'Trace',
                    value: voiceResult.runtime.traceId ? 'Captured in technical details' : 'Not provided by Runtime',
                  }]}
                />
              </div>
            ) : null}
            <TechnicalReviewDetails title="Voice generation technical details">
              <pre className="ras-json-preview m-0 min-h-72 overflow-auto rounded-[var(--nimi-radius-field)] border border-[var(--nimi-border-subtle)] bg-[var(--nimi-surface-card)] p-3 text-xs">
                {voicePayload.payload ? JSON.stringify({
                  request: voicePayload.payload,
                  result: voiceResult,
                }, null, 2) : voicePayload.errors.join('; ')}
              </pre>
            </TechnicalReviewDetails>
          </div>
        </div>
      </div>
      <Surface tone="card" padding="md" className="mt-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium">Local creative history</div>
            <div className="mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
              Candidate history is stored on this desktop device and does not publish profile assets.
            </div>
          </div>
          <StatusBadge tone="warning">app-local</StatusBadge>
        </div>
        {creativeHistory.length === 0 ? (
          <EmptyState title="No creative history" description="Generate or upload a reviewed candidate to add local history." />
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {creativeHistory.map((record) => (
              <Surface key={record.id} tone="panel" padding="md">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{record.label}</div>
                  <StatusBadge tone="warning">local only</StatusBadge>
                </div>
                <div className="ras-break-anywhere mt-2 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-secondary)]">
                  {record.detail}
                </div>
                <div className="ras-break-anywhere mt-2 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                  {record.source}
                </div>
              </Surface>
            ))}
          </div>
        )}
      </Surface>
    </Surface>
  );
}
