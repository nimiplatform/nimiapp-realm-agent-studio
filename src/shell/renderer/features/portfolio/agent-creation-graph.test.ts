import { describe, expect, it } from 'vitest';
import {
  acceptAgentCreationGraphForRealmCreate,
  buildAgentCreationGraphFromDraft,
  validateAgentCreationGraphForRealmCreate,
  type AgentCreationGraph,
} from './agent-creation-graph.js';
import type { CreateRealmAgentDraftInput } from './create-agent-draft.js';

const readyDraft: CreateRealmAgentDraftInput = {
  handle: 'mira-prime',
  displayName: 'Mira Prime',
  concept: 'A precise operations companion for artifact review.',
  description: 'Mira helps owners review agent behavior before public writes.',
  ruleText: 'Keep output practical.',
  selectedWorldId: 'world-oasis',
  dnaPrimary: 'INTELLECTUAL',
  dnaSecondary: ['WISE', 'DIRECT'],
  referenceImageUrl: 'https://cdn.example.test/mira.png',
  originalDescription: 'An artifact review agent with calm operational judgment.',
};

describe('Agent Creation Graph', () => {
  it('builds source-backed graph sections from a description-originated draft', () => {
    const graph = buildAgentCreationGraphFromDraft(readyDraft, {
      sourceMode: 'description',
      sourceLabel: readyDraft.originalDescription,
      runtimeRationale: 'The draft is operational and review-focused.',
    });

    expect(graph.sourcePackage.mode).toBe('description');
    expect(graph.sourcePackage.fields.map((field) => field.status)).toContain('mapped');
    expect(graph.normalizedGraph.sections.map((section) => section.key)).toEqual([
      'identity',
      'dna',
      'behavior',
      'worldview',
      'greeting',
      'communicationVoice',
      'contentVoice',
      'visualBrief',
      'voiceBrief',
      'postBrief',
      'sourceProvenance',
      'missingDecisions',
      'riskNotes',
      'writePlan',
    ]);
    expect(graph.writePlan.items.find((item) => item.target === 'realm-create')?.status).toBe('ready');
  });

  it('requires owner graph review before create per R-RAS-GRAPH-019', () => {
    const graph = buildAgentCreationGraphFromDraft(readyDraft, {
      sourceMode: 'description',
      sourceLabel: readyDraft.originalDescription,
    });

    expect(validateAgentCreationGraphForRealmCreate(graph, null)).toMatchObject({
      canAccept: true,
      ready: false,
      reviewErrors: ['Agent Creation Graph review missing or stale (R-RAS-GRAPH-019).'],
    });

    const accepted = acceptAgentCreationGraphForRealmCreate(graph);
    expect(validateAgentCreationGraphForRealmCreate(graph, accepted)).toMatchObject({
      canAccept: true,
      ready: true,
      errors: [],
    });
  });

  it('blocks invalid graph shapes before Realm create per R-RAS-GRAPH-017', () => {
    const graph = buildAgentCreationGraphFromDraft({
      ...readyDraft,
      dnaPrimary: '',
    }, {
      sourceMode: 'manual',
      sourceLabel: 'Manual advanced entry',
    });
    const accepted = acceptAgentCreationGraphForRealmCreate(graph);

    expect(validateAgentCreationGraphForRealmCreate(graph, accepted)).toMatchObject({
      canAccept: false,
      ready: false,
      shapeErrors: ['Agent Creation Graph write plan is blocked for Realm create (R-RAS-GRAPH-017).'],
    });
  });

  it('blocks missing required graph sections per R-RAS-GRAPH-016', () => {
    const graph = buildAgentCreationGraphFromDraft(readyDraft, {
      sourceMode: 'description',
      sourceLabel: readyDraft.originalDescription,
    });
    const invalid: AgentCreationGraph = {
      ...graph,
      normalizedGraph: {
        sections: graph.normalizedGraph.sections.filter((section) => section.key !== 'identity'),
      },
    };
    const accepted = acceptAgentCreationGraphForRealmCreate(invalid);

    expect(validateAgentCreationGraphForRealmCreate(invalid, accepted).shapeErrors).toContain(
      'Agent Creation Graph section missing: identity (R-RAS-GRAPH-016).',
    );
  });
});
