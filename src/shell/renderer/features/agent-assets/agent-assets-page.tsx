import { useParams } from 'react-router-dom';
import { InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import {
  type AgentDetailReadScope,
  useRefreshAgentReads,
} from '@renderer/features/agent-detail/use-agent-detail-query.js';
import { MediaVoiceCandidateWorkspace } from '@renderer/features/portfolio/OwnerPortfolio.assets.js';

function AgentAssetsPageForScope({ mode = 'owner' }: { mode?: AgentDetailReadScope }) {
  const { agentId } = useParams<{ agentId: string }>();
  const refreshAgentReads = useRefreshAgentReads(agentId ?? '', mode);

  if (!agentId) {
    return (
      <Surface tone="panel" material="glass-regular" padding="lg">
        <InlineAlert tone="danger">Agent id missing from route.</InlineAlert>
      </Surface>
    );
  }

  return (
    <AgentShell agentId={agentId} current="assets" mode={mode}>
      {(agent) => (
        <>
          <WorkspaceIntro
            title="Visual identity + voice"
            badges={<StatusBadge tone="info">workspace</StatusBadge>}
            description="Generate, upload, and review avatar, image, and voice candidates in one owner asset workflow."
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

export function CurationAgentAssetsPage() {
  return <AgentAssetsPageForScope mode="forge-imported-system" />;
}
