import { useNavigate, useParams } from 'react-router-dom';
import { Button, InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import { useRefreshOwnerAgentReads } from '@renderer/features/agent-detail/use-agent-detail-query.js';
import {
  RuntimeProjectionWorkspace,
  SettingProposalWorkspace,
  VisibilitySettingsWorkspace,
} from '@renderer/features/portfolio/OwnerPortfolio.settings.js';

export function AgentSettingsPage() {
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
    <AgentShell agentId={agentId} current="settings">
      {(agent) => (
        <>
          <WorkspaceIntro
            title="Agent settings"
            badges={<StatusBadge tone="info">workspace</StatusBadge>}
            description="Edit identity, communication, and boundary fields. Save flows through the admitted settings ingress for this agent source."
            actions={
              <Button tone="secondary" onClick={() => navigate(`/portfolio/${agentId}/settings/review`)}>
                Open consistency review
              </Button>
            }
          />

          {agent.ownerScope === 'owner-created' ? (
            <VisibilitySettingsWorkspace agent={agent} onAgentWrite={refreshOwnerAgentReads} />
          ) : null}
          <SettingProposalWorkspace agent={agent} onAgentWrite={refreshOwnerAgentReads} />
          <RuntimeProjectionWorkspace agent={agent} />
        </>
      )}
    </AgentShell>
  );
}
