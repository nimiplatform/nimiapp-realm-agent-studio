import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { loadLocalCreativeAssetHistory } from '@renderer/features/portfolio/creative-asset-history.js';
import { loadLocalPostSchedule } from '@renderer/features/portfolio/local-post-schedule-store.js';
import type { OwnerPortfolioAgentDetail } from '@renderer/features/portfolio/portfolio-data.js';
import { detailFriendCountLabel, settingFieldDisplayValue } from '@renderer/features/portfolio/OwnerPortfolio.shared.js';
import { useStudioI18n } from '@renderer/i18n/use-studio-i18n.js';
import type { StudioCopyKey } from '@renderer/i18n/studio-copy.js';
import type { StudioTranslateOptions } from '@renderer/i18n/studio-i18n.js';
import { AgentProfileOverview } from './agent-profile-overview.js';
import { WorkspaceIntro } from './agent-shell.js';
import {
  deriveAgentCockpitModel,
  type AgentCockpitAction,
  type AgentCockpitActionKey,
  type AgentCockpitCard,
  type AgentCockpitCardStatus,
} from './agent-cockpit-model.js';
import {
  deriveMaintenanceSuggestions,
  type MaintenanceSuggestion,
  type MaintenanceSuggestionPriority,
  type MaintenanceSuggestionRoute,
  type MaintenanceSuggestionStatus,
} from './maintenance-suggestion.js';

type StudioTranslator = (key: StudioCopyKey, options?: StudioTranslateOptions) => string;

function statusTone(status: AgentCockpitCardStatus | MaintenanceSuggestionStatus): 'success' | 'warning' | 'neutral' | 'info' {
  if (status === 'ready') return 'success';
  if (status === 'missing' || status === 'unavailable' || status === 'blocked') return 'warning';
  return 'neutral';
}

function actionPath(agentId: string, action: AgentCockpitAction): string {
  if (action.route === 'settings') return `/portfolio/${agentId}/settings`;
  if (action.route === 'assets') return `/portfolio/${agentId}/assets`;
  if (action.route === 'posts') return `/portfolio/${agentId}/posts`;
  return `/portfolio/${agentId}/insights`;
}

function suggestionPath(agentId: string, route: MaintenanceSuggestionRoute): string {
  if (route === 'settings') return `/portfolio/${agentId}/settings`;
  if (route === 'assets') return `/portfolio/${agentId}/assets`;
  if (route === 'posts') return `/portfolio/${agentId}/posts`;
  if (route === 'schedule') return `/portfolio/${agentId}/posts/schedule`;
  return `/portfolio/${agentId}/insights`;
}

const STATUS_LABEL_KEYS: Record<AgentCockpitCardStatus | MaintenanceSuggestionStatus, StudioCopyKey> = {
  ready: 'agent.cockpit.status.ready',
  missing: 'agent.cockpit.status.missing',
  unavailable: 'agent.cockpit.status.unavailable',
  blocked: 'agent.cockpit.status.blocked',
};

const PRIORITY_LABEL_KEYS: Record<MaintenanceSuggestionPriority, StudioCopyKey> = {
  high: 'agent.cockpit.priority.high',
  medium: 'agent.cockpit.priority.medium',
  low: 'agent.cockpit.priority.low',
};

const ACTION_LABEL_KEYS: Record<AgentCockpitActionKey, StudioCopyKey> = {
  'improve-settings': 'agent.cockpit.action.improveSettings.label',
  'generate-identity': 'agent.cockpit.action.generateIdentity.label',
  'create-post': 'agent.cockpit.action.createPost.label',
  'review-visibility': 'agent.cockpit.action.reviewVisibility.label',
  'inspect-source': 'agent.cockpit.action.inspectSource.label',
};

const ACTION_REASON_KEYS: Record<AgentCockpitActionKey, StudioCopyKey> = {
  'improve-settings': 'agent.cockpit.action.improveSettings.reason',
  'generate-identity': 'agent.cockpit.action.generateIdentity.reason',
  'create-post': 'agent.cockpit.action.createPost.reason',
  'review-visibility': 'agent.cockpit.action.reviewVisibility.reason',
  'inspect-source': 'agent.cockpit.action.inspectSource.reason',
};

