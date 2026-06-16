import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  EmptyState,
  FieldShell,
  InlineAlert,
  StatusBadge,
  Surface,
  TextareaField,
} from '@nimiplatform/kit/ui';
import { AgentShell, WorkspaceIntro } from '@renderer/features/agent-detail/agent-shell.js';
import {
  getOwnerAgentSettings,
  proposeReviewedOwnerAgentSettings,
  type RuntimeOwnerSettingsProposalResult,
} from '@renderer/features/portfolio/portfolio-client.js';
import {
  createOwnerAgentSettingsDraft,
} from '@renderer/features/portfolio/setting-proposal.js';
import { useStudioI18n } from '@renderer/i18n/use-studio-i18n.js';
import type { StudioCopyKey } from '@renderer/i18n/studio-copy.js';
import type { StudioTranslateOptions } from '@renderer/i18n/studio-i18n.js';

type StudioTranslator = (key: StudioCopyKey, options?: StudioTranslateOptions) => string;

const REVIEW_FIXED_MESSAGE_KEYS: Record<string, StudioCopyKey> = {
  'natural-language setting intent missing': 'settings.error.intentMissing',
  'Runtime settings proposal payload invalid.': 'settings.error.runtimeProposalPayloadInvalid',
  'Runtime runtime.ai.text.generate runtime transport unavailable: Tauri IPC runtime transport is required.': 'settings.error.runtimeProposalTransportUnavailable',
  'Runtime settings proposal output invalid.': 'settings.error.runtimeProposalOutputInvalid',
};

function translateReviewFixedMessage(message: string, t: StudioTranslator): string {
  const key = REVIEW_FIXED_MESSAGE_KEYS[message];
  return key ? t(key) : message;
}

export function AgentSettingsReviewPage() {
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
    <AgentShell agentId={agentId} current="settings">
      {() => <ConsistencyReviewBody agentId={agentId} onApplied={() => navigate(`/portfolio/${agentId}/settings`)} />}
    </AgentShell>
  );
}

function ConsistencyReviewBody({ agentId, onApplied }: { agentId: string; onApplied: () => void }) {
  const { t } = useStudioI18n();
  const settingsQuery = useQuery({
    queryKey: ['realm-agent-studio', 'owner-agent-settings', agentId],
    queryFn: () => getOwnerAgentSettings(agentId),
  });
  const [intent, setIntent] = useState(() => t('agent.review.defaultPrompt'));
  const [result, setResult] = useState<RuntimeOwnerSettingsProposalResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  async function requestReview() {
    if (!settingsQuery.data) return;
    setIsReviewing(true);
    setResult(null);
    try {
      const draft = createOwnerAgentSettingsDraft(settingsQuery.data);
      const review = await proposeReviewedOwnerAgentSettings(agentId, { ...draft, naturalLanguageIntent: intent }, settingsQuery.data);
      setResult(review);
    } finally {
      setIsReviewing(false);
    }
  }

  return (
    <>
      <WorkspaceIntro
        title={t('agent.review.title')}
        badges={
          <>
            <StatusBadge tone="info">{t('agent.review.advisory')}</StatusBadge>
            <StatusBadge tone="warning">{t('common.candidateOnly')}</StatusBadge>
          </>
        }
        description={t('agent.review.description')}
      />

      <Surface tone="panel" material="glass-regular" padding="lg" className="ras-radius-xl">
        {settingsQuery.isLoading ? (
          <EmptyState title={t('agent.review.loadingTitle')} description={t('agent.review.loadingDescription')} />
        ) : settingsQuery.isError ? (
          <InlineAlert tone="danger">
            {t('agent.review.unavailablePrefix')} {settingsQuery.error instanceof Error ? settingsQuery.error.message : t('agent.review.readFailed')}
          </InlineAlert>
        ) : (
          <div className="ras-stack-tight" style={{ gap: 16 }}>
            <FieldShell label={t('agent.review.promptLabel')} message={t('agent.review.promptMessage')}>
              <TextareaField
                value={intent}
                placeholder={t('agent.review.promptLabel')}
                onChange={(event) => setIntent(event.currentTarget.value)}
              />
            </FieldShell>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <Button
                tone="primary"
                onClick={() => void requestReview()}
                disabled={!intent.trim() || isReviewing || !settingsQuery.data}
                loading={isReviewing}
              >
                {t('agent.review.run')}
              </Button>
              <Button tone="ghost" onClick={onApplied}>
                {t('agent.review.backToSettings')}
              </Button>
            </div>
            {result?.ok ? (
              <Surface tone="card" padding="md" className="ras-radius-md">
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{t('agent.review.resultTitle')}</div>
                    <div className="ras-break-anywhere ras-text-muted ras-text-size-sm" style={{ marginTop: 4 }}>
                      {result.proposal.rationale}
                    </div>
                  </div>
                  <StatusBadge tone="info">{t('common.candidate')}</StatusBadge>
                </div>
                {result.proposal.changedSettingKeys.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {result.proposal.changedSettingKeys.map((key) => (
                      <StatusBadge key={key} tone="neutral">{key}</StatusBadge>
                    ))}
                  </div>
                ) : null}
                <div style={{ marginTop: 12 }}>
                  <InlineAlert tone="info">
                    {t('agent.review.candidateBoundary')}
                  </InlineAlert>
                </div>
                <details className="ras-technical-details" style={{ marginTop: 12 }}>
                  <summary>{t('agent.review.patchTitle')}</summary>
                  <pre className="ras-json-preview" style={{ margin: '12px 0 0', minHeight: 128, overflow: 'auto', borderRadius: 'var(--nimi-radius-field)', border: '1px solid var(--nimi-border-subtle)', background: 'var(--nimi-surface-panel)', padding: 12, fontSize: 12 }}>
                    {JSON.stringify(result.proposal.draftPatch, null, 2)}
                  </pre>
                </details>
                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <Button tone="primary" onClick={onApplied}>{t('agent.review.goApply')}</Button>
                </div>
              </Surface>
            ) : null}
            {result?.ok === false ? (
              <InlineAlert tone="danger">{translateReviewFixedMessage(result.message, t)}</InlineAlert>
            ) : null}
          </div>
        )}
      </Surface>
    </>
  );
}
