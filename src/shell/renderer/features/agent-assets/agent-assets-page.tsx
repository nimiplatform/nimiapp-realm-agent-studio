import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import { useRefreshAgentReads } from '@renderer/features/agent-detail/use-agent-detail-query.js';
import { MediaVoiceCandidateWorkspace } from '@renderer/features/portfolio/OwnerPortfolio.assets.js';
import { loadLocalCreativeAssetHistory } from '@renderer/features/portfolio/creative-asset-history.js';
import type { OwnerPortfolioAgentDetail } from '@renderer/features/portfolio/portfolio-data.js';
import { useStudioI18n } from '@renderer/i18n/use-studio-i18n.js';

function IdentityCapabilityMap({ agent }: { agent: OwnerPortfolioAgentDetail }) {
  const { t } = useStudioI18n();
  const navigate = useNavigate();
  const history = useMemo(() => loadLocalCreativeAssetHistory(agent.id), [agent.id]);
  const visualCandidateCount = history.filter((record) => (
    record.kind === 'runtime-image-candidate'
    || record.kind === 'avatar-package-candidate'
    || record.kind === 'identity-resource-upload'
  )).length;
  const voiceCandidateCount = history.filter((record) => record.kind === 'voice-demo-candidate').length;

  return (
    <Surface tone="card" padding="md" className="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-[length:var(--nimi-type-body-size)] font-semibold">{t('agent.assets.capabilities.title')}</h2>
          <p className="m-0 mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
            {t('agent.assets.capabilities.description')}
          </p>
        </div>
        <Button tone="secondary" onClick={() => navigate(`/portfolio/${agent.id}/assets/voice`)}>
          {t('agent.assets.openVoiceConfig')}
        </Button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[var(--nimi-radius-field)] border border-[var(--nimi-border-subtle)] p-3">
          <StatusBadge tone={agent.avatarUrl ? 'success' : 'neutral'}>{t('agent.assets.capabilities.avatar.badge')}</StatusBadge>
          <h3 className="m-0 mt-2 text-[length:var(--nimi-type-body-sm-size)] font-semibold">{t('agent.assets.capabilities.avatar.title')}</h3>
          <p className="m-0 mt-1 text-[length:var(--nimi-type-body-xs-size)] text-[var(--nimi-text-muted)]">{t('agent.assets.capabilities.avatar.description')}</p>
        </div>
        <div className="rounded-[var(--nimi-radius-field)] border border-[var(--nimi-border-subtle)] p-3">
          <StatusBadge tone={visualCandidateCount > 0 ? 'warning' : 'neutral'}>
            {t('agent.assets.capabilities.visual.badge', { count: visualCandidateCount })}
          </StatusBadge>
          <h3 className="m-0 mt-2 text-[length:var(--nimi-type-body-sm-size)] font-semibold">{t('agent.assets.capabilities.visual.title')}</h3>
          <p className="m-0 mt-1 text-[length:var(--nimi-type-body-xs-size)] text-[var(--nimi-text-muted)]">{t('agent.assets.capabilities.visual.description')}</p>
        </div>
        <div className="rounded-[var(--nimi-radius-field)] border border-[var(--nimi-border-subtle)] p-3">
          <StatusBadge tone={voiceCandidateCount > 0 ? 'warning' : 'neutral'}>
            {t('agent.assets.capabilities.voice.badge', { count: voiceCandidateCount })}
          </StatusBadge>
          <h3 className="m-0 mt-2 text-[length:var(--nimi-type-body-sm-size)] font-semibold">{t('agent.assets.capabilities.voice.title')}</h3>
          <p className="m-0 mt-1 text-[length:var(--nimi-type-body-xs-size)] text-[var(--nimi-text-muted)]">{t('agent.assets.capabilities.voice.description')}</p>
        </div>
        <div className="rounded-[var(--nimi-radius-field)] border border-[var(--nimi-border-subtle)] p-3">
          <StatusBadge tone="warning">{t('agent.assets.capabilities.public.badge')}</StatusBadge>
          <h3 className="m-0 mt-2 text-[length:var(--nimi-type-body-sm-size)] font-semibold">{t('agent.assets.capabilities.public.title')}</h3>
          <p className="m-0 mt-1 text-[length:var(--nimi-type-body-xs-size)] text-[var(--nimi-text-muted)]">{t('agent.assets.capabilities.public.description')}</p>
        </div>
      </div>
    </Surface>
  );
}

function AgentAssetsPageForScope() {
  const { t } = useStudioI18n();
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const refreshAgentReads = useRefreshAgentReads(agentId ?? '');

  if (!agentId) {
    return (
      <Surface tone="panel" material="glass-regular" padding="lg">
        <InlineAlert tone="danger">{t('common.agentIdMissing')}</InlineAlert>
      </Surface>
    );
  }

  return (
    <AgentShell agentId={agentId} current="assets">
      {(agent) => (
        <>
          <WorkspaceIntro
            title={t('agent.assets.title')}
            badges={<StatusBadge tone="info">{t('common.workspace')}</StatusBadge>}
            description={t('agent.assets.description')}
            actions={
              <Button tone="secondary" onClick={() => navigate(`/portfolio/${agent.id}/assets/voice`)}>
                {t('agent.assets.openVoiceConfig')}
              </Button>
            }
          />

          <IdentityCapabilityMap agent={agent} />
          <MediaVoiceCandidateWorkspace agent={agent} onAgentWrite={refreshAgentReads} />
        </>
      )}
    </AgentShell>
  );
}

export function AgentAssetsPage() {
  return <AgentAssetsPageForScope />;
}
