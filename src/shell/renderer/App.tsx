import { HashRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@nimiplatform/kit/ui';
import { ShellErrorBoundary } from '@nimiplatform/kit/telemetry/error-boundary';
import { AppRoutes } from './app-shell/routes.js';
import { ShellLayout } from './app-shell/shell-layout.js';
import { AuthProvider } from './app-shell/auth-provider.js';
import { studioQueryClient } from './infra/query-client.js';

export function App() {
  return (
    <ShellErrorBoundary
      appName="Realm Agent Studio"
      fallbackTitle="Realm Agent Studio renderer failed"
      fallbackHint="Restart Realm Agent Studio after checking the renderer diagnostics."
    >
      <QueryClientProvider client={studioQueryClient}>
        <TooltipProvider>
          <HashRouter>
            <AuthProvider>
              <ShellLayout>
                <AppRoutes />
              </ShellLayout>
            </AuthProvider>
          </HashRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ShellErrorBoundary>
  );
}
