import { useNavigate, useParams } from 'react-router-dom';
import { Button, InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import { useRefreshAgentReads } from '@renderer/features/agent-detail/use-agent-detail-query.js';
import {
  RuntimeProjectionWorkspace,
  SettingProposalWorkspace,
  VisibilitySettingsWorkspace,
} from '@renderer/features/portfolio/OwnerPortfolio.settings.js';

function AgentSettingsPageForScope() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const refreshAgentReads = useRefreshAgentReads(agentId ?? '');

  if (!agentId) {
    return (
      <Surface tone="panel" material="glass-regular" padding="lg">
        <InlineAlert tone="danger">Agent id missing from route.</InlineAlert>
      </Surface>
    );
  }

  return (
    <AgentShell agentId={agentId} current="settings">
      {(agent) => (
        <>
          <WorkspaceIntro
            title="Agent settings"
            badges={<StatusBadge tone="info">workspace</StatusBadge>}
            description="Edit owner Realm Agent identity, communication, and boundary fields through the admitted owner settings ingress."
            actions={(
              <Button tone="secondary" onClick={() => navigate(`/portfolio/${agentId}/settings/review`)}>
                Open consistency review
              </Button>
            )}
          />

          <VisibilitySettingsWorkspace agent={agent} onAgentWrite={refreshAgentReads} />
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
