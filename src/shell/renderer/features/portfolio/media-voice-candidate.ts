import type { OwnerPortfolioAgentDetail, PortfolioAgentDetailSource } from './portfolio-data.js';
import {
  createStudioImageGeneratePayload,
  createStudioSpeechSynthesizePayload,
  resolveStudioImageCallParams,
  resolveStudioSpeechCallParams,
  STUDIO_DEFAULT_SPEECH_TIMING_MODE,
  type StudioImageGeneratePayload,
  type StudioSpeechSynthesizePayload,
} from './studio-ai-runtime.js';

export const MEDIA_CANDIDATE_RESOURCE_TYPES = ['IMAGE', 'VIDEO', 'AUDIO'] as const;
export const MEDIA_CANDIDATE_BINDING_POINTS = [
  'AGENT_AVATAR',
  'AGENT_PORTRAIT',
  'AGENT_CANDIDATE',
  'AGENT_VOICE_SAMPLE',
] as const;
export const AVATAR_PACKAGE_TARGETS = ['SPRITE2D', 'LIVE2D', 'VRM'] as const;

export const VISUAL_IMAGE_CANDIDATE_NOTICE = 'Image candidates stay local for owner review until a reviewed profile publishing path is available.';
export const AVATAR_PACKAGE_CANDIDATE_NOTICE = 'Avatar package candidates stay local for owner review; generated output is a design sheet and rigging brief, not a published Live2D/VRM package.';
export const VOICE_DEMO_CANDIDATE_NOTICE = 'Voice demo audio stays local for owner review; reviewed voice profile config is promoted separately where admitted.';
export const VISUAL_IMAGE_GENERATION_SOURCE = 'Runtime ScenarioService.submitScenarioJob image.generate';
export const VOICE_DEMO_SYNTHESIS_SOURCE = 'Runtime ScenarioService.executeScenario audio.synthesize';

export type MediaCandidateResourceType = typeof MEDIA_CANDIDATE_RESOURCE_TYPES[number];
export type MediaCandidateBindingPoint = typeof MEDIA_CANDIDATE_BINDING_POINTS[number];
export type VisualCandidateResourceType = Extract<MediaCandidateResourceType, 'IMAGE'>;
export type VoiceCandidateResourceType = Extract<MediaCandidateResourceType, 'AUDIO'>;
export type AvatarPackageTarget = typeof AVATAR_PACKAGE_TARGETS[number];

export type VisualMediaCandidateInput = {
  resourceType: string;
  bindingPoint: string;
  prompt: string;
  notes: string;
};

export type VisualImageGenerationInput = VisualMediaCandidateInput & {
  aspectRatio: string;
};

export type AvatarPackageCandidateInput = VisualImageGenerationInput & {
  packageTarget: string;
  motionNotes: string;
  interactionNotes: string;
};

export type VoiceDemoCandidateInput = {
  scriptText: string;
};

export type NormalizedVisualMediaCandidateInput = {
  resourceType: VisualCandidateResourceType;
  bindingPoint: Exclude<MediaCandidateBindingPoint, 'AGENT_VOICE_SAMPLE'>;
  prompt: string;
  notes: string;
};

export type NormalizedVoiceDemoCandidateInput = {
  resourceType: VoiceCandidateResourceType;
  bindingPoint: Extract<MediaCandidateBindingPoint, 'AGENT_VOICE_SAMPLE'>;
  scriptText: string;
};

export type CandidateAgentContext = {
  source: PortfolioAgentDetailSource;
  agentKey: string;
  handle: string;
  displayName: string;
  bio?: string;
  greeting?: string;
  profileCoverUrl?: string;
};

export type ReviewedVoiceDemoCandidatePayload = {
  candidate: true;
  publicTruth: false;
  source: 'realm-agent-studio.reviewed-voice-demo-candidate';
  agentContext: CandidateAgentContext;
  runtime: {
    capabilityToken: 'audio.synthesize';
    runtimeScenario: 'speechSynthesize';
    source: typeof VOICE_DEMO_SYNTHESIS_SOURCE;
    request: StudioSpeechSynthesizePayload;
    status: 'candidate-ready';
  };
  futureEvidencePath: {
    resource: {
      carrier: 'Resource';
      type: VoiceCandidateResourceType;
      status: 'candidate-only';
    };
    binding: {
      family: 'Binding';
      hostType: 'AGENT';
      objectType: 'RESOURCE';
      bindingPoint: Extract<MediaCandidateBindingPoint, 'AGENT_VOICE_SAMPLE'>;
      status: 'candidate-only';
    };
  };
};

