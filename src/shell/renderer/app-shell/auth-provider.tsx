import { useCallback, useEffect, type ReactNode } from 'react';
import { AmbientBackground, Button, InlineAlert, LoadingSkeleton, Surface } from '@nimiplatform/kit/ui';
import { useAppStore } from './app-store.js';
import { runStudioBootstrap } from '../infra/studio-bootstrap.js';
import { StudioLoginPage } from '../features/auth/studio-login-page.js';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const authStatus = useAppStore((s) => s.auth.status);
  const bootstrapReady = useAppStore((s) => s.bootstrapReady);
  const bootstrapError = useAppStore((s) => s.bootstrapError);

  useEffect(() => {
    void runStudioBootstrap();
  }, []);

  const retryBootstrap = useCallback(() => {
    void runStudioBootstrap({ force: true });
  }, []);

  if (bootstrapError) {
    return (
      <BootstrapFrame>
        <InlineAlert
          tone="danger"
          action={<Button tone="secondary" size="sm" onClick={retryBootstrap}>Retry</Button>}
        >
          <div className="ras-bootstrap-copy">
            <strong>Runtime bootstrap failed</strong>
            <span>{bootstrapError}</span>
          </div>
        </InlineAlert>
      </BootstrapFrame>
    );
  }

  if (!bootstrapReady || authStatus === 'bootstrapping') {
    return (
      <BootstrapFrame>
        <div className="ras-entry-fallback__title">Realm Agent Studio</div>
        <LoadingSkeleton lines={2} aria-label="Opening Realm Agent Studio" />
      </BootstrapFrame>
    );
  }

  if (authStatus === 'unauthenticated') {
    return <StudioLoginPage />;
  }

  return <>{children}</>;
}

function BootstrapFrame({ children }: { children: ReactNode }) {
  return (
    <AmbientBackground variant="mesh" className="ras-entry-fallback">
      <Surface tone="panel" padding="lg" className="ras-entry-fallback__panel">
        {children}
      </Surface>
    </AmbientBackground>
  );
}
