import { useNavigate, useParams } from 'react-router-dom';
import { Button, InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { useAppStore } from '@renderer/app-shell/app-store.js';
import { AgentProfileOverview } from './agent-profile-overview.js';
import { AgentShell } from './agent-shell.js';

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const handoff = useAppStore((s) => s.postCreateHandoff);
  const consumeHandoff = useAppStore((s) => s.consumePostCreateHandoff);

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
        <>
          <AgentProfileOverview agent={agent} />
          {handoff && handoff.agentId === agentId ? (
            <section className="ras-card ras-card--quiet">
              <div className="ras-handoff">
                <div className="ras-handoff__row">
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--nimi-text-primary)' }}>
                      Post-create draft preserved
                    </div>
                    <div className="ras-break-anywhere ras-text-muted ras-text-size-sm" style={{ marginTop: 4 }}>
                      @{handoff.handle} was created in {handoff.selectedWorldId}. Public bio continues through owner settings.
                    </div>
                  </div>
                  <StatusBadge tone={handoff.needsPostCreateSettings ? 'warning' : 'success'}>
                    {handoff.needsPostCreateSettings ? 'settings needed' : 'create complete'}
                  </StatusBadge>
                </div>
                {handoff.needsPostCreateSettings ? (
                  <>
                    <InlineAlert tone="warning">
                      Public bio was intentionally not included in the Realm create request and is still available for the reviewed settings step.
                    </InlineAlert>
                    <div className="ras-break-anywhere ras-handoff__bio">{handoff.publicBio}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                      <Button
                        tone="primary"
                        onClick={() => {
                          consumeHandoff(agentId);
                          navigate(`/portfolio/${agentId}/settings`);
                        }}
                      >
                        Continue to settings
                      </Button>
                      <Button tone="ghost" onClick={() => consumeHandoff(agentId)}>
                        Dismiss
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </section>
          ) : null}
        </>
      )}
    </AgentShell>
  );
}
