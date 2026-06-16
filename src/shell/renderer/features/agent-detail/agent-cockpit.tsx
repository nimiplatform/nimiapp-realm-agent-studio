import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import { loadLocalCreativeAssetHistory } from '@renderer/features/portfolio/creative-asset-history.js';
import { loadLocalPostSchedule } from '@renderer/features/portfolio/local-post-schedule-store.js';
import type { OwnerPortfolioAgentDetail } from '@renderer/features/portfolio/portfolio-data.js';
import { settingFieldDisplayValue } from '@renderer/features/portfolio/OwnerPortfolio.shared.js';
import { AgentProfileOverview } from './agent-profile-overview.js';
import { WorkspaceIntro } from './agent-shell.js';
import { deriveAgentCockpitModel, type AgentCockpitAction, type AgentCockpitCardStatus } from './agent-cockpit-model.js';
import {
  deriveMaintenanceSuggestions,
  type MaintenanceSuggestionRoute,
  type MaintenanceSuggestionStatus,
} from './maintenance-suggestion.js';

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

export function AgentCockpit({ agent }: { agent: OwnerPortfolioAgentDetail }) {
  const navigate = useNavigate();
  const model = deriveAgentCockpitModel(agent);
  const creativeHistory = useMemo(() => loadLocalCreativeAssetHistory(agent.id), [agent.id]);
  const localPostSchedule = useMemo(() => loadLocalPostSchedule(agent.id), [agent.id]);
  const suggestions = deriveMaintenanceSuggestions({ agent, creativeHistory, localPostSchedule });
  const actionsByKey = new Map(model.actions.map((action) => [action.key, action]));

  return (
    <>
      <WorkspaceIntro
        title="Agent Cockpit"
        badges={
          <>
            <StatusBadge tone="info">source-backed</StatusBadge>
            <StatusBadge tone={model.unavailableSignals.length > 0 ? 'warning' : 'success'}>
              {model.unavailableSignals.length > 0 ? 'source gaps' : 'sources available'}
            </StatusBadge>
          </>
        }
        description="Maintain the current owner-created Realm Agent from source-backed profile state, local candidate workflows, and admitted Realm write paths."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <AgentProfileOverview agent={agent} compact />

          <Surface tone="panel" material="glass-regular" padding="lg" className="ras-radius-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="m-0 text-[length:var(--nimi-type-body-size)] font-semibold">Next Owner Actions</h3>
                <p className="m-0 mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                  Recommendations use only current Realm detail fields and local workspace boundaries.
                </p>
              </div>
              <StatusBadge tone="neutral">no private runtime state</StatusBadge>
            </div>
            {model.unavailableSignals.length > 0 ? (
              <InlineAlert tone="warning" className="mt-3">
                Source unavailable: {model.unavailableSignals.join(', ')}. Studio does not substitute fallback values.
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
                  <div className="font-medium">{action.label}</div>
                  <div className="mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                    {action.reason}
                  </div>
                </button>
              ))}
            </div>
          </Surface>

          <Surface tone="panel" material="glass-regular" padding="lg" className="ras-radius-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="m-0 text-[length:var(--nimi-type-body-size)] font-semibold">Maintenance Suggestions</h3>
                <p className="m-0 mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                  Source-backed cockpit guidance from Realm detail and Studio-owned local candidates.
                </p>
              </div>
              <StatusBadge tone="info">candidate guidance</StatusBadge>
            </div>
            <div className="mt-4 grid gap-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="rounded-[var(--nimi-radius-card)] border border-[var(--nimi-border-subtle)] bg-[var(--nimi-surface-card)] p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{suggestion.title}</div>
                      <p className="m-0 mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                        {suggestion.rationale}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={statusTone(suggestion.status)}>{suggestion.status}</StatusBadge>
                      <StatusBadge tone="neutral">{suggestion.priority}</StatusBadge>
                    </div>
                  </div>
                  <ul className="m-0 mt-3 grid list-none gap-1 p-0 text-[length:var(--nimi-type-body-sm-size)]">
                    {suggestion.evidence.map((item) => (
                      <li key={item} className="ras-break-anywhere text-[var(--nimi-text-secondary)]">{item}</li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      tone="secondary"
                      size="sm"
                      onClick={() => navigate(suggestionPath(agent.id, suggestion.action.route))}
                    >
                      {suggestion.action.label}
                    </Button>
                    <span className="text-[length:var(--nimi-type-body-xs-size)] text-[var(--nimi-text-muted)]">
                      {suggestion.sources.join(' + ')}
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
                  <div className="font-medium">{card.title}</div>
                  <StatusBadge tone={statusTone(card.status)}>{card.status}</StatusBadge>
                </div>
                <p className="m-0 mt-2 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                  {card.summary}
                </p>
                <ul className="m-0 mt-3 grid list-none gap-1 p-0 text-[length:var(--nimi-type-body-sm-size)]">
                  {card.evidence.map((item) => (
                    <li key={item} className="ras-break-anywhere text-[var(--nimi-text-secondary)]">{item}</li>
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
                        {action.label}
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
              <h3 className="m-0 text-[length:var(--nimi-type-body-size)] font-semibold">Source Inventory</h3>
              <p className="m-0 mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
                Current detail source: {agent.source}
              </p>
            </div>
            {([
              ['Display name', settingFieldDisplayValue(agent.displayName, 'not set')],
              ['Handle', settingFieldDisplayValue(agent.handle, 'not set')],
              ['Profile description', settingFieldDisplayValue(agent.bio, 'not set')],
              ['Greeting', settingFieldDisplayValue(agent.greeting, 'not set')],
              ['World', settingFieldDisplayValue(agent.world, 'not set')],
              ['State', settingFieldDisplayValue(agent.state, 'not set')],
              ['Profile cover', settingFieldDisplayValue(agent.profileCoverUrl, 'not set')],
              ['Avatar', agent.avatarUrl || 'not set'],
              ['friendCount', agent.friendCount.status === 'available' ? String(agent.friendCount.value) : agent.friendCount.label],
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
