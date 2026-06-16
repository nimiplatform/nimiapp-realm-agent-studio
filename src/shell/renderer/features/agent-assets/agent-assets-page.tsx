import { useParams } from 'react-router-dom';
import { InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import { useRefreshAgentReads } from '@renderer/features/agent-detail/use-agent-detail-query.js';
import { MediaVoiceCandidateWorkspace } from '@renderer/features/portfolio/OwnerPortfolio.assets.js';
import { useStudioI18n } from '@renderer/i18n/use-studio-i18n.js';

function AgentAssetsPageForScope() {
  const { t } = useStudioI18n();
  const { agentId } = useParams<{ agentId: string }>();
  const refreshAgentReads = useRefreshAgentReads(agentId ?? '');

  if (!agentId) {
    return (
      <Surface tone="panel" material="glass-regular" padding="lg">
        <InlineAlert tone="danger">{t('common.agentIdMissing')}</InlineAlert>
      </Surface>
    );
  }

  return (
    <AgentShell agentId={agentId} current="assets">
      {(agent) => (
        <>
          <WorkspaceIntro
            title={t('agent.assets.title')}
            badges={<StatusBadge tone="info">{t('common.workspace')}</StatusBadge>}
            description={t('agent.assets.description')}
          />

          <MediaVoiceCandidateWorkspace agent={agent} onAgentWrite={refreshAgentReads} />
        </>
      )}
    </AgentShell>
  );
}

export function AgentAssetsPage() {
  return <AgentAssetsPageForScope />;
}
