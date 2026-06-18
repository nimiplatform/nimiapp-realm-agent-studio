import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Image, MessageSquareText, Mic2, UserRound } from 'lucide-react';
import { Button, EmptyState, InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import { loadLocalCreativeAssetHistory, type CreativeAssetHistoryRecord } from '@renderer/features/portfolio/creative-asset-history.js';
import { loadLocalPostSchedule } from '@renderer/features/portfolio/local-post-schedule-store.js';
import type { OwnerPortfolioAgentDetail, SettingField } from '@renderer/features/portfolio/portfolio-data.js';
import { settingFieldDisplayValue } from '@renderer/features/portfolio/OwnerPortfolio.shared.js';
import { useStudioI18n } from '@renderer/i18n/use-studio-i18n.js';

function hasValue(field: SettingField): boolean {
  return field.status === 'available' && field.value.trim().length > 0;
}

function latestHistory(records: readonly CreativeAssetHistoryRecord[], kind: CreativeAssetHistoryRecord['kind']) {
  return records.find((record) => record.kind === kind) ?? null;
}

function PreviewBody({ agent }: { agent: OwnerPortfolioAgentDetail }) {
  const { t } = useStudioI18n();
  const navigate = useNavigate();
  const creativeHistory = useMemo(() => loadLocalCreativeAssetHistory(agent.id), [agent.id]);
  const localSchedule = useMemo(() => loadLocalPostSchedule(agent.id), [agent.id]);
  const visualCandidate = latestHistory(creativeHistory, 'runtime-image-candidate')
    ?? latestHistory(creativeHistory, 'avatar-package-candidate')
    ?? latestHistory(creativeHistory, 'identity-resource-upload');
  const voiceCandidate = latestHistory(creativeHistory, 'voice-demo-candidate');
  const profileCoverAvailable = hasValue(agent.profileCoverUrl);

  return (
    <>
      <WorkspaceIntro
        title={t('preview.title')}
        badges={
          <>
            <StatusBadge tone="info">{t('preview.badge')}</StatusBadge>
            <StatusBadge tone="warning">{t('preview.notPublicBadge')}</StatusBadge>
          </>
        }
        description={t('preview.description')}
        actions={
          <>
            <Button tone="secondary" onClick={() => navigate(`/portfolio/${agent.id}/settings`)}>
              {t('preview.editProfile')}
            </Button>
            <Button tone="ghost" onClick={() => navigate(`/portfolio/${agent.id}/launch`)}>
              {t('preview.backToLaunch')}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Surface tone="panel" material="glass-regular" padding="lg" className="ras-radius-xl overflow-hidden">
          <div className="overflow-hidden rounded-[var(--nimi-radius-panel)] border border-[var(--nimi-border-subtle)] bg-[var(--nimi-surface-card)]">
            <div className="relative min-h-52 bg-[var(--nimi-surface-panel)]">
              {profileCoverAvailable ? (
                <img src={agent.profileCoverUrl.value} alt="" className="absolute inset-0 h-full w-full object-cover" />
              ) : agent.avatarUrl ? (
                <img src={agent.avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
              ) : (
                <div className="flex min-h-52 items-center justify-center text-[var(--nimi-text-muted)]">
                  <Image size={36} strokeWidth={1.6} />
                </div>
              )}
              <div className="absolute bottom-4 left-4 right-4 flex items-end gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--nimi-border-subtle)] bg-[var(--nimi-surface-card)]">
                  {agent.avatarUrl ? (
                    <img src={agent.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <UserRound size={30} strokeWidth={1.8} />
                  )}
                </div>
                <div className="min-w-0 rounded-[var(--nimi-radius-field)] bg-[color-mix(in_srgb,var(--nimi-surface-card)_88%,transparent)] p-3">
                  <h2 className="m-0 text-xl font-semibold">{settingFieldDisplayValue(agent.displayName, t('shared.displayNameNotSet'), t)}</h2>
                  <p className="m-0 mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                    {agent.handle.value ? `@${agent.handle.value}` : settingFieldDisplayValue(agent.handle, t('shared.handleNotSet'), t)}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 p-4">
              <div>
                <div className="text-[length:var(--nimi-type-body-xs-size)] font-semibold uppercase text-[var(--nimi-text-muted)]">{t('preview.publicDescription')}</div>
                <p className="ras-break-anywhere m-0 mt-1 text-[var(--nimi-text-primary)]">
                  {settingFieldDisplayValue(agent.bio, t('shared.profileDescriptionNotSet'), t)}
                </p>
              </div>
              <div>
                <div className="text-[length:var(--nimi-type-body-xs-size)] font-semibold uppercase text-[var(--nimi-text-muted)]">{t('preview.greeting')}</div>
                <p className="ras-break-anywhere m-0 mt-1 text-[var(--nimi-text-primary)]">
                  {settingFieldDisplayValue(agent.greeting, t('common.notSet'), t)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={agent.displayName.status === 'available' ? 'success' : 'warning'}>{t('preview.source.profile')}</StatusBadge>
                <StatusBadge tone={profileCoverAvailable ? 'success' : 'neutral'}>
                  {profileCoverAvailable ? t('preview.source.coverAvailable') : t('preview.source.coverMissing')}
                </StatusBadge>
                <StatusBadge tone="neutral">{settingFieldDisplayValue(agent.world, t('shared.worldNotSet'), t)}</StatusBadge>
              </div>
            </div>
          </div>
        </Surface>

        <div className="grid gap-4 content-start">
          <Surface tone="card" padding="md">
            <div className="flex items-center gap-2">
              <Mic2 size={17} strokeWidth={1.8} />
              <h3 className="m-0 text-[length:var(--nimi-type-body-size)] font-semibold">{t('preview.voice.title')}</h3>
            </div>
            {voiceCandidate ? (
              <>
                <p className="ras-break-anywhere m-0 mt-2 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-primary)]">
                  {voiceCandidate.detail}
                </p>
                <StatusBadge tone="warning">{t('preview.localCandidate')}</StatusBadge>
              </>
            ) : (
              <>
                <EmptyState title={t('preview.voice.emptyTitle')} description={t('preview.voice.emptyDescription')} />
                <Button tone="secondary" className="mt-3" onClick={() => navigate(`/portfolio/${agent.id}/assets/voice`)}>
                  {t('preview.voice.configure')}
                </Button>
              </>
            )}
          </Surface>

          <Surface tone="card" padding="md">
            <div className="flex items-center gap-2">
              <Image size={17} strokeWidth={1.8} />
              <h3 className="m-0 text-[length:var(--nimi-type-body-size)] font-semibold">{t('preview.identity.title')}</h3>
            </div>
            {visualCandidate ? (
              <>
                <p className="ras-break-anywhere m-0 mt-2 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-primary)]">
                  {visualCandidate.detail}
                </p>
                <StatusBadge tone="warning">{t('preview.localCandidate')}</StatusBadge>
              </>
            ) : (
              <EmptyState title={t('preview.identity.emptyTitle')} description={t('preview.identity.emptyDescription')} />
            )}
          </Surface>

          <Surface tone="card" padding="md">
            <div className="flex items-center gap-2">
              <MessageSquareText size={17} strokeWidth={1.8} />
              <h3 className="m-0 text-[length:var(--nimi-type-body-size)] font-semibold">{t('preview.content.title')}</h3>
            </div>
            {localSchedule ? (
              <>
                <p className="ras-break-anywhere m-0 mt-2 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-primary)]">
                  {localSchedule.candidate.postCandidate.realmCreatePost.caption || t('preview.content.scheduledFallback')}
                </p>
                <StatusBadge tone="warning">{t('preview.localSchedule')}</StatusBadge>
              </>
            ) : (
              <EmptyState title={t('preview.content.emptyTitle')} description={t('preview.content.emptyDescription')} />
            )}
          </Surface>

          <InlineAlert tone="info">
            {t('preview.boundary')}
          </InlineAlert>
        </div>
      </div>
    </>
  );
}

export function AgentPublicPreviewPage() {
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
      {(agent) => <PreviewBody agent={agent} />}
    </AgentShell>
  );
}
