import { useNavigate, useParams } from 'react-router-dom';
import { Button, InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import { CreativePostWorkspace } from '@renderer/features/portfolio/OwnerPortfolio.posts.js';

export function AgentPostsPage() {
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
    <AgentShell agentId={agentId} current="posts">
      {(agent) => (
        <>
          <WorkspaceIntro
            title="Agent-authored posts"
            badges={<StatusBadge tone="info">workspace</StatusBadge>}
            description="Draft a post from the agent's voice, ask Runtime for copy assistance, attach reviewed media, and publish through Realm."
            actions={
              <Button tone="secondary" onClick={() => navigate(`/portfolio/${agentId}/posts/schedule`)}>
                Open local schedule
              </Button>
            }
          />

          <CreativePostWorkspace agent={agent} mode="posts" />
        </>
      )}
    </AgentShell>
  );
}
