import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Surface } from '@nimiplatform/kit/ui';
import { useStudioI18n } from '../i18n/use-studio-i18n.js';

const AgentListPage = lazy(() =>
  import('../features/agent-list/agent-list-page.js').then((m) => ({ default: m.AgentListPage })),
);
const AgentCreatePage = lazy(() =>
  import('../features/agent-create/agent-create-page.js').then((m) => ({ default: m.AgentCreatePage })),
);
const AgentDetailPage = lazy(() =>
  import('../features/agent-detail/agent-detail-page.js').then((m) => ({ default: m.AgentDetailPage })),
);
const AgentSettingsPage = lazy(() =>
  import('../features/agent-settings/agent-settings-page.js').then((m) => ({ default: m.AgentSettingsPage })),
);
const AgentSettingsReviewPage = lazy(() =>
  import('../features/agent-settings-review/agent-settings-review-page.js').then((m) => ({
    default: m.AgentSettingsReviewPage,
  })),
);
const AgentAssetsPage = lazy(() =>
  import('../features/agent-assets/agent-assets-page.js').then((m) => ({ default: m.AgentAssetsPage })),
);
const AgentPostsPage = lazy(() =>
  import('../features/agent-posts/agent-posts-page.js').then((m) => ({ default: m.AgentPostsPage })),
);
const AgentPostsSchedulePage = lazy(() =>
  import('../features/agent-posts-schedule/agent-posts-schedule-page.js').then((m) => ({
    default: m.AgentPostsSchedulePage,
  })),
);
const AgentInsightsPage = lazy(() =>
  import('../features/agent-insights/agent-insights-page.js').then((m) => ({ default: m.AgentInsightsPage })),
);
const StudioAIConfigPage = lazy(() =>
  import('../features/ai-config/studio-ai-config-page.js').then((m) => ({ default: m.StudioAIConfigPage })),
);

function PageFallback() {
  const { t } = useStudioI18n();
  return (
    <Surface tone="canvas" padding="none" className="flex h-full items-center justify-center border-0 ras-text-muted">
      {t('common.loadingEllipsis')}
    </Surface>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/portfolio" element={<AgentListPage />} />
        <Route path="/portfolio/create" element={<AgentCreatePage />} />
        <Route path="/portfolio/:agentId" element={<AgentDetailPage />} />
        <Route path="/portfolio/:agentId/settings" element={<AgentSettingsPage />} />
        <Route path="/portfolio/:agentId/settings/review" element={<AgentSettingsReviewPage />} />
        <Route path="/portfolio/:agentId/assets" element={<AgentAssetsPage />} />
        <Route path="/portfolio/:agentId/posts" element={<AgentPostsPage />} />
        <Route path="/portfolio/:agentId/posts/schedule" element={<AgentPostsSchedulePage />} />
        <Route path="/portfolio/:agentId/insights" element={<AgentInsightsPage />} />
        <Route path="/ai-config" element={<StudioAIConfigPage />} />
        <Route path="*" element={<Navigate to="/portfolio" replace />} />
      </Routes>
    </Suspense>
  );
}
