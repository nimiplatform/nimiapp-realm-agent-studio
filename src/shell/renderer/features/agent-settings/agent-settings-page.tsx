import { useNavigate, useParams } from 'react-router-dom';
import { Button, InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import {
  type AgentDetailReadScope,
  useRefreshAgentReads,
} from '@renderer/features/agent-detail/use-agent-detail-query.js';
import {
  RuntimeProjectionWorkspace,
  SettingProposalWorkspace,
  VisibilitySettingsWorkspace,
} from '@renderer/features/portfolio/OwnerPortfolio.settings.js';

function AgentSettingsPageForScope({ mode = 'owner' }: { mode?: AgentDetailReadScope }) {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const refreshAgentReads = useRefreshAgentReads(agentId ?? '', mode);
  const isOwnerMode = mode === 'owner';

  if (!agentId) {
    return (
      <Surface tone="panel" material="glass-regular" padding="lg">
        <InlineAlert tone="danger">Agent id missing from route.</InlineAlert>
      </Surface>
    );
  }

  return (
    <AgentShell agentId={agentId} current="settings" mode={mode}>
      {(agent) => (
        <>
          <WorkspaceIntro
            title="Agent settings"
            badges={<StatusBadge tone="info">workspace</StatusBadge>}
            description="Edit identity, communication, and boundary fields. Save flows through the admitted settings ingress for this agent source."
            actions={isOwnerMode ? (
              <Button tone="secondary" onClick={() => navigate(`/portfolio/${agentId}/settings/review`)}>
                Open consistency review
              </Button>
            ) : null}
          />

          {agent.ownerScope === 'owner-created' ? (
            <VisibilitySettingsWorkspace agent={agent} onAgentWrite={refreshAgentReads} />
          ) : null}
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

export function CurationAgentSettingsPage() {
  return <AgentSettingsPageForScope mode="forge-imported-system" />;
}
