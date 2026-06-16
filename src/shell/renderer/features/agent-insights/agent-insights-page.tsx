import { useParams } from 'react-router-dom';
import { InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import type { OwnerPortfolioAgentDetail } from '@renderer/features/portfolio/portfolio-data.js';
import {
  settingFieldStatusLabel,
} from '@renderer/features/portfolio/OwnerPortfolio.shared.js';
import { useStudioI18n } from '@renderer/i18n/use-studio-i18n.js';

function InsightsBody({ agent }: { agent: OwnerPortfolioAgentDetail }) {
  const { t } = useStudioI18n();
  const friendCountMetric = agent.friendCount;
  const friendCountAvailable = friendCountMetric.status === 'available';
  const friendCount = friendCountMetric.status === 'available' ? friendCountMetric.value : null;

  return (
    <>
      <WorkspaceIntro
        title={t('agent.insights.title')}
        badges={
          <>
            <StatusBadge tone={friendCountAvailable ? 'success' : 'warning'}>
              {friendCountAvailable ? t('agent.insights.badgeAvailable', { count: friendCount ?? 0 }) : t('shared.friendCount.unavailable')}
            </StatusBadge>
          </>
        }
        description={t('agent.insights.description')}
      />

      <div className="ras-insights-grid">
        <Surface tone="panel" material="glass-regular" padding="lg" className="ras-radius-xl">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{t('agent.insights.friendCountTitle')}</h3>
            <StatusBadge tone={friendCountAvailable ? 'success' : 'warning'}>
              {friendCountAvailable ? t('agent.insights.sourceAvailable') : t('agent.insights.sourceUnavailable')}
            </StatusBadge>
          </div>
          {friendCountAvailable ? (
            <div style={{ marginTop: 16, fontSize: 48, fontWeight: 700, color: 'var(--nimi-text-primary)' }}>{friendCount}</div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <InlineAlert tone="warning">
                {t('agent.insights.unavailableDetail')}
              </InlineAlert>
            </div>
          )}
          <p className="ras-text-muted ras-text-size-sm" style={{ margin: '12px 0 0', lineHeight: 1.55 }}>
            {t('agent.insights.friendCountDescription')}
          </p>
        </Surface>

        <Surface tone="panel" material="glass-regular" padding="lg" className="ras-insights-grid__span ras-radius-xl">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{t('agent.insights.sourceAvailabilityTitle')}</h3>
            <StatusBadge tone="neutral">{t('agent.insights.realmReads')}</StatusBadge>
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
                  {field}: {settingFieldStatusLabel(setting, t)}
                </StatusBadge>
              </li>
            ))}
          </ul>
          <p className="ras-text-muted ras-text-size-sm" style={{ margin: '12px 0 0' }}>
            {t('agent.insights.sourceAvailabilityDescription')}
          </p>
        </Surface>

        <Surface tone="panel" material="glass-regular" padding="lg" className="ras-insights-grid__span ras-radius-xl">
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{t('agent.insights.deferredTitle')}</h3>
            <StatusBadge tone="neutral">{t('agent.insights.specDeferred')}</StatusBadge>
          </div>
          <p className="ras-text-muted ras-text-size-sm" style={{ margin: '8px 0 0' }}>
            {t('agent.insights.deferredDescription')}
          </p>
          <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusBadge tone="neutral" shape="dot">{t('agent.insights.deferredBadge')}</StatusBadge>
              {t('agent.insights.profileViewMetrics')}
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusBadge tone="neutral" shape="dot">{t('agent.insights.deferredBadge')}</StatusBadge>
              {t('agent.insights.friendCountTrend')}
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusBadge tone="neutral" shape="dot">{t('agent.insights.deferredBadge')}</StatusBadge>
              {t('agent.insights.postAnalytics')}
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <StatusBadge tone="neutral" shape="dot">{t('agent.insights.deferredBadge')}</StatusBadge>
              {t('agent.insights.portfolioHealth')}
            </li>
          </ul>
        </Surface>
      </div>
    </>
  );
}

function AgentInsightsPageForScope() {
  const { t } = useStudioI18n();
  const { agentId } = useParams<{ agentId: string }>();

  if (!agentId) {
    return (
      <Surface tone="panel" material="glass-regular" padding="lg">
        <InlineAlert tone="danger">{t('common.agentIdMissing')}</InlineAlert>
      </Surface>
    );
  }

  return (
    <AgentShell agentId={agentId} current="insights">
      {(agent) => <InsightsBody agent={agent} />}
    </AgentShell>
  );
}

export function AgentInsightsPage() {
  return <AgentInsightsPageForScope />;
}
