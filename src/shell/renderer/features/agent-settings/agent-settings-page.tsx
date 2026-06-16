import { useNavigate, useParams } from 'react-router-dom';
import { Button, InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import { useRefreshAgentReads } from '@renderer/features/agent-detail/use-agent-detail-query.js';
import {
  RuntimeProjectionWorkspace,
  SettingProposalWorkspace,
  VisibilitySettingsWorkspace,
} from '@renderer/features/portfolio/OwnerPortfolio.settings.js';
import { useStudioI18n } from '@renderer/i18n/use-studio-i18n.js';

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
              <Button tone="secondary" onClick={() => navigate(`/portfolio/${agentId}/settings/review`)}>
                {t('agent.settings.openReview')}
              </Button>
            )}
          />

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
