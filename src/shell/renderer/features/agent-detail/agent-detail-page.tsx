import { useParams } from 'react-router-dom';
import { InlineAlert, Surface } from '@nimiplatform/kit/ui';
import { useStudioI18n } from '@renderer/i18n/use-studio-i18n.js';
import { AgentCockpit } from './agent-cockpit.js';
import { AgentShell } from './agent-shell.js';

function AgentDetailPageForScope() {
  const { t } = useStudioI18n();
  const { agentId } = useParams<{ agentId: string }>();

  if (!agentId) {
    return (
      <Surface tone="panel" material="glass-regular" padding="lg">
        <InlineAlert tone="danger">{t('common.agentIdMissing')}</InlineAlert>
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
