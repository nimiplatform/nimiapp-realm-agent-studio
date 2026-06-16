import { useNavigate, useParams } from 'react-router-dom';
import { Button, InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import { CreativePostWorkspace } from '@renderer/features/portfolio/OwnerPortfolio.posts.js';
import { useStudioI18n } from '@renderer/i18n/use-studio-i18n.js';

export function AgentPostsSchedulePage() {
  const { t } = useStudioI18n();
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();

  if (!agentId) {
    return (
      <Surface tone="panel" material="glass-regular" padding="lg">
        <InlineAlert tone="danger">{t('common.agentIdMissing')}</InlineAlert>
      </Surface>
    );
  }

  return (
    <AgentShell agentId={agentId} current="posts">
      {(agent) => (
        <>
          <WorkspaceIntro
            title={t('agent.schedule.title')}
            badges={
              <>
                <StatusBadge tone="warning">{t('common.appLocal')}</StatusBadge>
                <StatusBadge tone="neutral">{t('common.foregroundOnly')}</StatusBadge>
              </>
            }
            description={t('agent.schedule.description')}
            actions={
              <Button tone="ghost" onClick={() => navigate(`/portfolio/${agentId}/posts`)}>
                {t('agent.schedule.backToPosts')}
              </Button>
            }
          />

          <CreativePostWorkspace agent={agent} mode="schedule" />
        </>
      )}
    </AgentShell>
  );
}
