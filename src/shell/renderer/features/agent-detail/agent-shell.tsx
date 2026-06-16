import { type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  Avatar,
  BackLink,
  Button,
  EmptyState,
  InlineAlert,
  PillTabs,
  ScrollArea,
  StatusBadge,
  Surface,
} from '@nimiplatform/kit/ui';
import type { OwnerPortfolioAgentDetail } from '@renderer/features/portfolio/portfolio-data.js';
import { classifyAgentDetailFailure } from '@renderer/features/portfolio/portfolio-data.js';
import {
  detailFriendCountLabel,
  settingFieldDisplayValue,
} from '@renderer/features/portfolio/OwnerPortfolio.shared.js';
import { useStudioI18n } from '@renderer/i18n/use-studio-i18n.js';
import type { StudioCopyKey } from '@renderer/i18n/studio-copy.js';
import { type AgentDetailReadScope, useAgentDetailQuery } from './use-agent-detail-query.js';

export type AgentShellTabKey = 'detail' | 'settings' | 'assets' | 'posts' | 'insights';
export type AgentShellMode = AgentDetailReadScope;

type AgentTabDef = {
  key: AgentShellTabKey;
  labelKey: StudioCopyKey;
  basePath: (agentId: string, mode: AgentShellMode) => string;
  modes: readonly AgentShellMode[];
};

const TABS: AgentTabDef[] = [
  {
    key: 'detail',
    labelKey: 'agent.tabs.detail',
    modes: ['owner'],
    basePath: (agentId) => `/portfolio/${agentId}`,
  },
  {
    key: 'settings',
    labelKey: 'agent.tabs.settings',
    modes: ['owner'],
    basePath: (agentId) => `/portfolio/${agentId}/settings`,
  },
  {
    key: 'assets',
    labelKey: 'agent.tabs.assets',
    modes: ['owner'],
    basePath: (agentId) => `/portfolio/${agentId}/assets`,
  },
  {
    key: 'posts',
    labelKey: 'agent.tabs.posts',
    modes: ['owner'],
    basePath: (agentId) => `/portfolio/${agentId}/posts`,
  },
  {
    key: 'insights',
    labelKey: 'agent.tabs.insights',
    modes: ['owner'],
    basePath: (agentId) => `/portfolio/${agentId}/insights`,
  },
];

export function AgentTabBar({
  agentId,
  current,
  mode = 'owner',
}: {
  agentId: string;
  current: AgentShellTabKey;
  mode?: AgentShellMode;
}) {
  const { t } = useStudioI18n();
  const navigate = useNavigate();
  const tabs = TABS.filter((tab) => tab.modes.includes(mode));
  return (
    <PillTabs
      ariaLabel={t('agent.tabs.ariaLabel')}
      size="md"
      value={current}
      onValueChange={(value) => {
        const next = tabs.find((tab) => tab.key === value);
        if (next) navigate(next.basePath(agentId, mode));
      }}
      items={tabs.map((tab) => ({ value: tab.key, label: t(tab.labelKey) }))}
    />
  );
}

export function AgentHeader({
  agent,
  back = '/portfolio',
  backLabel,
}: {
  agent: OwnerPortfolioAgentDetail;
  back?: string;
  backLabel?: string;
}) {
  const { t } = useStudioI18n();
  const resolvedBackLabel = backLabel ?? t('agent.header.portfolio');
  return (
    <section className="ras-card">
      <div className="ras-agent-header">
        <BackLink asChild>
          <NavLink to={back} aria-label={t('agent.header.backTo', { label: resolvedBackLabel })}>
            <ArrowLeft size={15} strokeWidth={1.8} style={{ marginRight: 4 }} />
            {resolvedBackLabel}
          </NavLink>
        </BackLink>
        <div className="ras-agent-header__identity">
          <Avatar
            src={agent.avatarUrl ?? null}
            alt={agent.displayName.value || t('agent.header.realmAgentAlt')}
            size="md"
            shape="circle"
            fallback={
              <span style={{ fontSize: 16, fontWeight: 600 }}>
                {(agent.displayName.value || 'A').charAt(0).toUpperCase()}
              </span>
            }
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 className="ras-agent-header__name">
              {settingFieldDisplayValue(agent.displayName, t('shared.displayNameNotSet'), t)}
            </h2>
            <span className="ras-agent-header__handle">
              {agent.handle.value ? `@${agent.handle.value}` : settingFieldDisplayValue(agent.handle, t('shared.handleNotSet'), t)}
            </span>
          </div>
        </div>
        <div className="ras-agent-header__meta">
          <StatusBadge tone={agent.friendCount.status === 'available' ? 'success' : 'warning'}>
            {detailFriendCountLabel(agent, t)}
          </StatusBadge>
          <StatusBadge tone="neutral">{settingFieldDisplayValue(agent.world, t('shared.worldNotSet'), t)}</StatusBadge>
        </div>
      </div>
    </section>
  );
}

