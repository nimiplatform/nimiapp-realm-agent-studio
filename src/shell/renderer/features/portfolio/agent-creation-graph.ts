import {
  normalizeCreateRealmAgentDraft,
  type CreateRealmAgentDraftInput,
} from './create-agent-draft.js';

export type AgentCreationGraphSourceMode =
  | 'description'
  | 'manual'
  | 'downloaded-character-card'
  | 'existing-agent-remix';

export type AgentCreationGraphFieldStatus = 'mapped' | 'candidateOnly' | 'unmapped' | 'rejected';

export type AgentCreationGraphSectionKey =
  | 'identity'
  | 'dna'
  | 'behavior'
  | 'worldview'
  | 'greeting'
  | 'communicationVoice'
  | 'contentVoice'
  | 'visualBrief'
  | 'voiceBrief'
  | 'postBrief'
  | 'sourceProvenance'
  | 'missingDecisions'
  | 'riskNotes'
  | 'writePlan';

export type AgentCreationGraphSourceField = {
  key: string;
  label: string;
  value: string;
  status: AgentCreationGraphFieldStatus;
  targetSection?: AgentCreationGraphSectionKey;
  note?: string;
};

export type AgentCreationGraphSection = {
  key: AgentCreationGraphSectionKey;
  title: string;
  status: 'ready' | 'needs-decision' | 'blocked';
  summary: string;
  fields: Array<{ label: string; value: string }>;
  missing: string[];
  risks: string[];
  ruleIds: string[];
};

export type AgentCreationGraphWritePlanItem = {
  target:
    | 'realm-create'
    | 'owner-settings'
    | 'asset-candidate'
    | 'post-candidate'
    | 'blocked'
    | 'deferred';
  label: string;
  status: 'ready' | 'blocked' | 'deferred';
  reason: string;
  ruleIds: string[];
};

export type AgentCreationGraph = {
  fingerprint: string;
  sourcePackage: {
    mode: AgentCreationGraphSourceMode;
    label: string;
    ownerApprovedForRuntime: boolean;
    fields: AgentCreationGraphSourceField[];
  };
  normalizedGraph: {
    sections: AgentCreationGraphSection[];
  };
  reviewState: {
    acceptedSectionKeys: AgentCreationGraphSectionKey[];
    acceptedForCreateFingerprint: string | null;
  };
  writePlan: {
    items: AgentCreationGraphWritePlanItem[];
  };
  provenance: {
    ruleIds: string[];
    sourceLabel: string;
  };
};

export type AgentCreationGraphCreateReview = {
  canAccept: boolean;
  ready: boolean;
  errors: string[];
  shapeErrors: string[];
  reviewErrors: string[];
};

export type BuildAgentCreationGraphOptions = {
  sourceMode: AgentCreationGraphSourceMode;
  sourceLabel?: string;
  runtimeRationale?: string;
  extraSourceFields?: AgentCreationGraphSourceField[];
  acceptedForCreateFingerprint?: string | null;
};

const GRAPH_RULE_IDS = [
  'R-RAS-GRAPH-001',
  'R-RAS-GRAPH-002',
  'R-RAS-GRAPH-003',
  'R-RAS-GRAPH-004',
  'R-RAS-GRAPH-013',
  'R-RAS-GRAPH-016',
  'R-RAS-GRAPH-017',
  'R-RAS-GRAPH-019',
  'R-RAS-GRAPH-020',
  'R-RAS-GRAPH-021',
] as const;

const REQUIRED_CREATE_SECTIONS: AgentCreationGraphSectionKey[] = [
  'identity',
  'dna',
  'worldview',
  'sourceProvenance',
  'writePlan',
];

function stableFingerprint(value: unknown): string {
  return JSON.stringify(value);
}

