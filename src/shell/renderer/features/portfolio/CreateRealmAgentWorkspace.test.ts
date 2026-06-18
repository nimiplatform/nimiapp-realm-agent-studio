import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workspaceSource = () =>
  readFileSync(join(process.cwd(), 'src/shell/renderer/features/portfolio/CreateRealmAgentWorkspace.tsx'), 'utf8');

const stylesSource = () =>
  readFileSync(join(process.cwd(), 'src/shell/renderer/styles.css'), 'utf8');

describe('Create Realm Agent workspace shell', () => {
  it('keeps the reviewed creation flow with all four source options visible', () => {
    const source = workspaceSource();

    expect(source).toContain("type CreateStep = 'source' | 'draft' | 'review' | 'confirm'");
    expect(source).toContain("'create.step.draft'");
    expect(source).toContain("'create.step.review'");
    expect(source).toContain("'create.step.confirm'");
    expect(source).toContain('SOURCE_MODE_OPTIONS');
    expect(source).toContain("'create.source.description.title'");
    expect(source).toContain("'create.source.manual.title'");
    expect(source).toContain("'create.source.characterCard.title'");
    expect(source).toContain("'create.source.remix.title'");
  });

  it('keeps AI and imported material as candidate/local draft before Realm create', () => {
    const source = workspaceSource();

    expect(source).toContain("'create.draft.aiCandidate'");
    expect(source).toContain("'create.draft.localDraft'");
    expect(source).toContain('referenceImageUrl: \'\'');
    expect(source).toContain('parseDownloadedCharacterCardFile');
    expect(source).toContain('mapCharacterCardToGraphSourceFields');
    expect(source).toContain("'create.confirm.previewTitle'");
    expect(source).toContain("'create.confirm.previewSubtitle'");
    expect(source).toContain('confirmPreviewFields.map');
    expect(source).not.toContain('Object.entries(readiness.payload.body)');
  });

  it('renders CharacterCard import as a click and drag dropzone with green hover affordance', () => {
    const source = workspaceSource();
    const styles = stylesSource();

    expect(source).toContain('function handleCharacterCardDrop');
    expect(source).toContain('void importCharacterCardFile(file)');
    expect(source).toContain('className="ras-create-character-card-dropzone"');
    expect(source).toContain('data-drag-active={isCharacterCardDragActive || undefined}');
    expect(source).toContain("t('create.characterCardDropzoneTitle')");
    expect(source).not.toContain("t('create.characterCardDropzoneHint')");
    expect(source).toContain('className="ras-create-character-card-field__message"');
    expect(styles).toContain('.ras-create-character-card-dropzone:hover');
    expect(styles).toContain('.ras-create-character-card-dropzone[data-drag-active]');
    expect(styles).toContain('border-color: #22c55e');
    expect(styles).not.toContain('.ras-create-character-card-dropzone__hint');
  });

  it('gates create on reviewed essentials, graph review, handle preflight, and world source', () => {
    const source = workspaceSource();

    expect(source).toContain("type ReviewFieldKey = 'handle' | 'displayName' | 'description' | 'dnaPrimary' | 'world'");
    expect(source).toContain('!allRequiredAccepted');
    expect(source).toContain('!creationGraphReview.ready');
    expect(source).toContain('!handleAvailability?.available');
    expect(source).toContain('!selectedWorld');
    expect(source).toContain('!worldsQuery.isError && !worldsQuery.isLoading && worlds.length === 0');
    expect(source).toContain("t('create.worldSelectionUnavailable', { message: errorMessage(worldsQuery.error) })");
  });

  it('keeps review fields directly editable with autosaved acceptance instead of edit/accept buttons', () => {
    const source = workspaceSource();

    expect(source).toContain('function renderReviewEditor(field: ReviewField, options: { showValidation?: boolean } = {})');
    expect(source).toContain('function renderManualEntryTable()');
    expect(source).toContain('<div className="ras-create-manual-table"');
    expect(source).toContain('{renderManualEntryTable()}');
    expect(source).toContain('const [manualContinueAttempted, setManualContinueAttempted] = useState(false)');
    expect(source).toContain('setManualContinueAttempted(true)');
    expect(source).toContain('const showValidation = manualContinueAttempted');
    expect(source).toContain('data-status={showValidation ? field.status : undefined}');
    expect(source).toContain('renderReviewEditor(field, { showValidation })');
    expect(source).toContain('showValidation && field.issue');
    expect(source).toContain("t('create.review.autosavedProgress'");
    expect(source).toContain("field.status === 'accepted'");
    expect(source).toContain('reviewIssue(field: ReviewFieldKey)');
    expect(source).not.toContain('function acceptField');
    expect(source).not.toContain('function acceptAllEssentials');
    expect(source).not.toContain("t('create.review.edit')");
    expect(source).toContain('function continueToConfirm()');
    expect(source).toContain('setGraphAcceptedFingerprint(acceptAgentCreationGraphForRealmCreate(creationGraph))');
  });

  it('regenerates a non-empty local handle candidate even from non-ascii source text', () => {
    const source = workspaceSource();

    expect(source).toContain('function createHandleCandidate');
    expect(source).toContain('return createRealmAgentHandleCandidate(source)');
    expect(source).toContain("updateDraft({ handle: createHandleCandidate(draft, sourceMode) }, ['handle'])");
  });

  it('moves from draft directions into review after a direction is selected', () => {
    const source = workspaceSource();

    expect(source).toContain('function selectDirection(direction: DraftDirection)');
    expect(source).toContain('setDraft((current) => applyDirectionToDraft(direction, current))');
    expect(source).toContain("invalidateReview(['displayName', 'description', 'dnaPrimary'])");
    expect(source).toContain("setStep('review')");
  });

  it('adds optional Runtime reference image generation without making it required for create', () => {
    const source = workspaceSource();

    expect(source).toContain('generateAgentReferenceImage');
    expect(source).toContain('function renderReferenceImagePanel()');
    expect(source).toContain("t('create.generateReference')");
    expect(source).toContain("updateDraft({ referenceImageUrl: result.referenceImageUrl }, [])");
    expect(source).toContain("'create.preview.field.referenceImage'");
    expect(source).toContain('normalizedDraft.referenceImageUrl ?');
    expect(source).toContain("['visualBrief', 'voiceBrief', 'firstPost', 'contentVoice']");
  });
});