const CARD_TITLE_KEYS: Record<AgentCockpitCard['key'], StudioCopyKey> = {
  profile: 'agent.cockpit.card.profile.title',
  'ai-readiness': 'agent.cockpit.card.aiReadiness.title',
  identity: 'agent.cockpit.card.identity.title',
  content: 'agent.cockpit.card.content.title',
  adoption: 'agent.cockpit.card.adoption.title',
};

const CARD_SUMMARY_KEYS: Record<string, StudioCopyKey> = {
  'Realm did not return all required profile fields.': 'agent.cockpit.card.profile.summary.unavailable',
  'Public profile needs owner-reviewed completion.': 'agent.cockpit.card.profile.summary.missing',
  'Public profile fields are source-backed.': 'agent.cockpit.card.profile.summary.ready',
  'Runtime actions can use only visible owner-approved profile fields and explicit owner prompts.': 'agent.cockpit.card.aiReadiness.summary',
  'Profile media source is unavailable from Realm.': 'agent.cockpit.card.identity.summary.unavailable',
  'Avatar, cover, or voice candidates need owner review.': 'agent.cockpit.card.identity.summary.missing',
  'Identity media has source-backed profile evidence.': 'agent.cockpit.card.identity.summary.ready',
  'Post drafts need stronger profile voice evidence before generation.': 'agent.cockpit.card.content.summary.missing',
  'Profile voice is available for owner-reviewed post drafting.': 'agent.cockpit.card.content.summary.ready',
  'friendCount source is unavailable; no fallback metric is shown.': 'agent.cockpit.card.adoption.summary.unavailable',
};

const EVIDENCE_LABEL_KEYS: Record<string, StudioCopyKey> = {
  'Display name': 'agent.cockpit.field.displayName',
  Handle: 'agent.cockpit.field.handle',
  'Profile description': 'agent.cockpit.field.profileDescription',
  Greeting: 'agent.cockpit.field.greeting',
  'Profile cover URL': 'agent.cockpit.field.profileCoverUrl',
  world: 'agent.cockpit.field.world',
  state: 'agent.cockpit.field.state',
  Avatar: 'agent.cockpit.field.avatar',
  'Voice config': 'agent.cockpit.field.voiceConfig',
  friendCount: 'agent.cockpit.field.friendCount',
};

const EVIDENCE_STATUS_KEYS: Record<string, StudioCopyKey> = {
  available: 'common.available',
  'not set': 'common.notSet',
  'source unavailable': 'common.sourceUnavailable',
  'runtime-image-candidate': 'agent.maintenance.kind.runtimeImageCandidate',
  'avatar-package-candidate': 'agent.maintenance.kind.avatarPackageCandidate',
  'identity-resource-upload': 'agent.maintenance.kind.identityResourceUpload',
  'voice-demo-candidate': 'agent.maintenance.kind.voiceDemoCandidate',
};

const SOURCE_LABEL_KEYS: Record<string, StudioCopyKey> = {
  'Realm MeService.getMyRealmAgent': 'agent.cockpit.source.realmDetail',
  'local workspace state': 'agent.cockpit.source.localWorkspace',
  'realm-agent-studio.local-creative-asset-history': 'agent.cockpit.source.localCreativeHistory',
  'realm-agent-studio.local-single-post-schedule-store': 'agent.cockpit.source.localSchedule',
};

const SIGNAL_LABEL_KEYS: Record<string, StudioCopyKey> = {
  'display name': 'agent.cockpit.field.displayName',
  handle: 'agent.cockpit.field.handle',
  'profile description': 'agent.cockpit.field.profileDescription',
  greeting: 'agent.cockpit.field.greeting',
  'profile cover URL': 'agent.cockpit.field.profileCoverUrl',
  world: 'agent.cockpit.field.world',
  state: 'agent.cockpit.field.state',
  avatar: 'agent.cockpit.field.avatar',
  friendCount: 'agent.cockpit.field.friendCount',
};