export type ReviewedVisualImageCandidatePayload = {
  candidate: true;
  publicTruth: false;
  source: 'realm-agent-studio.reviewed-visual-image-candidate';
  agentContext: CandidateAgentContext;
  runtime: {
    capabilityToken: 'image.generate';
    runtimeScenario: 'imageGenerate';
    source: typeof VISUAL_IMAGE_GENERATION_SOURCE;
    request: StudioImageGeneratePayload;
    status: 'candidate-ready';
  };
  futureEvidencePath: {
    resource: {
      carrier: 'Resource';
      type: VisualCandidateResourceType;
      status: 'candidate-only';
    };
    binding: {
      family: 'Binding';
      hostType: 'AGENT';
      objectType: 'RESOURCE';
      bindingPoint: Exclude<MediaCandidateBindingPoint, 'AGENT_VOICE_SAMPLE'>;
      status: 'candidate-only';
    };
  };
};

export type ReviewedAvatarPackageCandidatePayload = {
  candidate: true;
  publicTruth: false;
  source: 'realm-agent-studio.reviewed-avatar-package-candidate';
  agentContext: CandidateAgentContext;
  avatarPackage: {
    target: AvatarPackageTarget;
    status: 'candidate-only';
    generatedOutput: 'design-sheet-and-rigging-brief';
    publishState: 'not-published';
    requiredArtifacts: string[];
  };
  runtime: {
    capabilityToken: 'image.generate';
    runtimeScenario: 'imageGenerate';
    source: typeof VISUAL_IMAGE_GENERATION_SOURCE;
    request: StudioImageGeneratePayload;
    status: 'candidate-ready';
  };
  futureEvidencePath: {
    resource: {
      carrier: 'Resource';
      type: VisualCandidateResourceType;
      role: 'avatar-design-sheet';
      status: 'candidate-only';
    };
    binding: {
      family: 'Binding';
      hostType: 'AGENT';
      objectType: 'RESOURCE';
      bindingPoint: 'AGENT_AVATAR';
      status: 'candidate-only';
    };
    runtimePresentation: {
      backendKind: 'sprite2d' | 'live2d' | 'vrm';
      status: 'requires-reviewed-package-artifacts';
    };
  };
};

export type VisualImageCandidateBuildResult<TPayload> = VoiceDemoCandidateBuildResult<TPayload>;

export type VoiceDemoCandidateBuildResult<TPayload> =
  | {
    changed: true;
    errors: [];
    payload: TPayload;
  }
  | {
    changed: false;
    errors: string[];
    payload: null;
  };

const VISUAL_RESOURCE_TYPES = new Set<VisualCandidateResourceType>(['IMAGE']);
const VISUAL_BINDING_POINTS = new Set<Exclude<MediaCandidateBindingPoint, 'AGENT_VOICE_SAMPLE'>>([
  'AGENT_AVATAR',
  'AGENT_PORTRAIT',
  'AGENT_CANDIDATE',
]);
const AVATAR_PACKAGE_TARGET_SET = new Set<AvatarPackageTarget>(AVATAR_PACKAGE_TARGETS);
const AVATAR_PACKAGE_REQUIRED_ARTIFACTS: Record<AvatarPackageTarget, string[]> = {
  SPRITE2D: ['reviewed portrait image', 'idle pose policy', 'interaction policy'],
  LIVE2D: ['model3.json', 'moc3', 'texture atlas', 'idle motion', 'speaking/listening motion map'],
  VRM: ['vrm model', 'humanoid rig metadata', 'expression preset map', 'spring bone settings'],
};
const FORBIDDEN_MEDIA_CANDIDATE_FIELDS = new Set([
  'provider',
  'model',
  'localAgent',
  'worldId',
  'publicSuccess',
  'bindingSuccess',
  'resourceReady',
]);
const MODEL_ALLOWED_PATHS = new Set([
  'runtimePreview.requestCandidate.model',
  'runtime.request.params.model',
]);

function normalizeLineText(value: string): string {
  return value.replace(/\r\n?/g, '\n').trim();
}

