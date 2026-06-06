import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  EmptyState,
  FieldShell,
  InlineAlert,
  StatusBadge,
  Surface,
  TextField,
  TextareaField,
} from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import type { OwnerPortfolioAgentDetail } from '@renderer/features/portfolio/portfolio-data.js';
import {
  synthesizeReviewedVoiceDemo,
  type RuntimeVoiceDemoSynthesisResult,
} from '@renderer/features/portfolio/portfolio-client.js';
import {
  VOICE_DEMO_CANDIDATE_NOTICE,
  buildReviewedVoiceDemoCandidatePayload,
  type VoiceDemoCandidateInput,
} from '@renderer/features/portfolio/media-voice-candidate.js';
import {
  appendLocalCreativeAssetHistory,
  loadLocalCreativeAssetHistory,
  type CreativeAssetHistoryRecord,
} from '@renderer/features/portfolio/creative-asset-history.js';
import { TechnicalReviewDetails } from '@renderer/features/portfolio/OwnerPortfolio.shared.js';

function createVoiceDemoCandidateInput(agent: OwnerPortfolioAgentDetail): VoiceDemoCandidateInput {
  return {
    scriptText: agent.greeting.value || '',
    // Unspecified model marker. The Runtime route resolver must bind this to a
    // concrete audio.synthesize route before dispatch.
    model: 'auto',
  };
}

