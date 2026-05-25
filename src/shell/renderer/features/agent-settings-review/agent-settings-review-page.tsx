import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  EmptyState,
  FieldShell,
  InlineAlert,
  StatusBadge,
  Surface,
  TextareaField,
} from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import {
  getOwnerAgentSettings,
  proposeReviewedOwnerAgentSettings,
  type RuntimeOwnerSettingsProposalResult,
} from '@renderer/features/portfolio/portfolio-client.js';
import {
  createOwnerAgentSettingsDraft,
} from '@renderer/features/portfolio/setting-proposal.js';

const DEFAULT_CONSISTENCY_PROMPT =
  'Review this agent’s current public setting for coherence and consistency. '
  + 'Identify weak or generic personality lines, contradictions, weak greeting, unclear boundaries, '
  + 'and misalignment between the public bio and the deeper setting. Propose concrete rewrites for the '
  + 'fields that should change, and explain the rationale.';

export function AgentSettingsReviewPage() {
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
    <AgentShell agentId={agentId} current="settings">
      {() => <ConsistencyReviewBody agentId={agentId} onApplied={() => navigate(`/portfolio/${agentId}/settings`)} />}
    </AgentShell>
  );
}

function ConsistencyReviewBody({ agentId, onApplied }: { agentId: string; onApplied: () => void }) {
  const settingsQuery = useQuery({
    queryKey: ['realm-agent-studio', 'owner-agent-settings', agentId],
    queryFn: () => getOwnerAgentSettings(agentId),
  });
  const [intent, setIntent] = useState(DEFAULT_CONSISTENCY_PROMPT);
  const [result, setResult] = useState<RuntimeOwnerSettingsProposalResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  async function requestReview() {
    if (!settingsQuery.data) return;
    setIsReviewing(true);
    setResult(null);
    try {
      const draft = createOwnerAgentSettingsDraft(settingsQuery.data);
      const review = await proposeReviewedOwnerAgentSettings(agentId, { ...draft, naturalLanguageIntent: intent }, settingsQuery.data);
      setResult(review);
    } finally {
      setIsReviewing(false);
    }
  }

  return (
    <>
      <WorkspaceIntro
        title="Consistency review"
        badges={
          <>
            <StatusBadge tone="info">advisory</StatusBadge>
            <StatusBadge tone="warning">candidate only</StatusBadge>
          </>
        }
        description="Ask Runtime for a coherence critique of the current public setting. Apply suggestions through the owner-reviewed settings save path; this page never writes Realm truth directly."
      />

      <Surface tone="panel" material="glass-regular" padding="lg" className="ras-radius-xl">
        {settingsQuery.isLoading ? (
          <EmptyState title="Loading settings" description="Loading the current owner settings for review." />
        ) : settingsQuery.isError ? (
          <InlineAlert tone="danger">
            Owner settings unavailable: {settingsQuery.error instanceof Error ? settingsQuery.error.message : 'Realm owner settings read failed.'}
          </InlineAlert>
        ) : (
          <div className="ras-stack-tight" style={{ gap: 16 }}>
            <FieldShell label="Review prompt" message="Describe what should be reviewed. The default prompt covers coherence, contradictions, and boundary clarity.">
              <TextareaField
                value={intent}
                placeholder="Review prompt"
                onChange={(event) => setIntent(event.currentTarget.value)}
              />
            </FieldShell>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Button
                tone="primary"
                onClick={() => void requestReview()}
                disabled={!intent.trim() || isReviewing || !settingsQuery.data}
                loading={isReviewing}
              >
                Run consistency review
              </Button>
              <Button tone="ghost" onClick={onApplied}>
                Back to settings
              </Button>
            </div>
            {result?.ok ? (
              <Surface tone="card" padding="md" className="ras-radius-md">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>Runtime consistency review</div>
                    <div className="ras-break-anywhere ras-text-muted ras-text-size-sm" style={{ marginTop: 4 }}>
                      {result.proposal.rationale}
                    </div>
                  </div>
                  <StatusBadge tone="info">candidate</StatusBadge>
                </div>
                {result.proposal.changedSettingKeys.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {result.proposal.changedSettingKeys.map((key) => (
                      <StatusBadge key={key} tone="neutral">{key}</StatusBadge>
                    ))}
                  </div>
                ) : null}
                <div style={{ marginTop: 12 }}>
                  <InlineAlert tone="info">
                    Runtime output is candidate material only. Apply suggestions through the owner-reviewed settings save path.
                  </InlineAlert>
                </div>
                <details className="ras-technical-details" style={{ marginTop: 12 }}>
                  <summary>Proposed draft patch (JSON)</summary>
                  <pre className="ras-json-preview" style={{ margin: '12px 0 0', minHeight: 128, overflow: 'auto', borderRadius: 'var(--nimi-radius-field)', border: '1px solid var(--nimi-border-subtle)', background: 'var(--nimi-surface-panel)', padding: 12, fontSize: 12 }}>
                    {JSON.stringify(result.proposal.draftPatch, null, 2)}
                  </pre>
                </details>
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <Button tone="primary" onClick={onApplied}>Go to settings to apply</Button>
                </div>
              </Surface>
            ) : null}
            {result?.ok === false ? (
              <InlineAlert tone="danger">{result.message}</InlineAlert>
            ) : null}
          </div>
        )}
      </Surface>
    </>
  );
}
