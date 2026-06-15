import { useParams } from 'react-router-dom';
import { InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import { useRefreshOwnerAgentReads } from '@renderer/features/agent-detail/use-agent-detail-query.js';
import { MediaVoiceCandidateWorkspace } from '@renderer/features/portfolio/OwnerPortfolio.assets.js';

export function AgentAssetsPage() {
  const { agentId } = useParams<{ agentId: string }>();

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
            description="Generate, upload, and review avatar, image, and voice candidates in one owner asset workflow."
          />

          <MediaVoiceCandidateWorkspace agent={agent} onAgentWrite={refreshOwnerAgentReads} />
        </>
      )}
    </AgentShell>
  );
}
