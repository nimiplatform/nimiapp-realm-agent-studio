import { describe, expect, it } from 'vitest';
import type { LocalPostScheduleRecord } from './local-post-schedule-store.js';
import { buildDraftBoxEntries } from './draft-box.js';

describe('Draft Box model', () => {
  it('maps local creative history into candidate-only draft entries', () => {
    const entries = buildDraftBoxEntries({
      agentId: 'agent-1',
      creativeHistory: [{
        id: 'voice-1',
        agentId: 'agent-1',
        kind: 'voice-demo-candidate',
        label: 'Voice demo candidate',
        createdAt: '2026-06-18T01:00:00.000Z',
        source: 'Runtime audio.synthesize',
        publicTruth: false,
        detail: 'artifact-voice-1',
        artifactIds: ['artifact-voice-1'],
      }, {
        id: 'image-1',
        agentId: 'agent-1',
        kind: 'runtime-image-candidate',
        label: 'Runtime image candidate',
        createdAt: '2026-06-18T00:00:00.000Z',
        source: 'Runtime image.generate',
        publicTruth: false,
        detail: 'artifact-image-1',
        artifactIds: ['artifact-image-1'],
      }],
      localSchedule: null,
    });

    expect(entries).toEqual([{
      id: 'creative:voice-1',
      kind: 'voice-demo',
      destination: 'voice',
      status: 'needs-review',
      truthBoundary: 'candidate-only',
      title: 'Voice demo candidate',
      detail: 'artifact-voice-1',
      source: 'Runtime audio.synthesize',
      createdAt: '2026-06-18T01:00:00.000Z',
      actionPath: '/portfolio/agent-1/assets/voice',
    }, {
      id: 'creative:image-1',
      kind: 'identity-image',
      destination: 'identity',
      status: 'needs-review',
      truthBoundary: 'candidate-only',
      title: 'Runtime image candidate',
      detail: 'artifact-image-1',
      source: 'Runtime image.generate',
      createdAt: '2026-06-18T00:00:00.000Z',
      actionPath: '/portfolio/agent-1/assets',
    }]);
  });

  it('maps the single local schedule as local-only and due-aware', () => {
    const schedule: LocalPostScheduleRecord = {
      localKey: 'agent-1:2026-06-18T00:00:00.000Z',
      agentId: 'agent-1',
      savedAt: '2026-06-18T00:00:00.000Z',
      localRunAt: '2026-06-18T00:00:00.000Z',
      source: 'realm-agent-studio.local-single-post-schedule-store',
      appLocalOnly: true,
      execution: {
        mode: 'foreground-when-due',
        realmPublish: 'pending-owner-app-open',
      },
      candidate: {
        candidate: true,
        localRunAt: '2026-06-18T00:00:00.000Z',
        source: 'realm-agent-studio.local-single-post-schedule',
        appLocalOnly: true,
        boundary: {
          scope: 'app-local-only',
          realmPublish: 'not-created',
          realmScheduling: 'not-created',
          moderation: 'not-claimed',
        },
        postCandidate: {
          candidate: true,
          source: 'realm-agent-studio.local-post-draft',
          agentRef: {
            source: 'Realm MeService.getMyRealmAgent',
            agentKey: 'agent-1',
            handle: 'agent_1',
            displayName: 'Agent One',
          },
          realmCreatePost: {
            caption: 'Reviewed launch note',
            tags: ['launch'],
            attachments: [],
          },
          review: {
            humanReviewed: true,
          },
        },
      },
    };

    expect(buildDraftBoxEntries({
      agentId: 'agent-1',
      creativeHistory: [],
      localSchedule: schedule,
      now: new Date('2026-06-18T00:01:00.000Z'),
    })[0]).toMatchObject({
      id: 'schedule:agent-1:2026-06-18T00:00:00.000Z',
      kind: 'scheduled-post',
      destination: 'schedule',
      status: 'ready-when-due',
      truthBoundary: 'local-only',
      title: 'Scheduled post draft',
      detail: 'Reviewed launch note',
      actionPath: '/portfolio/agent-1/posts/schedule',
    });
  });
});
