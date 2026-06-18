import { useNavigate } from 'react-router-dom';
import { CreateRealmAgentWorkspace } from '@renderer/features/portfolio/CreateRealmAgentWorkspace.js';

export function AgentCreatePage() {
  const navigate = useNavigate();

  return (
    <CreateRealmAgentWorkspace
      onOpenCreatedAgent={(agentId, target) => {
        if (target === 'launch') {
          navigate(`/portfolio/${agentId}/launch`);
          return;
        }
        if (target === 'settings') {
          navigate(`/portfolio/${agentId}/settings`);
          return;
        }
        navigate(`/portfolio/${agentId}`);
      }}
    />
  );
}