function normalizeSingleLine(value: string): string {
  return normalizeLineText(value).replace(/[ \t]+/g, ' ');
}

function isVisualResourceType(value: string): value is VisualCandidateResourceType {
  return VISUAL_RESOURCE_TYPES.has(value as VisualCandidateResourceType);
}

function isVisualBindingPoint(value: string): value is Exclude<MediaCandidateBindingPoint, 'AGENT_VOICE_SAMPLE'> {
  return VISUAL_BINDING_POINTS.has(value as Exclude<MediaCandidateBindingPoint, 'AGENT_VOICE_SAMPLE'>);
}

function isAvatarPackageTarget(value: string): value is AvatarPackageTarget {
  return AVATAR_PACKAGE_TARGET_SET.has(value as AvatarPackageTarget);
}

function avatarPresentationBackend(target: AvatarPackageTarget): 'sprite2d' | 'live2d' | 'vrm' {
  if (target === 'LIVE2D') return 'live2d';
  if (target === 'VRM') return 'vrm';
  return 'sprite2d';
}

export function isAllowedMediaCandidateResourceType(value: string): value is MediaCandidateResourceType {
  return MEDIA_CANDIDATE_RESOURCE_TYPES.includes(value as MediaCandidateResourceType);
}

export function isAllowedMediaCandidateBindingPoint(value: string): value is MediaCandidateBindingPoint {
  return MEDIA_CANDIDATE_BINDING_POINTS.includes(value as MediaCandidateBindingPoint);
}

export function assertNoForbiddenMediaCandidateFields(value: unknown, path: string[] = []): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = [...path, key];
    if (FORBIDDEN_MEDIA_CANDIDATE_FIELDS.has(key) && !(key === 'model' && MODEL_ALLOWED_PATHS.has(nextPath.join('.')))) {
      return key;
    }
    const nestedViolation = assertNoForbiddenMediaCandidateFields(nested, nextPath);
    if (nestedViolation) {
      return nestedViolation;
    }
  }

  return null;
}

function createAgentContext(agent: OwnerPortfolioAgentDetail): CandidateAgentContext {
  return {
    source: agent.source,
    agentKey: agent.id,
    handle: agent.handle.value,
    displayName: agent.displayName.value,
    ...(agent.bio.value ? { bio: agent.bio.value } : {}),
    ...(agent.greeting.value ? { greeting: agent.greeting.value } : {}),
    ...(agent.profileCoverUrl.value ? { profileCoverUrl: agent.profileCoverUrl.value } : {}),
  };
}

export function normalizeVisualMediaCandidateInput(input: VisualMediaCandidateInput): NormalizedVisualMediaCandidateInput {
  return {
    resourceType: isVisualResourceType(input.resourceType) ? input.resourceType : 'IMAGE',
    bindingPoint: isVisualBindingPoint(input.bindingPoint) ? input.bindingPoint : 'AGENT_CANDIDATE',
    prompt: normalizeLineText(input.prompt),
    notes: normalizeLineText(input.notes),
  };
}

export function normalizeVoiceDemoCandidateInput(input: VoiceDemoCandidateInput): NormalizedVoiceDemoCandidateInput {
  return {
    resourceType: 'AUDIO',
    bindingPoint: 'AGENT_VOICE_SAMPLE',
    scriptText: normalizeLineText(input.scriptText),
  };
}

export function normalizeAvatarPackageTarget(value: string): AvatarPackageTarget {
  return isAvatarPackageTarget(value) ? value : 'LIVE2D';
}

export function buildReviewedVisualImageGenerationPayload(
  input: VisualImageGenerationInput,
  agent: OwnerPortfolioAgentDetail,
): VisualImageCandidateBuildResult<StudioImageGeneratePayload> {
  const normalized = normalizeVisualMediaCandidateInput(input);
  const aspectRatio = normalizeSingleLine(input.aspectRatio) || '1:1';
  const callParams = resolveStudioImageCallParams('realm-agent-studio.visual-image-candidate', {
    aspectRatio,
  });
  const errors: string[] = [];

  if (!normalized.prompt) {
    errors.push('visual prompt missing for image candidate generation');
  }

  if (errors.length > 0) {
    return { changed: false, errors, payload: null };
  }

  const promptParts = [
    normalized.prompt,
    normalized.notes ? `Owner notes: ${normalized.notes}` : '',
    agent.displayName.value ? `Realm Agent display name: ${agent.displayName.value}` : '',
    agent.bio.value ? `Profile description context: ${agent.bio.value}` : '',
  ].filter(Boolean);

  return {
    changed: true,
    errors: [],
    payload: createStudioImageGeneratePayload({
      surfaceId: 'realm-agent-studio.visual-image-candidate',
      params: {
        ...callParams,
      },
      spec: {
        prompt: promptParts.join('\n'),
        negativePrompt: '',
        n: 1,
        size: callParams.size || '',
        aspectRatio,
        quality: '',
        style: '',
        seed: callParams.seed || '',
        referenceImages: [],
        mask: '',
        responseFormat: callParams.responseFormat || 'url',
      },
    }),
  };
}

