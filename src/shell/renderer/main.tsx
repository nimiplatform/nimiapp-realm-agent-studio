import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { NimiThemeProvider } from '@nimiplatform/kit/ui';
import { App } from './App.js';
import { installStudioGlobalErrorLogging } from './infra/telemetry/renderer-log.js';
import { installStudioTauriRuntimeHook } from './app-shell/tauri-runtime-hook.js';
import './styles.css';

installStudioGlobalErrorLogging();
installStudioTauriRuntimeHook();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('REALM_AGENT_STUDIO_ROOT_MISSING');
}

createRoot(rootElement).render(
  <StrictMode>
    <NimiThemeProvider accentPack="nimi-accent" defaultScheme="light">
      <App />
    </NimiThemeProvider>
  </StrictMode>,
);
