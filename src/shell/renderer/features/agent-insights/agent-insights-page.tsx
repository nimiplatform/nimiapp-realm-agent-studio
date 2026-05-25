import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, InlineAlert, StatusBadge, Surface, Button } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import { listOwnerPortfolioAgents } from '@renderer/features/portfolio/portfolio-client.js';
import { ownerPortfolioListQueryKey } from '@renderer/features/agent-detail/use-agent-detail-query.js';
import type { OwnerPortfolioAgent } from '@renderer/features/portfolio/portfolio-data.js';
import type { OwnerPortfolioAgentDetail } from '@renderer/features/portfolio/portfolio-data.js';

const STALE_DAY_THRESHOLD = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function isStale(updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return false;
  const parsed = Date.parse(updatedAt);
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed > STALE_DAY_THRESHOLD * DAY_MS;
}

function daysAgo(updatedAt: string | null | undefined): number | null {
  if (!updatedAt) return null;
  const parsed = Date.parse(updatedAt);
  if (Number.isNaN(parsed)) return null;
  return Math.floor((Date.now() - parsed) / DAY_MS);
}

function InsightsBody({ agent, agentId }: { agent: OwnerPortfolioAgentDetail; agentId: string }) {
  const navigate = useNavigate();
  const portfolioQuery = useQuery({
    queryKey: ownerPortfolioListQueryKey(),
    queryFn: () => listOwnerPortfolioAgents(),
  });

  const portfolioRow = useMemo<OwnerPortfolioAgent | null>(
    () => portfolioQuery.data?.find((row) => row.id === agentId) ?? null,
    [agentId, portfolioQuery.data],
  );

  const friendCountMetric = agent.friendCount;
  const friendCountAvailable = friendCountMetric.status === 'available';
  const friendCount = friendCountMetric.status === 'available' ? friendCountMetric.value : null;
  const settingStale = isStale(portfolioRow?.updatedAt);
  const settingDays = daysAgo(portfolioRow?.updatedAt);

  return (
    <>
      <WorkspaceIntro
        title="Adoption signals"
        badges={
          <>
            <StatusBadge tone={friendCountAvailable ? 'success' : 'warning'}>
              {friendCountAvailable ? `friendCount ${friendCount}` : 'friendCount source unavailable'}
            </StatusBadge>
            {settingStale ? <StatusBadge tone="warning">stale setting</StatusBadge> : null}
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

        <Surface tone="panel" material="glass-regular" padding="lg" className="ras-radius-xl">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Setting freshness</h3>
            <StatusBadge tone={settingStale ? 'warning' : 'success'}>
              {settingStale ? 'stale' : 'recent'}
            </StatusBadge>
          </div>
          <div style={{ marginTop: 16, fontSize: 18, color: 'var(--nimi-text-primary)' }}>
            {settingDays === null
              ? 'Last update timestamp unavailable from Realm portfolio read.'
              : settingDays === 0
                ? 'Updated today.'
                : `Updated ${settingDays} day${settingDays === 1 ? '' : 's'} ago.`}
          </div>
          {settingStale ? (
            <div style={{ marginTop: 12 }}>
              <InlineAlert tone="warning">
                No reviewed setting changes in the last {STALE_DAY_THRESHOLD} days. Consider running a consistency review or revisiting visibility / personality fields.
              </InlineAlert>
            </div>
          ) : null}
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <Button tone="primary" onClick={() => navigate(`/portfolio/${agentId}/settings`)}>Open settings</Button>
            <Button tone="secondary" onClick={() => navigate(`/portfolio/${agentId}/settings/review`)}>
              Run consistency review
            </Button>
          </div>
        </Surface>

        <Surface tone="panel" material="glass-regular" padding="lg" className="ras-insights-grid__span ras-radius-xl">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Source availability</h3>
            <StatusBadge tone="neutral">Realm reads</StatusBadge>
          </div>
          <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
            {([
              ['displayName', agent.displayName.status],
              ['handle', agent.handle.status],
              ['bio', agent.bio.status],
              ['greeting', agent.greeting.status],
              ['profileCoverUrl', agent.profileCoverUrl.status],
              ['world', agent.world.status],
              ['state', agent.state.status],
              ['ownership', agent.ownership.status],
            ] as const).map(([field, status]) => (
              <li key={field}>
                <StatusBadge tone={status === 'available' ? 'success' : 'warning'} shape="dot">
                  {field}
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

      {portfolioRow ? null : (
        <EmptyState
          title="Portfolio row not loaded"
          description="The portfolio list has not finished loading; setting freshness will populate after a refresh."
        />
      )}
    </>
  );
}

export function AgentInsightsPage() {
  const { agentId } = useParams<{ agentId: string }>();

  if (!agentId) {
    return (
      <Surface tone="panel" material="glass-regular" padding="lg">
        <InlineAlert tone="danger">Agent id missing from route.</InlineAlert>
      </Surface>
    );
  }

  return (
    <AgentShell agentId={agentId} current="insights">
      {(agent) => <InsightsBody agent={agent} agentId={agentId} />}
    </AgentShell>
  );
}