/**
 * Standard workspace intro card used at the top of each `/portfolio/:agentId/*`
 * sub-route. Title + optional badges on the left, optional actions on the
 * right, optional description underneath.
 */
export function WorkspaceIntro({
  title,
  description,
  badges,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="ras-card">
      <div className="ras-workspace-intro">
        <div className="ras-workspace-intro__copy">
          <h2 className="ras-workspace-intro__title">
            {title}
            {badges}
          </h2>
          {description ? <p className="ras-workspace-intro__description">{description}</p> : null}
        </div>
        {actions ? <div className="ras-page-header__actions">{actions}</div> : null}
      </div>
    </section>
  );
}

function deriveCurrentTab(pathname: string, agentId: string): AgentShellTabKey {
  if (pathname.startsWith(`/portfolio/${agentId}/settings`)) return 'settings';
  if (pathname.startsWith(`/portfolio/${agentId}/assets`)) return 'assets';
  if (pathname.startsWith(`/portfolio/${agentId}/posts`)) return 'posts';
  if (pathname.startsWith(`/portfolio/${agentId}/insights`)) return 'insights';
  return 'detail';
}

export function AgentShell({
  agentId,
  current,
  mode = 'owner',
  children,
}: {
  agentId: string;
  current?: AgentShellTabKey;
  mode?: AgentShellMode;
  children: (agent: OwnerPortfolioAgentDetail) => ReactNode;
}) {
  const { t } = useStudioI18n();
  const location = useLocation();
  const activeTab = current ?? deriveCurrentTab(location.pathname, agentId);
  const detailQuery = useAgentDetailQuery(agentId, mode);

  if (detailQuery.isLoading) {
    return (
      <ScrollArea className="flex-1" viewportClassName="bg-transparent">
        <div className="ras-page">
          <Surface tone="panel" material="glass-regular" padding="lg" className="ras-radius-xl">
            <EmptyState
              title={t('agent.loading.title')}
              description={t('agent.loading.description')}
            />
          </Surface>
        </div>
      </ScrollArea>
    );
  }

  if (detailQuery.isError) {
    const failure = classifyAgentDetailFailure(detailQuery.error);
    const titleKeyByKind = {
      'realm-unavailable': 'portfolio.failure.realmUnavailable.title',
      'permission-missing': 'portfolio.failure.permissionMissing.title',
      'owner-authority-missing': 'portfolio.failure.ownerAuthorityMissing.title',
      'setting-read-unavailable': 'portfolio.failure.settingReadUnavailable.title',
      unknown: 'portfolio.failure.portfolioUnavailable.title',
    } as const satisfies Record<typeof failure.kind, StudioCopyKey>;
    const detailKeyByKind = {
      'realm-unavailable': 'portfolio.failure.detail.realm',
      'permission-missing': 'portfolio.failure.detail.permission',
      'owner-authority-missing': 'portfolio.failure.detail.owner',
      'setting-read-unavailable': 'portfolio.failure.detail.setting',
      unknown: 'portfolio.failure.detail.unknown',
    } as const satisfies Record<typeof failure.kind, StudioCopyKey>;
    return (
      <ScrollArea className="flex-1" viewportClassName="bg-transparent">
        <div className="ras-page">
          <section className="ras-card">
            <InlineAlert tone="danger">
              <strong>{t(titleKeyByKind[failure.kind])}</strong>
              <div>{t(detailKeyByKind[failure.kind])}</div>
            </InlineAlert>
            <div>
              <Button
                tone="primary"
                onClick={() => void detailQuery.refetch()}
                loading={detailQuery.isFetching}
              >
                {t('common.retry')}
              </Button>
            </div>
          </section>
        </div>
      </ScrollArea>
    );
  }

  const agent = detailQuery.data;
  if (!agent) return null;

  return (
    <ScrollArea className="flex-1" viewportClassName="bg-transparent">
      <div className="ras-page">
        <AgentHeader agent={agent} />
        <AgentTabBar agentId={agentId} current={activeTab} mode={mode} />
        {children(agent)}
      </div>
    </ScrollArea>
  );
}
