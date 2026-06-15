import { useParams } from 'react-router-dom';
import { InlineAlert, Surface } from '@nimiplatform/kit/ui';
import { AgentProfileOverview } from './agent-profile-overview.js';
import { AgentShell } from './agent-shell.js';

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();

  if (!agentId) {
    return (
      <Surface tone="panel" material="glass-regular" padding="lg">
        <InlineAlert tone="danger">Agent id missing from route.</InlineAlert>
      </Surface>
    );
  }

  return (
    <AgentShell agentId={agentId} current="detail">
      {(agent) => (
        <AgentProfileOverview agent={agent} />
      )}
    </AgentShell>
  );
}