function VoiceDemoBody({ agent }: { agent: OwnerPortfolioAgentDetail }) {
  const [draft, setDraft] = useState<VoiceDemoCandidateInput>(() => createVoiceDemoCandidateInput(agent));
  const [result, setResult] = useState<RuntimeVoiceDemoSynthesisResult | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [history, setHistory] = useState<CreativeAssetHistoryRecord[]>([]);

  useEffect(() => {
    setDraft(createVoiceDemoCandidateInput(agent));
    setResult(null);
    setIsSynthesizing(false);
    setHistory(loadLocalCreativeAssetHistory(agent.id));
  }, [agent.id, agent.greeting.value]);

  const payload = buildReviewedVoiceDemoCandidatePayload(draft, agent);

  async function synthesize() {
    setIsSynthesizing(true);
    setResult(null);
    try {
      const next = await synthesizeReviewedVoiceDemo(draft, agent);
      setResult(next);
      if (next.ok) {
        setHistory(
          appendLocalCreativeAssetHistory(agent.id, {
            kind: 'voice-demo-candidate',
            label: 'Voice demo candidate',
            source: next.source,
            detail: next.runtime.artifactIds[0] || next.runtime.jobId || 'voice artifact generated',
            artifactIds: next.runtime.artifactIds,
            ...(next.runtime.traceId ? { traceId: next.runtime.traceId } : {}),
          }),
        );
      }
    } finally {
      setIsSynthesizing(false);
    }
  }

  return (
    <>
      <WorkspaceIntro
        title="Voice demo candidate"
        badges={
          <>
            <StatusBadge tone="info">AI assisted</StatusBadge>
            <StatusBadge tone="neutral">sample only</StatusBadge>
            <StatusBadge tone="warning">not published</StatusBadge>
          </>
        }
        description="Generate a voice sample through Runtime audio.synthesize. The sample is held locally for owner review; publishing it as a public profile asset is deferred until Realm exposes a reviewed owner voice publishing path."
      />

      <Surface tone="panel" material="glass-regular" padding="lg" className="ras-radius-xl">
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0, 1fr) 360px' }} className="ras-voice-grid">
          <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
            <FieldShell label="Demo script" message="Short text the agent will speak for this sample.">
              <TextareaField
                value={draft.scriptText}
                placeholder="Short public voice demo script"
                onChange={(event) => {
                  setDraft((current) => ({ ...current, scriptText: event.currentTarget.value }));
                  setResult(null);
                }}
              />
            </FieldShell>
            <FieldShell label="Voice model" message="Use the Runtime voice model configured for this environment.">
              <TextField
                value={draft.model}
                placeholder="Configured Runtime TTS model"
                onChange={(event) => {
                  setDraft((current) => ({ ...current, model: event.currentTarget.value }));
                  setResult(null);
                }}
              />
            </FieldShell>
            <InlineAlert tone={payload.changed ? 'info' : 'warning'}>
              {payload.changed ? VOICE_DEMO_CANDIDATE_NOTICE : payload.errors.join('; ')}
            </InlineAlert>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Button
                tone="primary"
                disabled={!payload.changed || isSynthesizing}
                loading={isSynthesizing}
                onClick={() => void synthesize()}
              >
                Synthesize voice demo
              </Button>
            </div>
            {result ? (
              <InlineAlert tone={result.ok ? 'info' : 'danger'}>
                {result.ok
                  ? 'Voice sample generated for local review. It has not been published to the profile.'
                  : result.message}
              </InlineAlert>
            ) : null}
            {result?.ok ? (
              <Surface tone="card" padding="md" className="ras-radius-md">
                <div className="ras-info-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                  <div className="ras-info-tile">
                    <div className="ras-info-tile__label">Generation job</div>
                    <div className="ras-info-tile__value ras-break-anywhere">{result.runtime.jobId || 'job id unavailable'}</div>
                  </div>
                  <div className="ras-info-tile">
                    <div className="ras-info-tile__label">Generated files</div>
                    <div className="ras-info-tile__value ras-break-anywhere">
                      {result.runtime.artifactIds.join(', ') || 'artifact id unavailable'}
                    </div>
                  </div>
                  <div className="ras-info-tile">
                    <div className="ras-info-tile__label">Status</div>
                    <div className="ras-info-tile__value">Generated locally</div>
                  </div>
                  <div className="ras-info-tile">
                    <div className="ras-info-tile__label">Trace</div>
                    <div className="ras-info-tile__value ras-break-anywhere">{result.runtime.traceId || 'trace unavailable'}</div>
                  </div>
                </div>
              </Surface>
            ) : null}
            <TechnicalReviewDetails title="Voice request technical details">
              <pre className="ras-json-preview" style={{ margin: 0, minHeight: 288, overflow: 'auto', borderRadius: 'var(--nimi-radius-field)', border: '1px solid var(--nimi-border-subtle)', background: 'var(--nimi-surface-panel)', padding: 12, fontSize: 12 }}>
                {payload.payload ? JSON.stringify(payload.payload, null, 2) : payload.errors.join('; ')}
              </pre>
            </TechnicalReviewDetails>
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Local voice history</h4>
              <StatusBadge tone="warning">app-local</StatusBadge>
            </div>
            {history.length === 0 ? (
              <EmptyState title="No voice candidates yet" description="Generate a sample to add it to local review history." />
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {history
                  .filter((record) => record.kind === 'voice-demo-candidate')
                  .map((record) => (
                    <Surface key={record.id} tone="card" padding="md" className="ras-radius-md">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ fontWeight: 600 }}>{record.label}</div>
                        <StatusBadge tone="warning">local only</StatusBadge>
                      </div>
                      <div className="ras-break-anywhere ras-text-secondary ras-text-size-sm" style={{ marginTop: 8 }}>
                        {record.detail}
                      </div>
                    </Surface>
                  ))}
              </div>
            )}
          </div>
        </div>
      </Surface>
    </>
  );
}

export function AgentAssetsVoicePage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();

  if (!agentId) {
    return (
      <Surface tone="panel" material="glass-regular" padding="lg">
        <InlineAlert tone="danger">Agent id missing from route.</InlineAlert>
      </Surface>
    );
  }

  return (
    <AgentShell agentId={agentId} current="assets">
      {(agent) => (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Button tone="ghost" onClick={() => navigate(`/portfolio/${agentId}/assets`)}>
              Back to visual identity
            </Button>
          </div>
          <VoiceDemoBody agent={agent} />
        </>
      )}
    </AgentShell>
  );
}
