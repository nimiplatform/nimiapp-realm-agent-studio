import { InlineAlert, StatusBadge, Surface } from '@nimiplatform/kit/ui';
import type { OwnerPortfolioAgentDetail } from '@renderer/features/portfolio/portfolio-data.js';
import {
  EvidenceCard,
  ReadOnlySettingField,
  detailFriendCountLabel,
  ownerScopeLabel,
  settingFieldDisplayValue,
} from '@renderer/features/portfolio/OwnerPortfolio.shared.js';
import { useStudioI18n } from '@renderer/i18n/use-studio-i18n.js';

export function AgentProfileOverview({
  agent,
  compact = false,
}: {
  agent: OwnerPortfolioAgentDetail;
  compact?: boolean;
}) {
  const { t } = useStudioI18n();
  return (
    <Surface tone="panel" material="glass-regular" padding={compact ? 'md' : 'lg'} className="ras-radius-xl">
      <div
        className="ras-profile-grid"
        data-compact={compact || undefined}
      >
        <div className={compact ? 'ras-profile-cover ras-profile-cover--compact' : 'ras-profile-cover'}>
          {compact ? (
            agent.avatarUrl ? <img src={agent.avatarUrl} alt="" className="ras-profile-cover__img" /> : null
          ) : (
            <>
              <div className="ras-profile-cover__hero">
                {agent.profileCoverUrl.status === 'available' ? (
                  <img src={agent.profileCoverUrl.value} alt="" className="ras-profile-cover__img" />
                ) : null}
              </div>
              <div className="ras-profile-cover__heading">
                <div className="ras-profile-cover__title-row">
                  <h2 className="ras-break-anywhere ras-profile-cover__title">
                    {settingFieldDisplayValue(agent.displayName, t('shared.displayNameNotSet'), t)}
                  </h2>
                  <StatusBadge tone="info">{t('agent.profile.realmAgentBadge')}</StatusBadge>
                  <StatusBadge tone="neutral">{t('agent.profile.currentProfileBadge')}</StatusBadge>
                </div>
                <p className="ras-break-anywhere ras-profile-cover__handle">
                  {agent.handle.value ? `@${agent.handle.value}` : settingFieldDisplayValue(agent.handle, t('shared.handleNotSet'), t)}
                </p>
              </div>
              <div className="ras-profile-fields">
                <ReadOnlySettingField field={agent.displayName} />
                <ReadOnlySettingField field={agent.handle} />
                <ReadOnlySettingField field={agent.bio} multiline />
                <ReadOnlySettingField field={agent.greeting} multiline />
                <ReadOnlySettingField field={agent.profileCoverUrl} />
              </div>
            </>
          )}
        </div>
        <div className={compact ? 'ras-profile-meta ras-profile-meta--compact' : 'ras-profile-meta'}>
          {compact ? (
            <>
              <div className="ras-profile-cover__title-row">
                <h2 className="ras-break-anywhere ras-profile-cover__title">
                  {settingFieldDisplayValue(agent.displayName, t('shared.displayNameNotSet'), t)}
                </h2>
                <StatusBadge tone="info">{t('agent.profile.realmAgentBadge')}</StatusBadge>
              </div>
              <p className="ras-break-anywhere ras-text-secondary" style={{ margin: '4px 0 0' }}>
                {agent.handle.value ? `@${agent.handle.value}` : settingFieldDisplayValue(agent.handle, t('shared.handleNotSet'), t)}
              </p>
              <p className="ras-break-anywhere ras-text-muted" style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.55 }}>
                {settingFieldDisplayValue(agent.bio, t('shared.profileDescriptionNotSet'), t)}
              </p>
            </>
          ) : (
            <>
              <div className="ras-info-tile">
                <div className="ras-info-tile__label">{t('agent.profile.ownershipLabel')}</div>
                <div className="ras-info-tile__value">
                  {t('agent.profile.ownershipValue', { scope: ownerScopeLabel(agent.ownerScope, t) })}
                </div>
              </div>
              {agent.friendCount.status === 'available' ? (
                <div className="ras-info-tile">
                  <div className="ras-info-tile__label">{t('agent.profile.friendCountLabel')}</div>
                  <div className="ras-info-tile__value">{detailFriendCountLabel(agent, t)}</div>
                </div>
              ) : (
                <InlineAlert tone="warning">{detailFriendCountLabel(agent, t)}</InlineAlert>
              )}
              <EvidenceCard field={agent.ownership} />
              <EvidenceCard field={agent.world} />
              <EvidenceCard field={agent.state} />
            </>
          )}
        </div>
        {compact ? (
          <div className="ras-profile-meta__compact-badges">
            <StatusBadge tone={agent.friendCount.status === 'available' ? 'success' : 'warning'}>
              {detailFriendCountLabel(agent, t)}
            </StatusBadge>
            <StatusBadge tone="neutral">{settingFieldDisplayValue(agent.world, t('shared.worldNotSet'), t)}</StatusBadge>
          </div>
        ) : null}
      </div>
    </Surface>
  );
}
