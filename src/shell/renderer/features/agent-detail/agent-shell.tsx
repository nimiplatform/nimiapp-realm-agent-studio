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
import { detailFriendCountLabel } from '@renderer/features/portfolio/OwnerPortfolio.shared.js';
import { useOwnerAgentDetailQuery } from './use-agent-detail-query.js';

export type AgentShellTabKey = 'detail' | 'settings' | 'assets' | 'posts' | 'insights';

type AgentTabDef = {
  key: AgentShellTabKey;
  label: string;
  basePath: (agentId: string) => string;
};

const TABS: AgentTabDef[] = [
  { key: 'detail', label: 'Detail', basePath: (agentId) => `/portfolio/${agentId}` },
  { key: 'settings', label: 'Settings', basePath: (agentId) => `/portfolio/${agentId}/settings` },
  { key: 'assets', label: 'Assets', basePath: (agentId) => `/portfolio/${agentId}/assets` },
  { key: 'posts', label: 'Posts', basePath: (agentId) => `/portfolio/${agentId}/posts` },
  { key: 'insights', label: 'Insights', basePath: (agentId) => `/portfolio/${agentId}/insights` },
];

export function AgentTabBar({
  agentId,
  current,
}: {
  agentId: string;
  current: AgentShellTabKey;
}) {
  const navigate = useNavigate();
  return (
    <PillTabs
      ariaLabel="Agent workspace tabs"
      size="md"
      value={current}
      onValueChange={(value) => {
        const next = TABS.find((tab) => tab.key === value);
        if (next) navigate(next.basePath(agentId));
      }}
      items={TABS.map((tab) => ({ value: tab.key, label: tab.label }))}
    />
  );
}

export function AgentHeader({
  agent,
  back = '/portfolio',
}: {
  agent: OwnerPortfolioAgentDetail;
  back?: string;
}) {
  return (
    <section className="ras-card">
      <div className="ras-agent-header">
        <BackLink asChild>
          <NavLink to={back} aria-label="Back to portfolio">
            <ArrowLeft size={15} strokeWidth={1.8} style={{ marginRight: 4 }} />
            Portfolio
          </NavLink>
        </BackLink>
        <div className="ras-agent-header__identity">
          <Avatar
            src={agent.avatarUrl ?? null}
            alt={agent.displayName.value || 'Realm Agent'}
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
              {agent.displayName.value || 'Display name unavailable'}
            </h2>
            <span className="ras-agent-header__handle">
              {agent.handle.value ? `@${agent.handle.value}` : 'handle setting read unavailable'}
            </span>
          </div>
        </div>
        <div className="ras-agent-header__meta">
          <StatusBadge tone={agent.friendCount.status === 'available' ? 'success' : 'warning'}>
            {detailFriendCountLabel(agent)}
          </StatusBadge>
          <StatusBadge tone="neutral">{agent.world.value || 'world unavailable'}</StatusBadge>
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
  children,
}: {
  agentId: string;
  current?: AgentShellTabKey;
  children: (agent: OwnerPortfolioAgentDetail) => ReactNode;
}) {
  const location = useLocation();
  const activeTab = current ?? deriveCurrentTab(location.pathname, agentId);
  const detailQuery = useOwnerAgentDetailQuery(agentId);

  if (detailQuery.isLoading) {
    return (
      <ScrollArea className="flex-1" viewportClassName="bg-transparent">
        <div className="ras-page">
          <Surface tone="panel" material="glass-regular" padding="lg" className="ras-radius-xl">
            <EmptyState
              title="Loading Realm Agent"
              description="Loading the current profile and settings for this agent."
            />
          </Surface>
        </div>
      </ScrollArea>
    );
  }

  if (detailQuery.isError) {
    const failure = classifyAgentDetailFailure(detailQuery.error);
    return (
      <ScrollArea className="flex-1" viewportClassName="bg-transparent">
        <div className="ras-page">
          <section className="ras-card">
            <InlineAlert tone="danger">
              <strong>{failure.title}</strong>
              <div>{failure.detail}</div>
            </InlineAlert>
            <div>
              <Button
                tone="primary"
                onClick={() => void detailQuery.refetch()}
                loading={detailQuery.isFetching}
              >
                Retry
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
        <AgentTabBar agentId={agentId} current={activeTab} />
        {children(agent)}
      </div>
    </ScrollArea>
  );
}
