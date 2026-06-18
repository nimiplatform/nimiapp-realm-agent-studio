import { useNavigate, useParams } from 'react-router-dom';
import { Button, InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import { useRefreshAgentReads } from '@renderer/features/agent-detail/use-agent-detail-query.js';
import type { OwnerPortfolioAgentDetail, SettingField } from '@renderer/features/portfolio/portfolio-data.js';
import {
  RuntimeProjectionWorkspace,
  SettingProposalWorkspace,
  VisibilitySettingsWorkspace,
} from '@renderer/features/portfolio/OwnerPortfolio.settings.js';
import { useStudioI18n } from '@renderer/i18n/use-studio-i18n.js';

function publicFieldReady(field: SettingField): boolean {
  return field.status === 'available' && field.value.trim().length > 0;
}

function publicFieldTone(field: SettingField): 'success' | 'neutral' | 'warning' {
  if (publicFieldReady(field)) return 'success';
  if (field.status === 'available-empty') return 'neutral';
  return 'warning';
}

function PublicProfileCompleteness({ agent }: { agent: OwnerPortfolioAgentDetail }) {
  const { t } = useStudioI18n();
  const requiredFields = [agent.displayName, agent.handle, agent.bio, agent.greeting];
  const readyCount = requiredFields.filter(publicFieldReady).length;
  const coverReady = publicFieldReady(agent.profileCoverUrl);
  const profileReady = readyCount === requiredFields.length;

  return (
    <Surface tone="card" padding="md" className="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[length:var(--nimi-type-body-size)] font-semibold">{t('agent.settings.profileCompleteness.title')}</h2>
          <p className="m-0 mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
            {t('agent.settings.profileCompleteness.description')}
          </p>
        </div>
        <StatusBadge tone={profileReady ? 'success' : 'warning'}>
          {t('agent.settings.profileCompleteness.count', { ready: readyCount, total: requiredFields.length })}
        </StatusBadge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <StatusBadge tone={publicFieldTone(agent.displayName)}>{t('agent.settings.profileCompleteness.displayName')}</StatusBadge>
        <StatusBadge tone={publicFieldTone(agent.handle)}>{t('agent.settings.profileCompleteness.handle')}</StatusBadge>
        <StatusBadge tone={publicFieldTone(agent.bio)}>{t('agent.settings.profileCompleteness.bio')}</StatusBadge>
        <StatusBadge tone={publicFieldTone(agent.greeting)}>{t('agent.settings.profileCompleteness.greeting')}</StatusBadge>
        <StatusBadge tone={coverReady ? 'success' : 'neutral'}>{t('agent.settings.profileCompleteness.cover')}</StatusBadge>
        <StatusBadge tone={agent.friendCount.status === 'available' ? 'success' : 'warning'}>
          {agent.friendCount.status === 'available'
            ? t('agent.settings.profileCompleteness.audienceAvailable')
            : t('agent.settings.profileCompleteness.audienceUnavailable')}
        </StatusBadge>
      </div>
    </Surface>
  );
}

function AgentSettingsPageForScope() {
  const { t } = useStudioI18n();
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const refreshAgentReads = useRefreshAgentReads(agentId ?? '');

  if (!agentId) {
    return (
      <Surface tone="panel" material="glass-regular" padding="lg">
        <InlineAlert tone="danger">{t('common.agentIdMissing')}</InlineAlert>
      </Surface>
    );
  }

  return (
    <AgentShell agentId={agentId} current="settings">
      {(agent) => (
        <>
          <WorkspaceIntro
            title={t('agent.settings.title')}
            badges={<StatusBadge tone="info">{t('common.workspace')}</StatusBadge>}
            description={t('agent.settings.description')}
            actions={(
              <>
                <Button tone="secondary" onClick={() => navigate(`/portfolio/${agentId}/preview`)}>
                  {t('agent.settings.openPreview')}
                </Button>
                <Button tone="ghost" onClick={() => navigate(`/portfolio/${agentId}/settings/review`)}>
                  {t('agent.settings.openReview')}
                </Button>
              </>
            )}
          />

          <PublicProfileCompleteness agent={agent} />
          <VisibilitySettingsWorkspace agent={agent} onAgentWrite={refreshAgentReads} />
          <SettingProposalWorkspace agent={agent} onAgentWrite={refreshAgentReads} />
          <RuntimeProjectionWorkspace agent={agent} />
        </>
      )}
    </AgentShell>
  );
}

export function AgentSettingsPage() {
  return <AgentSettingsPageForScope />;
}
