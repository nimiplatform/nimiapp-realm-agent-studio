import { useNavigate, useParams } from 'react-router-dom';
import { Button, InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import { CreativePostWorkspace } from '@renderer/features/portfolio/OwnerPortfolio.posts.js';
import { useStudioI18n } from '@renderer/i18n/use-studio-i18n.js';

export function AgentPostsPage() {
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
            title={t('agent.posts.title')}
            badges={<StatusBadge tone="info">{t('common.workspace')}</StatusBadge>}
            description={t('agent.posts.description')}
            actions={
              <Button tone="secondary" onClick={() => navigate(`/portfolio/${agentId}/posts/schedule`)}>
                {t('agent.posts.openSchedule')}
              </Button>
            }
          />

          <CreativePostWorkspace agent={agent} mode="posts" />
        </>
      )}
    </AgentShell>
  );
}