function present(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function sourceModeLabel(mode: AgentCreationGraphSourceMode): string {
  if (mode === 'description') return 'Owner description';
  if (mode === 'manual') return 'Manual advanced entry';
  if (mode === 'downloaded-character-card') return 'Downloaded CharacterCard';
  return 'Existing owned Realm Agent';
}

function buildSection(input: Omit<AgentCreationGraphSection, 'status'>): AgentCreationGraphSection {
  return {
    ...input,
    status: input.risks.length > 0 ? 'blocked' : input.missing.length > 0 ? 'needs-decision' : 'ready',
  };
}

function field(label: string, value: string | null): Array<{ label: string; value: string }> {
  return value ? [{ label, value }] : [];
}

function sourceField(
  key: string,
  label: string,
  value: string | null,
  status: AgentCreationGraphFieldStatus,
  targetSection?: AgentCreationGraphSectionKey,
  note?: string,
): AgentCreationGraphSourceField | null {
  if (!value) return null;
  return {
    key,
    label,
    value,
    status,
    ...(targetSection ? { targetSection } : {}),
    ...(note ? { note } : {}),
  };
}

function compactFields(fields: Array<AgentCreationGraphSourceField | null>): AgentCreationGraphSourceField[] {
  return fields.filter((item): item is AgentCreationGraphSourceField => Boolean(item));
}

export function buildAgentCreationGraphFromDraft(
  draftInput: CreateRealmAgentDraftInput,
  options: BuildAgentCreationGraphOptions,
): AgentCreationGraph {
  const draft = normalizeCreateRealmAgentDraft(draftInput);
  const sourceLabel = options.sourceLabel?.trim() || sourceModeLabel(options.sourceMode);
  const fingerprint = stableFingerprint({
    sourceMode: options.sourceMode,
    sourceLabel,
    handle: draft.handle,
    displayName: draft.displayName,
    concept: draft.concept,
    description: draft.description,
    ruleText: draft.ruleText,
    selectedWorldId: draft.selectedWorldId,
    dnaPrimary: draft.dnaPrimary,
    dnaSecondary: draft.dnaSecondary,
    referenceImageUrl: draft.referenceImageUrl,
    originalDescription: draft.originalDescription,
  });

  const sourceFields = [
    ...(options.extraSourceFields || []),
    ...compactFields([
    sourceField('ownerDescription', 'Owner description', present(draft.originalDescription), 'mapped', 'sourceProvenance'),
    sourceField('displayName', 'Display name', present(draft.displayName), 'mapped', 'identity'),
    sourceField('handle', 'Handle', present(draft.handle), 'mapped', 'identity'),
    sourceField('concept', 'Concept', present(draft.concept), 'mapped', 'worldview'),
    sourceField('description', 'Profile description', present(draft.description), 'mapped', 'identity'),
    sourceField('ruleText', 'Visible behavior rules', present(draft.ruleText), 'candidateOnly', 'behavior'),
    sourceField('referenceImageUrl', 'Reference image URL', present(draft.referenceImageUrl), 'candidateOnly', 'visualBrief'),
    sourceField('runtimeRationale', 'Runtime draft rationale', present(options.runtimeRationale || ''), 'candidateOnly', 'riskNotes'),
    ]),
  ];

  const sections: AgentCreationGraphSection[] = [
    buildSection({
      key: 'identity',
      title: 'Identity',
      summary: draft.displayName || draft.handle ? 'Public identity fields are ready for owner review.' : 'Public identity fields are not ready.',
      fields: [
        ...field('Display name', present(draft.displayName)),
        ...field('Handle', present(draft.handle) ? `@${draft.handle}` : null),
        ...field('Profile description', present(draft.description)),
      ],
      missing: [
        ...(draft.displayName ? [] : ['display name']),
        ...(draft.handle ? [] : ['handle']),
      ],
      risks: [],
      ruleIds: ['R-RAS-GRAPH-016', 'R-RAS-GRAPH-019'],
    }),
    buildSection({
      key: 'dna',
      title: 'DNA',
      summary: draft.dnaPrimary ? 'Realm archetype input is selected.' : 'Realm archetype input is missing.',
      fields: [
        ...field('Primary archetype', present(draft.dnaPrimary)),
        ...field('Secondary traits', draft.dnaSecondary.length > 0 ? draft.dnaSecondary.join(', ') : null),
      ],
      missing: draft.dnaPrimary ? [] : ['DNA primary archetype'],
      risks: [],
      ruleIds: ['R-RAS-GRAPH-016', 'R-RAS-GRAPH-018'],
    }),
    buildSection({
      key: 'behavior',
      title: 'Behavior',
      summary: draft.ruleText ? 'Visible behavior notes will stay owner-reviewed.' : 'No behavior notes were supplied.',
      fields: field('Visible rules', present(draft.ruleText)),
      missing: draft.ruleText ? [] : ['behavior boundaries'],
      risks: [],
      ruleIds: ['R-RAS-GRAPH-016', 'R-RAS-GRAPH-018'],
    }),
    buildSection({
      key: 'worldview',
      title: 'Worldview',
      summary: draft.concept ? 'Concept can anchor the public agent worldview.' : 'Concept is missing.',
      fields: field('Concept', present(draft.concept)),
      missing: draft.concept ? [] : ['concept'],
      risks: [],
      ruleIds: ['R-RAS-GRAPH-016', 'R-RAS-GRAPH-019'],
    }),
    buildSection({
      key: 'greeting',
      title: 'Greeting',
      summary: 'Greeting remains a follow-up owner settings candidate after create.',
      fields: [],
      missing: ['greeting candidate'],
      risks: [],
      ruleIds: ['R-RAS-GRAPH-017', 'R-RAS-GRAPH-020'],
    }),
    buildSection({
      key: 'communicationVoice',
      title: 'Communication Voice',
      summary: draft.ruleText || draft.concept ? 'Voice can be inferred for review from concept and behavior notes.' : 'Voice needs owner input.',
      fields: [
        ...field('Voice source', present(draft.ruleText || draft.concept)),
      ],
      missing: draft.ruleText || draft.concept ? [] : ['communication voice'],
      risks: [],
      ruleIds: ['R-RAS-GRAPH-016'],
    }),
    buildSection({
      key: 'contentVoice',
      title: 'Content Voice',
      summary: 'Content voice is retained as a post-studio candidate, not a create write.',
      fields: [],
      missing: ['content voice examples'],
      risks: [],
      ruleIds: ['R-RAS-GRAPH-025'],
    }),
    buildSection({
      key: 'visualBrief',
      title: 'Visual Brief',
      summary: draft.referenceImageUrl ? 'A reviewed reference image URL is ready as create input.' : 'Visual brief remains optional candidate material.',
      fields: field('Reference image URL', present(draft.referenceImageUrl)),
      missing: draft.referenceImageUrl ? [] : ['avatar/profile cover visual brief'],
      risks: [],
      ruleIds: ['R-RAS-GRAPH-024'],
    }),
    buildSection({
      key: 'voiceBrief',
      title: 'Voice Brief',
      summary: 'Voice demo belongs to Identity Studio and remains candidate-only in create.',
      fields: [],
      missing: ['voice brief'],
      risks: [],
      ruleIds: ['R-RAS-GRAPH-024'],
    }),
    buildSection({
      key: 'postBrief',
      title: 'Post Brief',
      summary: 'Post ideas belong to Content Studio and remain candidate-only in create.',
      fields: [],
      missing: ['first post brief'],
      risks: [],
      ruleIds: ['R-RAS-GRAPH-025'],
    }),
    buildSection({
      key: 'sourceProvenance',
      title: 'Source Provenance',
      summary: `${sourceLabel} is visible as local creation evidence.`,
      fields: [
        { label: 'Source mode', value: sourceModeLabel(options.sourceMode) },
        { label: 'Source label', value: sourceLabel },
      ],
      missing: [],
      risks: [],
      ruleIds: ['R-RAS-GRAPH-003', 'R-RAS-GRAPH-006', 'R-RAS-GRAPH-014'],
    }),
    buildSection({
      key: 'missingDecisions',
      title: 'Missing Decisions',
      summary: 'Unresolved decisions are explicit and do not block create unless they are required Realm create fields.',
      fields: [],
      missing: [
        ...(draft.description ? [] : ['profile description']),
        ...(draft.ruleText ? [] : ['behavior boundaries']),
        ...(draft.referenceImageUrl ? [] : ['visual reference']),
        'greeting',
        'content voice examples',
        'voice brief',
        'first post brief',
      ],
      risks: [],
      ruleIds: ['R-RAS-GRAPH-013', 'R-RAS-GRAPH-029'],
    }),
    buildSection({
      key: 'riskNotes',
      title: 'Risk Notes',
      summary: 'No hidden provider, model, lifecycle, private memory, or raw AgentRule fields are admitted.',
      fields: [
        ...field('Runtime rationale', present(options.runtimeRationale || '')),
      ],
      missing: [],
      risks: [],
      ruleIds: ['R-RAS-GRAPH-018', 'R-RAS-GRAPH-028'],
    }),
  ];

  const writePlanItems: AgentCreationGraphWritePlanItem[] = [
    {
      target: 'realm-create',
      label: 'Create Realm Agent',
      status: draft.handle && draft.displayName && draft.concept && draft.selectedWorldId && draft.dnaPrimary ? 'ready' : 'blocked',
      reason: 'Uses the owner-scoped Realm create path after handle and world gates pass.',
      ruleIds: ['R-RAS-GRAPH-017', 'R-RAS-GRAPH-021'],
    },
    {
      target: 'owner-settings',
      label: 'Save profile description after create',
      status: draft.description ? 'ready' : 'deferred',
      reason: draft.description ? 'Description can be saved through admitted owner settings completion.' : 'No profile description candidate was supplied.',
      ruleIds: ['R-RAS-GRAPH-017', 'R-RAS-GRAPH-020'],
    },
    {
      target: 'asset-candidate',
      label: 'Reference image',
      status: draft.referenceImageUrl ? 'ready' : 'deferred',
      reason: draft.referenceImageUrl ? 'Reference image URL remains reviewed create input.' : 'Identity assets move to Identity Studio.',
      ruleIds: ['R-RAS-GRAPH-024'],
    },
    {
      target: 'post-candidate',
      label: 'First post',
      status: 'deferred',
      reason: 'Post generation belongs to Content Studio and requires human review before publish.',
      ruleIds: ['R-RAS-GRAPH-025'],
    },
  ];

  const writePlanSection = buildSection({
    key: 'writePlan',
    title: 'Write Plan',
    summary: 'Accepted fields map to admitted Realm write paths; blocked and deferred fields remain explicit.',
    fields: writePlanItems.map((item) => ({
      label: item.label,
      value: `${item.status}: ${item.reason}`,
    })),
    missing: writePlanItems.some((item) => item.target === 'realm-create' && item.status === 'blocked')
      ? ['Realm create required fields']
      : [],
    risks: [],
    ruleIds: ['R-RAS-GRAPH-017', 'R-RAS-GRAPH-020', 'R-RAS-GRAPH-021'],
  });

  const allSections = [...sections, writePlanSection];
  return {
    fingerprint,
    sourcePackage: {
      mode: options.sourceMode,
      label: sourceLabel,
      ownerApprovedForRuntime: options.sourceMode === 'description',
      fields: sourceFields,
    },
    normalizedGraph: {
      sections: allSections,
    },
    reviewState: {
      acceptedSectionKeys: allSections
        .filter((section) => section.status !== 'blocked')
        .map((section) => section.key),
      acceptedForCreateFingerprint: options.acceptedForCreateFingerprint || null,
    },
    writePlan: {
      items: writePlanItems,
    },
    provenance: {
      ruleIds: [...GRAPH_RULE_IDS],
      sourceLabel,
    },
  };
}

export function acceptAgentCreationGraphForRealmCreate(graph: AgentCreationGraph): string {
  return graph.fingerprint;
}

export function validateAgentCreationGraphForRealmCreate(
  graph: AgentCreationGraph | null,
  acceptedForCreateFingerprint: string | null,
): AgentCreationGraphCreateReview {
  const shapeErrors: string[] = [];
  const reviewErrors: string[] = [];
  if (!graph) {
    shapeErrors.push('Agent Creation Graph missing (R-RAS-GRAPH-003).');
    return {
      canAccept: false,
      ready: false,
      errors: [...shapeErrors],
      shapeErrors,
      reviewErrors,
    };
  }

  const sections = new Map(graph.normalizedGraph.sections.map((section) => [section.key, section]));
  for (const sectionKey of REQUIRED_CREATE_SECTIONS) {
    if (!sections.has(sectionKey)) {
      shapeErrors.push(`Agent Creation Graph section missing: ${sectionKey} (R-RAS-GRAPH-016).`);
    }
  }

  const createPlan = graph.writePlan.items.find((item) => item.target === 'realm-create');
  if (!createPlan) {
    shapeErrors.push('Agent Creation Graph write plan missing Realm create target (R-RAS-GRAPH-017).');
  } else if (createPlan.status !== 'ready') {
    shapeErrors.push('Agent Creation Graph write plan is blocked for Realm create (R-RAS-GRAPH-017).');
  }

  for (const sectionKey of ['identity', 'dna', 'worldview'] as const) {
    const section = sections.get(sectionKey);
    if (section?.status === 'blocked') {
      shapeErrors.push(`Agent Creation Graph ${section.title} section is blocked (R-RAS-GRAPH-027).`);
    }
  }

  if (acceptedForCreateFingerprint !== graph.fingerprint) {
    reviewErrors.push('Agent Creation Graph review missing or stale (R-RAS-GRAPH-019).');
  }

  return {
    canAccept: shapeErrors.length === 0,
    ready: shapeErrors.length === 0 && reviewErrors.length === 0,
    errors: [...shapeErrors, ...reviewErrors],
    shapeErrors,
    reviewErrors,
  };
}

export function agentCreationGraphSourceModeLabel(mode: AgentCreationGraphSourceMode): string {
  return sourceModeLabel(mode);
}
