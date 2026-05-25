import { useNavigate, useParams } from 'react-router-dom';
import { Button, InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import { CreativePostWorkspace } from '@renderer/features/portfolio/OwnerPortfolio.posts.js';

export function AgentPostsSchedulePage() {
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
            title="Local post schedule"
            badges={
              <>
                <StatusBadge tone="warning">app-local</StatusBadge>
                <StatusBadge tone="neutral">foreground only</StatusBadge>
              </>
            }
            description="Hold one reviewed draft for a single local scheduled publish action. This is not a campaign or recurring queue — it executes only in the foreground when due."
            actions={
              <Button tone="ghost" onClick={() => navigate(`/portfolio/${agentId}/posts`)}>
                Back to posts
              </Button>
            }
          />

          <CreativePostWorkspace agent={agent} mode="schedule" />
        </>
      )}
    </AgentShell>
  );
}
