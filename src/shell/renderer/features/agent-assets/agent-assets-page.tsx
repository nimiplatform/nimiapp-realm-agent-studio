import { useNavigate, useParams } from 'react-router-dom';
import { Button, InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import { useRefreshOwnerAgentReads } from '@renderer/features/agent-detail/use-agent-detail-query.js';
import { MediaVoiceCandidateWorkspace } from '@renderer/features/portfolio/OwnerPortfolio.assets.js';

export function AgentAssetsPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();

  if (!agentId) {
    return (
      <Surface tone="panel" material="glass-regular" padding="lg">
        <InlineAlert tone="danger">Agent id missing from route.</InlineAlert>
      </Surface>
    );
  }

  const refreshOwnerAgentReads = useRefreshOwnerAgentReads(agentId);

  return (
    <AgentShell agentId={agentId} current="assets">
      {(agent) => (
        <>
          <WorkspaceIntro
            title="Visual identity + voice"
            badges={<StatusBadge tone="info">workspace</StatusBadge>}
            description="Generate, upload, and select avatar / cover / post image candidates. Voice demo candidates have their own page for focused review."
            actions={
              <Button tone="secondary" onClick={() => navigate(`/portfolio/${agentId}/assets/voice`)}>
                Open voice candidates
              </Button>
            }
          />

          <MediaVoiceCandidateWorkspace agent={agent} onAgentWrite={refreshOwnerAgentReads} />
        </>
      )}
    </AgentShell>
  );
}
