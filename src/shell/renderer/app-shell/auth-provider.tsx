import { useEffect } from 'react';
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

  if (bootstrapError) {
    return (
      <div className="ras-fullscreen-center">
        <div style={{ textAlign: 'center', display: 'grid', gap: 12 }}>
          <p className="ras-text-danger" style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>
            {bootstrapError}
          </p>
        </div>
      </div>
    );
  }

  if (!bootstrapReady || authStatus === 'bootstrapping') {
    return (
      <div className="ras-fullscreen-center">
        <div style={{ textAlign: 'center', display: 'grid', gap: 16 }}>
          <div className="ras-spinner" />
          <p className="ras-text-muted" style={{ margin: 0 }}>Opening Realm Agent Studio…</p>
        </div>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return <StudioLoginPage />;
  }

  return <>{children}</>;
}