export function buildReviewedAvatarPackageImageGenerationPayload(
  input: AvatarPackageCandidateInput,
  agent: OwnerPortfolioAgentDetail,
): VisualImageCandidateBuildResult<StudioImageGeneratePayload> {
  const visual = normalizeVisualMediaCandidateInput({
    ...input,
    bindingPoint: 'AGENT_AVATAR',
  });
  const target = normalizeAvatarPackageTarget(input.packageTarget);
  const aspectRatio = normalizeSingleLine(input.aspectRatio) || '1:1';
  const motionNotes = normalizeLineText(input.motionNotes);
  const interactionNotes = normalizeLineText(input.interactionNotes);
  const callParams = resolveStudioImageCallParams('realm-agent-studio.avatar-package-candidate', {
    aspectRatio,
  });
  const errors: string[] = [];

  if (!visual.prompt) {
    errors.push('visual prompt missing for avatar package candidate generation');
  }

  if (errors.length > 0) {
    return { changed: false, errors, payload: null };
  }

  const promptParts = [
    `Avatar package target: ${target}.`,
    'Generate an owner-review design sheet and rigging brief only. Do not claim a usable Live2D/VRM package exists.',
    visual.prompt,
    visual.notes ? `Owner notes: ${visual.notes}` : '',
    motionNotes ? `Motion notes: ${motionNotes}` : '',
    interactionNotes ? `Interaction notes: ${interactionNotes}` : '',
    agent.displayName.value ? `Realm Agent display name: ${agent.displayName.value}` : '',
    agent.bio.value ? `Profile description context: ${agent.bio.value}` : '',
    agent.greeting.value ? `Greeting context: ${agent.greeting.value}` : '',
  ].filter(Boolean);

  return {
    changed: true,
    errors: [],
    payload: createStudioImageGeneratePayload({
      surfaceId: 'realm-agent-studio.avatar-package-candidate',
      params: {
        ...callParams,
      },
      spec: {
        prompt: promptParts.join('\n'),
        negativePrompt: '',
        n: 1,
        size: callParams.size || '',
        aspectRatio,
        quality: '',
        style: '',
        seed: callParams.seed || '',
        referenceImages: [],
        mask: '',
        responseFormat: callParams.responseFormat || 'url',
      },
    }),
  };
}

export function buildReviewedVisualImageCandidatePayload(
  input: VisualImageGenerationInput,
  agent: OwnerPortfolioAgentDetail,
): VisualImageCandidateBuildResult<ReviewedVisualImageCandidatePayload> {
  const imagePayload = buildReviewedVisualImageGenerationPayload(input, agent);
  const normalized = normalizeVisualMediaCandidateInput(input);

  if (!imagePayload.payload) {
    return imagePayload;
  }

  return {
    changed: true,
    errors: [],
    payload: {
      candidate: true,
      publicTruth: false,
      source: 'realm-agent-studio.reviewed-visual-image-candidate',
      agentContext: createAgentContext(agent),
      runtime: {
        capabilityToken: 'image.generate',
        runtimeScenario: 'imageGenerate',
        source: VISUAL_IMAGE_GENERATION_SOURCE,
        request: imagePayload.payload,
        status: 'candidate-ready',
      },
      futureEvidencePath: {
        resource: {
          carrier: 'Resource',
          type: normalized.resourceType,
          status: 'candidate-only',
        },
        binding: {
          family: 'Binding',
          hostType: 'AGENT',
          objectType: 'RESOURCE',
          bindingPoint: normalized.bindingPoint,
          status: 'candidate-only',
        },
      },
    },
  };
}

