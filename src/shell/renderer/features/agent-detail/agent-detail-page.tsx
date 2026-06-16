import { useParams } from 'react-router-dom';
import { InlineAlert, Surface } from '@nimiplatform/kit/ui';
import { AgentCockpit } from './agent-cockpit.js';
import { AgentShell } from './agent-shell.js';

function AgentDetailPageForScope() {
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
        <AgentCockpit agent={agent} />
      )}
    </AgentShell>
  );
}

export function AgentDetailPage() {
  return <AgentDetailPageForScope />;
}