const MAINTENANCE_COPY_KEYS: Record<string, { title: StudioCopyKey; rationale: StudioCopyKey }> = {
  'profile-source-unavailable': {
    title: 'agent.maintenance.profileSourceUnavailable.title',
    rationale: 'agent.maintenance.profileSourceUnavailable.rationale',
  },
  'complete-profile-voice': {
    title: 'agent.maintenance.completeProfileVoice.title',
    rationale: 'agent.maintenance.completeProfileVoice.rationale',
  },
  'identity-source-unavailable': {
    title: 'agent.maintenance.identitySourceUnavailable.title',
    rationale: 'agent.maintenance.identitySourceUnavailable.rationale',
  },
  'generate-identity-pack': {
    title: 'agent.maintenance.generateIdentityPack.title',
    rationale: 'agent.maintenance.generateIdentityPack.rationale',
  },
  'review-local-creative-candidate': {
    title: 'agent.maintenance.reviewLocalCreativeCandidate.title',
    rationale: 'agent.maintenance.reviewLocalCreativeCandidate.rationale',
  },
  'content-source-unavailable': {
    title: 'agent.maintenance.contentSourceUnavailable.title',
    rationale: 'agent.maintenance.contentSourceUnavailable.rationale',
  },
  'strengthen-content-voice': {
    title: 'agent.maintenance.strengthenContentVoice.title',
    rationale: 'agent.maintenance.strengthenContentVoice.rationale',
  },
  'create-content-variant': {
    title: 'agent.maintenance.createContentVariant.title',
    rationale: 'agent.maintenance.createContentVariant.rationale',
  },
  'review-local-post-schedule': {
    title: 'agent.maintenance.reviewLocalPostSchedule.title',
    rationale: 'agent.maintenance.reviewLocalPostSchedule.rationale',
  },
  'friendcount-source-unavailable': {
    title: 'agent.maintenance.friendCountSourceUnavailable.title',
    rationale: 'agent.maintenance.friendCountSourceUnavailable.rationale',
  },
};

const MAINTENANCE_ACTION_KEYS: Record<MaintenanceSuggestionRoute, StudioCopyKey> = {
  settings: 'agent.maintenance.action.openSettings',
  assets: 'agent.maintenance.action.openAssets',
  posts: 'agent.maintenance.action.openPosts',
  schedule: 'agent.maintenance.action.openSchedule',
  insights: 'agent.maintenance.action.inspectSource',
};

function translateEvidenceItem(item: string, t: StudioTranslator): string {
  if (item.startsWith('Created: ')) {
    return t('agent.maintenance.created', { value: item.slice('Created: '.length) });
  }
  if (item.startsWith('Run at: ')) {
    return t('agent.maintenance.runAt', { value: item.slice('Run at: '.length) });
  }
  if (item === 'Scope: app-local foreground execution') {
    return t('agent.maintenance.scopeAppLocalForeground');
  }

  const separator = item.indexOf(': ');
  if (separator === -1) return item;
  const label = item.slice(0, separator);
  const status = item.slice(separator + 2);
  const labelText = EVIDENCE_LABEL_KEYS[label] ? t(EVIDENCE_LABEL_KEYS[label]) : label;
  const statusText = EVIDENCE_STATUS_KEYS[status] ? t(EVIDENCE_STATUS_KEYS[status]) : status;
  return t('agent.cockpit.evidence', { label: labelText, status: statusText });
}

function translateSignal(signal: string, t: StudioTranslator): string {
  return SIGNAL_LABEL_KEYS[signal] ? t(SIGNAL_LABEL_KEYS[signal]) : signal;
}

function translateSource(source: string, t: StudioTranslator): string {
  return SOURCE_LABEL_KEYS[source] ? t(SOURCE_LABEL_KEYS[source]) : source;
}

function translateCardSummary(card: AgentCockpitCard, agent: OwnerPortfolioAgentDetail, t: StudioTranslator): string {
  if (card.key === 'adoption' && agent.friendCount.status === 'available') {
    return t('agent.cockpit.card.adoption.summary.available', { count: agent.friendCount.value });
  }
  const key = CARD_SUMMARY_KEYS[card.summary];
  return key ? t(key) : card.summary;
}

function translateSuggestionTitle(suggestion: MaintenanceSuggestion, t: StudioTranslator): string {
  const copy = MAINTENANCE_COPY_KEYS[suggestion.id];
  return copy ? t(copy.title) : suggestion.title;
}

