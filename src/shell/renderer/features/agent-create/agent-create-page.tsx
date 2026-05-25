import { useNavigate } from 'react-router-dom';
import { CreateRealmAgentWorkspace } from '@renderer/features/portfolio/CreateRealmAgentWorkspace.js';
import { useAppStore } from '@renderer/app-shell/app-store.js';

export function AgentCreatePage() {
  const navigate = useNavigate();
  const setHandoff = useAppStore((s) => s.setPostCreateHandoff);

  return (
    <CreateRealmAgentWorkspace
      onCreated={(context) => {
        setHandoff({
          agentId: context.agentId,
          handle: context.handle,
          publicBio: context.publicBio,
          selectedWorldId: context.selectedWorldId,
          needsPostCreateSettings: context.needsPostCreateSettings,
        });
      }}
      onOpenCreatedAgent={(agentId, target) => {
        if (target === 'settings') {
          navigate(`/portfolio/${agentId}/settings`);
          return;
        }
        navigate(`/portfolio/${agentId}`);
      }}
    />
  );
}
