import { type ReactNode } from 'react';
import { FieldShell, StatusBadge, Surface, TextareaField, TextField } from '@nimiplatform/kit/ui';
import type { OwnerPortfolioAgent, OwnerPortfolioAgentDetail, SettingField } from './portfolio-data.js';

export function TechnicalReviewDetails({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="ras-technical-details">
      <summary>{title}</summary>
      <div className="mt-3">
        {children}
      </div>
    </details>
  );
}

export function CandidateFactGrid({
  facts,
}: {
  facts: ReadonlyArray<{ label: string; value: ReactNode }>;
}) {
  return (
    <div className="ras-fact-grid">
      {facts.map((fact) => (
        <div key={fact.label} className="ras-fact">
          <div className="ras-fact__label">{fact.label}</div>
          <div className="ras-fact__value ras-break-anywhere">{fact.value}</div>
        </div>
      ))}
    </div>
  );
}

export function friendCountLabel(agent: OwnerPortfolioAgent) {
  if (agent.friendCount.status === 'available') {
    return `${agent.friendCount.value} friends`;
  }
  return agent.friendCount.label;
}

export function detailFriendCountLabel(agent: OwnerPortfolioAgentDetail) {
  if (agent.friendCount.status === 'available') {
    return `${agent.friendCount.value} friends`;
  }
  return agent.friendCount.label;
}

export function ownerScopeLabel(scope: OwnerPortfolioAgent['ownerScope'] | OwnerPortfolioAgentDetail['ownerScope']): string {
  return scope === 'forge-imported-system' ? 'Forge-imported system' : 'owner-created';
}

export function settingFieldStatusLabel(field: SettingField): string {
  if (field.status === 'available') return 'available';
  if (field.status === 'available-empty') return field.emptyLabel || 'not set';
  return field.unavailableLabel || 'source unavailable';
}

export function settingFieldDisplayValue(field: SettingField, emptyLabel = 'not set'): string {
  if (field.value) return field.value;
  if (field.status === 'available-empty') return field.emptyLabel || emptyLabel;
  return field.unavailableLabel || 'source unavailable';
}

function settingFieldStatusTone(field: SettingField): 'success' | 'neutral' | 'warning' {
  if (field.status === 'available') return 'success';
  if (field.status === 'available-empty') return 'neutral';
  return 'warning';
}

export function AgentCard({ agent, active, onSelect }: { agent: OwnerPortfolioAgent; active: boolean; onSelect: () => void }) {
  return (
    <Surface
      as="button"
      type="button"
      padding="md"
      tone="card"
      interactive
      active={active}
      className="grid w-full min-w-0 grid-cols-[56px_1fr] gap-3 text-left"
      onClick={onSelect}
    >
      <div className="h-14 w-14 overflow-hidden rounded-[var(--nimi-radius-md)] bg-[var(--nimi-surface-active)]">
        {agent.avatarUrl ? <img src={agent.avatarUrl} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <div className="ras-break-anywhere truncate text-[length:var(--nimi-type-label-size)] font-[var(--nimi-type-label-weight)]">
            {agent.displayName}
          </div>
          <StatusBadge tone={agent.friendCount.status === 'available' ? 'success' : 'warning'} shape="dot">
            {friendCountLabel(agent)}
          </StatusBadge>
        </div>
        <div className="ras-break-anywhere mt-1 text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">
          @{agent.handle}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <StatusBadge tone="info">{ownerScopeLabel(agent.ownerScope)}</StatusBadge>
          <StatusBadge tone="neutral">{agent.worldName || 'world source unavailable'}</StatusBadge>
        </div>
      </div>
    </Surface>
  );
}

export function FieldStatus({ field }: { field: SettingField }) {
  return (
    <div className="mt-1 flex flex-wrap gap-2">
      <StatusBadge tone={settingFieldStatusTone(field)} shape="dot">
        {settingFieldStatusLabel(field)}
      </StatusBadge>
      <StatusBadge tone="neutral">read-only</StatusBadge>
    </div>
  );
}

export function ReadOnlySettingField({ field, multiline = false }: { field: SettingField; multiline?: boolean }) {
  const sourceUnavailable = field.status === 'source-unavailable';
  const message = field.status === 'available'
    ? 'Current public profile value.'
    : field.status === 'available-empty'
      ? 'Realm returned this field with no value set.'
      : 'Realm did not return this field source.';

  const placeholder = field.status === 'available-empty'
    ? field.emptyLabel || 'not set'
    : field.unavailableLabel || 'source unavailable';

  return (
    <FieldShell label={field.label} message={message} messageTone={sourceUnavailable ? 'danger' : 'neutral'}>
      {multiline ? (
        <TextareaField readOnly value={field.value} placeholder={placeholder} />
      ) : (
        <TextField readOnly value={field.value} placeholder={placeholder} />
      )}
    </FieldShell>
  );
}

export function EvidenceCard({ field }: { field: SettingField }) {
  return (
    <Surface tone="card" padding="md">
      <div className="text-[length:var(--nimi-type-body-sm-size)] text-[var(--nimi-text-muted)]">{field.label}</div>
      <div className="ras-break-anywhere mt-1 font-medium">{settingFieldDisplayValue(field)}</div>
      <FieldStatus field={field} />
    </Surface>
  );
}