function translateSuggestionRationale(suggestion: MaintenanceSuggestion, t: StudioTranslator): string {
  const copy = MAINTENANCE_COPY_KEYS[suggestion.id];
  return copy ? t(copy.rationale) : suggestion.rationale;
}

export function AgentCockpit({ agent }: { agent: OwnerPortfolioAgentDetail }) {
  const { t } = useStudioI18n();
  const navigate = useNavigate();
  const model = deriveAgentCockpitModel(agent);
  const creativeHistory = useMemo(() => loadLocalCreativeAssetHistory(agent.id), [agent.id]);
  const localPostSchedule = useMemo(() => loadLocalPostSchedule(agent.id), [agent.id]);
  const suggestions = deriveMaintenanceSuggestions({ agent, creativeHistory, localPostSchedule });
  const actionsByKey = new Map(model.actions.map((action) => [action.key, action]));

  return (
    <>
      <WorkspaceIntro
        title={t('agent.cockpit.title')}
        badges={
          <>
            <StatusBadge tone="info">{t('common.sourceBacked')}</StatusBadge>
            <StatusBadge tone={model.unavailableSignals.length > 0 ? 'warning' : 'success'}>
              {model.unavailableSignals.length > 0 ? t('agent.cockpit.sourceGaps') : t('agent.cockpit.sourcesAvailable')}
            </StatusBadge>
          </>
        }
        description={t('agent.cockpit.description')}
        actions={(
          <>
            <Button tone="secondary" onClick={() => navigate(`/portfolio/${agent.id}/preview`)}>
              {t('agent.cockpit.openPreview')}
            </Button>
            <Button tone="ghost" onClick={() => navigate(`/portfolio/${agent.id}/posts/manage`)}>
              {t('agent.cockpit.openDraftBox')}
            </Button>
          </>
        )}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <AgentProfileOverview agent={agent} compact />

          <Surface tone="panel" material="glass-regular" padding="lg" className="ras-radius-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="m-0 text-[length:var(--nimi-type-body-size)] font-semibold">{t('agent.cockpit.nextActions')}</h3>
                <p className="m-0 mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                  {t('agent.cockpit.nextActionsDescription')}
                </p>
              </div>
              <StatusBadge tone="neutral">{t('agent.cockpit.noPrivateRuntimeState')}</StatusBadge>
            </div>
            {model.unavailableSignals.length > 0 ? (
              <InlineAlert tone="warning" className="mt-3">
                {t('agent.cockpit.sourceUnavailable', {
                  fields: model.unavailableSignals.map((signal) => translateSignal(signal, t)).join(', '),
                })}
              </InlineAlert>
            ) : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {model.actions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  onClick={() => navigate(actionPath(agent.id, action))}
                  className="rounded-[var(--nimi-radius-card)] border border-[var(--nimi-border-subtle)] bg-[var(--nimi-surface-card)] p-3 text-left transition hover:border-[var(--nimi-action-primary-bg)]"
                >
                  <div className="font-medium">{t(ACTION_LABEL_KEYS[action.key])}</div>
                  <div className="mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                    {t(ACTION_REASON_KEYS[action.key])}
                  </div>
                </button>
              ))}
            </div>
          </Surface>

          <Surface tone="panel" material="glass-regular" padding="lg" className="ras-radius-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="m-0 text-[length:var(--nimi-type-body-size)] font-semibold">{t('agent.cockpit.maintenanceSuggestions')}</h3>
                <p className="m-0 mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                  {t('agent.cockpit.maintenanceDescription')}
                </p>
              </div>
              <StatusBadge tone="info">{t('agent.cockpit.candidateGuidance')}</StatusBadge>
            </div>
            <div className="mt-4 grid gap-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="rounded-[var(--nimi-radius-card)] border border-[var(--nimi-border-subtle)] bg-[var(--nimi-surface-card)] p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{translateSuggestionTitle(suggestion, t)}</div>
                      <p className="m-0 mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                        {translateSuggestionRationale(suggestion, t)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={statusTone(suggestion.status)}>{t(STATUS_LABEL_KEYS[suggestion.status])}</StatusBadge>
                      <StatusBadge tone="neutral">{t(PRIORITY_LABEL_KEYS[suggestion.priority])}</StatusBadge>
                    </div>
                  </div>
                  <ul className="m-0 mt-3 grid list-none gap-1 p-0 text-[length:var(--nimi-type-body-sm-size)]">
                    {suggestion.evidence.map((item) => (
                      <li key={item} className="ras-break-anywhere text-[var(--nimi-text-secondary)]">{translateEvidenceItem(item, t)}</li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      tone="secondary"
                      size="sm"
                      onClick={() => navigate(suggestionPath(agent.id, suggestion.action.route))}
                    >
                      {t(MAINTENANCE_ACTION_KEYS[suggestion.action.route])}
                    </Button>
                    <span className="text-[length:var(--nimi-type-body-xs-size)] text-[var(--nimi-text-muted)]">
                      {suggestion.sources.map((source) => translateSource(source, t)).join(' + ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Surface>

          <div className="grid gap-3 md:grid-cols-2">
            {model.cards.map((card) => (
              <Surface key={card.key} tone="card" padding="md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{t(CARD_TITLE_KEYS[card.key])}</div>
                  <StatusBadge tone={statusTone(card.status)}>{t(STATUS_LABEL_KEYS[card.status])}</StatusBadge>
                </div>
                <p className="m-0 mt-2 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                  {translateCardSummary(card, agent, t)}
                </p>
                <ul className="m-0 mt-3 grid list-none gap-1 p-0 text-[length:var(--nimi-type-body-sm-size)]">
                  {card.evidence.map((item) => (
                    <li key={item} className="ras-break-anywhere text-[var(--nimi-text-secondary)]">{translateEvidenceItem(item, t)}</li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  {card.actions.map((actionKey) => {
                    const action = actionsByKey.get(actionKey);
                    if (!action) return null;
                    return (
                      <Button
                        key={actionKey}
                        tone="secondary"
                        size="sm"
                        onClick={() => navigate(actionPath(agent.id, action))}
                      >
                        {t(ACTION_LABEL_KEYS[action.key])}
                      </Button>
                    );
                  })}
                </div>
              </Surface>
            ))}
          </div>
        </div>

        <Surface tone="panel" material="glass-regular" padding="lg" className="ras-radius-xl">
          <div className="grid gap-3">
            <div>
              <h3 className="m-0 text-[length:var(--nimi-type-body-size)] font-semibold">{t('agent.cockpit.sourceInventory')}</h3>
              <p className="m-0 mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                {t('agent.cockpit.currentSource', { source: translateSource(agent.source, t) })}
              </p>
            </div>
            {([
              [t('agent.cockpit.inventory.displayName'), settingFieldDisplayValue(agent.displayName, t('common.notSet'), t)],
              [t('agent.cockpit.inventory.handle'), settingFieldDisplayValue(agent.handle, t('common.notSet'), t)],
              [t('agent.cockpit.inventory.profileDescription'), settingFieldDisplayValue(agent.bio, t('common.notSet'), t)],
              [t('agent.cockpit.inventory.greeting'), settingFieldDisplayValue(agent.greeting, t('common.notSet'), t)],
              [t('agent.cockpit.inventory.world'), settingFieldDisplayValue(agent.world, t('common.notSet'), t)],
              [t('agent.cockpit.inventory.state'), settingFieldDisplayValue(agent.state, t('common.notSet'), t)],
              [t('agent.cockpit.inventory.profileCover'), settingFieldDisplayValue(agent.profileCoverUrl, t('common.notSet'), t)],
              [t('agent.cockpit.inventory.avatar'), agent.avatarUrl || t('common.notSet')],
              ['friendCount', detailFriendCountLabel(agent, t)],
            ] as const).map(([label, value]) => (
              <div key={label} className="grid gap-1 rounded-[var(--nimi-radius-field)] border border-[var(--nimi-border-subtle)] bg-[var(--nimi-surface-card)] p-2">
                <div className="text-[length:var(--nimi-type-body-xs-size)] font-semibold uppercase text-[var(--nimi-text-muted)]">{label}</div>
                <div className="ras-break-anywhere text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-primary)]">{value}</div>
              </div>
            ))}
          </div>
        </Surface>
      </div>
    </>
  );
}
