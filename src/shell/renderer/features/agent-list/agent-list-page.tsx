import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, RefreshCw, AlertTriangle, LayoutGrid } from 'lucide-react';
import {
  Button,
  FieldShell,
  InlineAlert,
  LoadingSkeleton,
  ScrollArea,
  SearchField,
  SelectField,
  StatusBadge,
} from '@nimiplatform/kit/ui';
import {
  applyOwnerPortfolioView,
  classifyPortfolioFailure,
  type OwnerPortfolioFilter,
  type OwnerPortfolioSort,
} from '@renderer/features/portfolio/portfolio-data.js';
import { listRealmAgentStudioPortfolioAgents } from '@renderer/features/portfolio/portfolio-client.js';
import { AgentCard } from '@renderer/features/portfolio/OwnerPortfolio.shared.js';
import { ownerPortfolioListQueryKey } from '@renderer/features/agent-detail/use-agent-detail-query.js';

const PORTFOLIO_FILTER_OPTIONS: { value: OwnerPortfolioFilter; label: string }[] = [
  { value: 'all', label: 'All agents' },
  { value: 'friend-count-available', label: 'friendCount available' },
  { value: 'friend-count-unavailable', label: 'friendCount unavailable' },
];

const PORTFOLIO_SORT_OPTIONS: { value: OwnerPortfolioSort; label: string }[] = [
  { value: 'realm-order', label: 'Realm order' },
  { value: 'display-name-asc', label: 'Name A–Z' },
  { value: 'updated-desc', label: 'Recently updated' },
  { value: 'friend-count-desc', label: 'friendCount high–low' },
  { value: 'friend-count-asc', label: 'friendCount low–high' },
];

function FilterCard({
  queryText,
  filter,
  sort,
  visibleCount,
  totalCount,
  onQueryChange,
  onFilterChange,
  onSortChange,
}: {
  queryText: string;
  filter: OwnerPortfolioFilter;
  sort: OwnerPortfolioSort;
  visibleCount: number;
  totalCount: number;
  onQueryChange: (next: string) => void;
  onFilterChange: (next: OwnerPortfolioFilter) => void;
  onSortChange: (next: OwnerPortfolioSort) => void;
}) {
  return (
    <section className="ras-card">
      <SearchField
        value={queryText}
        placeholder="Search name, handle, world, or state"
        aria-label="Search portfolio"
        onChange={(event) => onQueryChange(event.currentTarget.value)}
      />
      <div className="ras-filter-grid">
        <FieldShell label="Filter">
          <SelectField
            value={filter}
            options={PORTFOLIO_FILTER_OPTIONS}
            onValueChange={(value) => onFilterChange(value as OwnerPortfolioFilter)}
          />
        </FieldShell>
        <FieldShell label="Sort">
          <SelectField
            value={sort}
            options={PORTFOLIO_SORT_OPTIONS}
            onValueChange={(value) => onSortChange(value as OwnerPortfolioSort)}
          />
        </FieldShell>
        <div className="ras-filter-status">
          <StatusBadge tone="neutral">{visibleCount} / {totalCount}</StatusBadge>
          <StatusBadge tone="info">app-local view</StatusBadge>
        </div>
      </div>
    </section>
  );
}

function PortfolioLoadingState() {
  return (
    <div className="ras-agent-grid">
      {Array.from({ length: 6 }).map((_, index) => (
        <section key={index} className="ras-card ras-card--quiet">
          <LoadingSkeleton lines={3} />
        </section>
      ))}
    </div>
  );
}

function PortfolioFailureState({
  title,
  detail,
  loading,
  onRetry,
}: {
  title: string;
  detail: string;
  loading: boolean;
  onRetry: () => void;
}) {
  return (
    <section className="ras-card">
      <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr auto', gap: 16, alignItems: 'center' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: 18,
            background: 'color-mix(in srgb, var(--nimi-status-danger) 12%, transparent)',
            color: 'var(--nimi-status-danger)',
          }}
        >
          <AlertTriangle size={28} strokeWidth={1.8} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--nimi-text-primary)' }}>{title}</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--nimi-text-muted)', fontSize: 14, lineHeight: 1.55 }}>{detail}</p>
        </div>
        <Button tone="primary" loading={loading} onClick={onRetry}>
          Retry
        </Button>
      </div>
    </section>
  );
}