export function buildReviewedAvatarPackageCandidatePayload(
  input: AvatarPackageCandidateInput,
  agent: OwnerPortfolioAgentDetail,
): VisualImageCandidateBuildResult<ReviewedAvatarPackageCandidatePayload> {
  const imagePayload = buildReviewedAvatarPackageImageGenerationPayload(input, agent);
  const target = normalizeAvatarPackageTarget(input.packageTarget);

  if (!imagePayload.payload) {
    return imagePayload;
  }

  return {
    changed: true,
    errors: [],
    payload: {
      candidate: true,
      publicTruth: false,
      source: 'realm-agent-studio.reviewed-avatar-package-candidate',
      agentContext: createAgentContext(agent),
      avatarPackage: {
        target,
        status: 'candidate-only',
        generatedOutput: 'design-sheet-and-rigging-brief',
        publishState: 'not-published',
        requiredArtifacts: AVATAR_PACKAGE_REQUIRED_ARTIFACTS[target],
      },
      runtime: {
        capabilityToken: 'image.generate',
        runtimeScenario: 'imageGenerate',
        source: VISUAL_IMAGE_GENERATION_SOURCE,
        request: imagePayload.payload,
        status: 'candidate-ready',
      },
      futureEvidencePath: {
        resource: {
          carrier: 'Resource',
          type: 'IMAGE',
          role: 'avatar-design-sheet',
          status: 'candidate-only',
        },
        binding: {
          family: 'Binding',
          hostType: 'AGENT',
          objectType: 'RESOURCE',
          bindingPoint: 'AGENT_AVATAR',
          status: 'candidate-only',
        },
        runtimePresentation: {
          backendKind: avatarPresentationBackend(target),
          status: 'requires-reviewed-package-artifacts',
        },
      },
    },
  };
}

export function buildReviewedVoiceSynthesisPayload(
  input: VoiceDemoCandidateInput,
): VoiceDemoCandidateBuildResult<StudioSpeechSynthesizePayload> {
  const normalized = normalizeVoiceDemoCandidateInput(input);
  const callParams = resolveStudioSpeechCallParams('realm-agent-studio.voice-demo-candidate');
  const errors: string[] = [];

  if (!normalized.scriptText) {
    errors.push('voice demo script missing for voice candidate generation');
  }

  if (errors.length > 0) {
    return { changed: false, errors, payload: null };
  }

  const payload = createStudioSpeechSynthesizePayload({
    surfaceId: 'realm-agent-studio.voice-demo-candidate',
    params: {
      ...callParams,
    },
    spec: {
      text: normalizeSingleLine(normalized.scriptText),
      language: callParams.language || '',
      audioFormat: callParams.audioFormat || '',
      sampleRateHz: 0,
      speed: callParams.speed ?? 0,
      pitch: callParams.pitch ?? 0,
      volume: callParams.volume ?? 0,
      emotion: '',
      timingMode: STUDIO_DEFAULT_SPEECH_TIMING_MODE,
    },
  });

  return { changed: true, errors: [], payload };
}

export function buildReviewedVoiceDemoCandidatePayload(
  input: VoiceDemoCandidateInput,
  agent: OwnerPortfolioAgentDetail,
): VoiceDemoCandidateBuildResult<ReviewedVoiceDemoCandidatePayload> {
  const synthesisPayload = buildReviewedVoiceSynthesisPayload(input);
  const normalized = normalizeVoiceDemoCandidateInput(input);

  if (!synthesisPayload.payload) {
    return synthesisPayload;
  }

  return {
    changed: true,
    errors: [],
    payload: {
      candidate: true,
      publicTruth: false,
      source: 'realm-agent-studio.reviewed-voice-demo-candidate',
      agentContext: createAgentContext(agent),
      runtime: {
        capabilityToken: 'audio.synthesize',
        runtimeScenario: 'speechSynthesize',
        source: VOICE_DEMO_SYNTHESIS_SOURCE,
        request: synthesisPayload.payload,
        status: 'candidate-ready',
      },
      futureEvidencePath: {
        resource: {
          carrier: 'Resource',
          type: normalized.resourceType,
          status: 'candidate-only',
        },
        binding: {
          family: 'Binding',
          hostType: 'AGENT',
          objectType: 'RESOURCE',
          bindingPoint: normalized.bindingPoint,
          status: 'candidate-only',
        },
      },
    },
  };
}
