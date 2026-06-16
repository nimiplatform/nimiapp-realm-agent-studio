import { useParams } from 'react-router-dom';
import { InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import type { AgentDetailReadScope } from '@renderer/features/agent-detail/use-agent-detail-query.js';
import type { OwnerPortfolioAgentDetail } from '@renderer/features/portfolio/portfolio-data.js';
import {
  settingFieldStatusLabel,
} from '@renderer/features/portfolio/OwnerPortfolio.shared.js';

function InsightsBody({ agent }: { agent: OwnerPortfolioAgentDetail }) {
  const friendCountMetric = agent.friendCount;
  const friendCountAvailable = friendCountMetric.status === 'available';
  const friendCount = friendCountMetric.status === 'available' ? friendCountMetric.value : null;

  return (
    <>
      <WorkspaceIntro
        title="Adoption signals"
        badges={
          <>
            <StatusBadge tone={friendCountAvailable ? 'success' : 'warning'}>
              {friendCountAvailable ? `friendCount ${friendCount}` : 'friendCount source unavailable'}
            </StatusBadge>
          </>
        }
        description="Source-backed adoption metrics. friendCount values are read directly from Realm; if the source is unavailable, the field is shown as unavailable instead of zero-filled."
      />

      <div className="ras-insights-grid">
        <Surface tone="panel" material="glass-regular" padding="lg" className="ras-radius-xl">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>好友数 / friendCount</h3>
            <StatusBadge tone={friendCountAvailable ? 'success' : 'warning'}>
              {friendCountAvailable ? 'source available' : 'source unavailable'}
            </StatusBadge>
          </div>
          {friendCountAvailable ? (
            <div style={{ marginTop: 16, fontSize: 48, fontWeight: 700, color: 'var(--nimi-text-primary)' }}>{friendCount}</div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <InlineAlert tone="warning">
                friendCount could not be read from Realm for this agent. No fallback metric is shown.
              </InlineAlert>
            </div>
          )}
          <p className="ras-text-muted ras-text-size-sm" style={{ margin: '12px 0 0', lineHeight: 1.55 }}>
            First-version owner-visible adoption signal. Trend history and profile-view metrics are deferred until Realm admits a source-backed read.
          </p>
        </Surface>

        <Surface tone="panel" material="glass-regular" padding="lg" className="ras-insights-grid__span ras-radius-xl">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Source availability</h3>
            <StatusBadge tone="neutral">Realm reads</StatusBadge>
          </div>
          <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
            {([
              ['displayName', agent.displayName],
              ['handle', agent.handle],
              ['bio', agent.bio],
              ['greeting', agent.greeting],
              ['profileCoverUrl', agent.profileCoverUrl],
              ['world', agent.world],
              ['state', agent.state],
              ['ownership', agent.ownership],
            ] as const).map(([field, setting]) => (
              <li key={field}>
                <StatusBadge
                  tone={setting.status === 'available' ? 'success' : setting.status === 'available-empty' ? 'neutral' : 'warning'}
                  shape="dot"
                >
                  {field}: {settingFieldStatusLabel(setting)}
                </StatusBadge>
              </li>
            ))}
          </ul>
          <p className="ras-text-muted ras-text-size-sm" style={{ margin: '12px 0 0' }}>
            Any "source unavailable" badge is a typed read failure from Realm — Studio does not invent values to fill the gap.
          </p>
        </Surface>

        <Surface tone="panel" material="glass-regular" padding="lg" className="ras-insights-grid__span ras-radius-xl">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Deferred metrics</h3>
            <StatusBadge tone="neutral">spec deferred</StatusBadge>
          </div>
          <p className="ras-text-muted ras-text-size-sm" style={{ margin: '8px 0 0' }}>
            The following signals are explicitly deferred in the product spec until Realm admits a source-backed read. Studio will not show fabricated values for them.
          </p>
          <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusBadge tone="neutral" shape="dot">deferred</StatusBadge>
              Profile view metrics
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusBadge tone="neutral" shape="dot">deferred</StatusBadge>
              friendCount trend / time-series
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusBadge tone="neutral" shape="dot">deferred</StatusBadge>
              Post performance analytics
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusBadge tone="neutral" shape="dot">deferred</StatusBadge>
              Portfolio operation suggestions
            </li>
          </ul>
        </Surface>
      </div>
    </>
  );
}

function AgentInsightsPageForScope({ mode = 'owner' }: { mode?: AgentDetailReadScope }) {
  const { agentId } = useParams<{ agentId: string }>();

  if (!agentId) {
    return (
      <Surface tone="panel" material="glass-regular" padding="lg">
        <InlineAlert tone="danger">Agent id missing from route.</InlineAlert>
      </Surface>
    );
  }

  return (
    <AgentShell agentId={agentId} current="insights" mode={mode}>
      {(agent) => <InsightsBody agent={agent} />}
    </AgentShell>
  );
}

export function AgentInsightsPage() {
  return <AgentInsightsPageForScope />;
}

export function CurationAgentInsightsPage() {
  return <AgentInsightsPageForScope mode="forge-imported-system" />;
}