export function AgentListPage() {
  const navigate = useNavigate();
  const [queryText, setQueryText] = useState('');
  const [filter, setFilter] = useState<OwnerPortfolioFilter>('all');
  const [sort, setSort] = useState<OwnerPortfolioSort>('realm-order');

  const portfolioQuery = useQuery({
    queryKey: ownerPortfolioListQueryKey(),
    queryFn: () => listRealmAgentStudioPortfolioAgents(),
  });

  const agents = portfolioQuery.data || [];
  const visibleAgents = useMemo(
    () => applyOwnerPortfolioView(agents, { query: queryText, filter, sort }),
    [agents, filter, queryText, sort],
  );

  const sourceWarnings = agents.filter((agent) => agent.friendCount.status === 'source-unavailable');
  const hasAgents = agents.length > 0;

  return (
    <ScrollArea className="flex-1" viewportClassName="bg-transparent">
      <div className="ras-page">
        <header className="ras-page-header">
          <div style={{ minWidth: 0 }}>
            <p className="ras-page-header__eyebrow">Realm Agent Studio</p>
            <h1 className="ras-page-header__title">Realm Agent portfolio</h1>
            <p className="ras-page-header__description">
              Owner-created agents and admitted Forge-imported system agents. Pick one to open its workspaces.
            </p>
          </div>
          <div className="ras-page-header__actions">
            <Button
              tone="secondary"
              loading={portfolioQuery.isFetching}
              leadingIcon={<RefreshCw size={15} strokeWidth={1.8} />}
              onClick={() => void portfolioQuery.refetch()}
              aria-label="Refresh portfolio"
            >
              Refresh
            </Button>
            <Button
              tone="primary"
              leadingIcon={<Plus size={15} strokeWidth={2} />}
              onClick={() => navigate('/portfolio/create')}
            >
              Create Realm Agent
            </Button>
          </div>
        </header>

        {portfolioQuery.isLoading ? (
          <PortfolioLoadingState />
        ) : portfolioQuery.isError ? (
          (() => {
            const failure = classifyPortfolioFailure(portfolioQuery.error);
            return (
              <PortfolioFailureState
                title={failure.title}
                detail={failure.detail}
                loading={portfolioQuery.isFetching}
                onRetry={() => void portfolioQuery.refetch()}
              />
            );
          })()
        ) : !hasAgents ? (
          <div className="ras-hero-empty">
            <div className="ras-hero-empty__icon">
              <LayoutGrid size={28} strokeWidth={1.8} />
            </div>
            <div className="ras-stack-tight">
              <h2 className="ras-hero-empty__title">No Realm Agents available</h2>
              <p className="ras-hero-empty__description">
                Realm returned no owner-created agents or admitted Forge-imported system agents.
              </p>
            </div>
            <Button
              tone="primary"
              size="lg"
              leadingIcon={<Plus size={16} strokeWidth={2} />}
              onClick={() => navigate('/portfolio/create')}
            >
              Create Realm Agent
            </Button>
          </div>
        ) : (
          <>
            <FilterCard
              queryText={queryText}
              filter={filter}
              sort={sort}
              visibleCount={visibleAgents.length}
              totalCount={agents.length}
              onQueryChange={setQueryText}
              onFilterChange={setFilter}
              onSortChange={setSort}
            />

            {sourceWarnings.length > 0 ? (
              <InlineAlert tone="warning">
                friendCount source unavailable for {sourceWarnings.length} Realm Agent
                {sourceWarnings.length === 1 ? '' : 's'}. The list still renders; metric values are not invented.
              </InlineAlert>
            ) : null}

            {visibleAgents.length === 0 ? (
              <div className="ras-hero-empty">
                <h2 className="ras-hero-empty__title">No agents match this local view</h2>
                <p className="ras-hero-empty__description">
                  Adjust search, filter, or sort controls. No Realm write or queue state is created.
                </p>
              </div>
            ) : (
              <div className="ras-agent-grid">
                {visibleAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    active={false}
                    onSelect={() => navigate(`/portfolio/${agent.id}`)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
}
