import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import { CreativePostWorkspace } from '@renderer/features/portfolio/OwnerPortfolio.posts.js';
import { buildDraftBoxEntries } from '@renderer/features/portfolio/draft-box.js';
import { loadLocalCreativeAssetHistory } from '@renderer/features/portfolio/creative-asset-history.js';
import { loadLocalPostSchedule } from '@renderer/features/portfolio/local-post-schedule-store.js';
import type { OwnerPortfolioAgentDetail } from '@renderer/features/portfolio/portfolio-data.js';
import { useStudioI18n } from '@renderer/i18n/use-studio-i18n.js';

function ContentOperationsSummary({ agent }: { agent: OwnerPortfolioAgentDetail }) {
  const { t } = useStudioI18n();
  const navigate = useNavigate();
  const creativeHistory = useMemo(() => loadLocalCreativeAssetHistory(agent.id), [agent.id]);
  const localSchedule = useMemo(() => loadLocalPostSchedule(agent.id), [agent.id]);
  const draftCount = useMemo(() => buildDraftBoxEntries({
    agentId: agent.id,
    creativeHistory,
    localSchedule,
  }).length, [agent.id, creativeHistory, localSchedule]);

  return (
    <Surface tone="card" padding="md" className="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[length:var(--nimi-type-body-size)] font-semibold">{t('agent.posts.operations.title')}</h2>
          <p className="m-0 mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
            {t('agent.posts.operations.description')}
          </p>
        </div>
        <Button tone="secondary" onClick={() => navigate(`/portfolio/${agent.id}/posts/manage`)}>
          {t('agent.posts.openManagement')}
        </Button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-[var(--nimi-radius-field)] border border-[var(--nimi-border-subtle)] p-3">
          <StatusBadge tone={draftCount > 0 ? 'warning' : 'neutral'}>
            {t('agent.posts.operations.draftBadge', { count: draftCount })}
          </StatusBadge>
          <h3 className="m-0 mt-2 text-[length:var(--nimi-type-body-sm-size)] font-semibold">{t('agent.posts.operations.draftTitle')}</h3>
          <p className="m-0 mt-1 text-[length:var(--nimi-type-body-xs-size)] text-[var(--nimi-text-muted)]">{t('agent.posts.operations.draftDescription')}</p>
        </div>
        <div className="rounded-[var(--nimi-radius-field)] border border-[var(--nimi-border-subtle)] p-3">
          <StatusBadge tone={localSchedule ? 'warning' : 'neutral'}>
            {localSchedule ? t('agent.posts.operations.scheduleSaved') : t('agent.posts.operations.scheduleEmpty')}
          </StatusBadge>
          <h3 className="m-0 mt-2 text-[length:var(--nimi-type-body-sm-size)] font-semibold">{t('agent.posts.operations.scheduleTitle')}</h3>
          <p className="m-0 mt-1 text-[length:var(--nimi-type-body-xs-size)] text-[var(--nimi-text-muted)]">{t('agent.posts.operations.scheduleDescription')}</p>
        </div>
        <div className="rounded-[var(--nimi-radius-field)] border border-[var(--nimi-border-subtle)] p-3">
          <StatusBadge tone="info">{t('agent.posts.operations.publishBadge')}</StatusBadge>
          <h3 className="m-0 mt-2 text-[length:var(--nimi-type-body-sm-size)] font-semibold">{t('agent.posts.operations.publishTitle')}</h3>
          <p className="m-0 mt-1 text-[length:var(--nimi-type-body-xs-size)] text-[var(--nimi-text-muted)]">{t('agent.posts.operations.publishDescription')}</p>
        </div>
      </div>
    </Surface>
  );
}

export function AgentPostsPage() {
  const { t } = useStudioI18n();
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();

  if (!agentId) {
    return (
      <Surface tone="panel" material="glass-regular" padding="lg">
        <InlineAlert tone="danger">{t('common.agentIdMissing')}</InlineAlert>
      </Surface>
    );
  }

  return (
    <AgentShell agentId={agentId} current="posts">
      {(agent) => (
        <>
          <WorkspaceIntro
            title={t('agent.posts.title')}
            badges={<StatusBadge tone="info">{t('common.workspace')}</StatusBadge>}
            description={t('agent.posts.description')}
            actions={
              <>
                <Button tone="secondary" onClick={() => navigate(`/portfolio/${agentId}/posts/manage`)}>
                  {t('agent.posts.openManagement')}
                </Button>
                <Button tone="ghost" onClick={() => navigate(`/portfolio/${agentId}/posts/schedule`)}>
                  {t('agent.posts.openSchedule')}
                </Button>
              </>
            }
          />

          <ContentOperationsSummary agent={agent} />
          <CreativePostWorkspace agent={agent} mode="posts" />
        </>
      )}
    </AgentShell>
  );
}
