import { getRuntimeDefaults } from '../bridge/index.js';
import { useAppStore } from '../app-shell/app-store.js';
import {
  buildStudioNimiClient,
  clearStudioNimiClient,
  loadStudioRuntimeAccountUser,
  resolveStudioRealmBaseUrl,
  type StudioAuthUser,
} from '../app-shell/studio-platform.js';
import { describeError, logRendererEvent } from './telemetry/renderer-log.js';
import { hasStudioNimiClient, setStudioNimiClient } from './studio-nimi-client.js';

let bootstrapPromise: Promise<void> | null = null;

export async function runStudioBootstrap(options: { force?: boolean } = {}): Promise<void> {
  if (bootstrapPromise && !options.force) {
    return bootstrapPromise;
  }
  if (options.force) {
    bootstrapPromise = null;
  }
  bootstrapPromise = doRunStudioBootstrap().finally(() => {
    if (!useAppStore.getState().bootstrapReady) {
      bootstrapPromise = null;
    }
  });
  return bootstrapPromise;
}

export async function ensureStudioBootstrapReady(): Promise<void> {
  const store = useAppStore.getState();
  if (store.bootstrapReady) {
    return;
  }
  await runStudioBootstrap();
  const next = useAppStore.getState();
  if (!next.bootstrapReady) {
    throw new Error(next.bootstrapError || 'Realm Agent Studio bootstrap did not complete');
  }
}

export async function ensureStudioRuntimeClientReady(): Promise<void> {
  await ensureStudioBootstrapReady();
  if (hasStudioNimiClient()) {
    return;
  }

  await runStudioBootstrap({ force: true });
  if (!hasStudioNimiClient()) {
    throw new Error('Realm Agent Studio Nimi client is unavailable after bootstrap retry');
  }
}

async function doRunStudioBootstrap(): Promise<void> {
  const store = useAppStore.getState();
  const flowId = `studio-bootstrap-${Date.now().toString(36)}`;

  try {
    const runtimeDefaults = await getRuntimeDefaults().catch((error) => {
      logRendererEvent({
        level: 'warn',
        area: 'studio-bootstrap.runtime-defaults',
        message: 'action:runtime-defaults-unavailable',
        flowId,
        details: { error: describeError(error) },
      });
      return null;
    });
    if (runtimeDefaults) {
      store.setRuntimeDefaults(runtimeDefaults);
    }

    const realmBaseUrl = runtimeDefaults?.realm.realmBaseUrl || resolveStudioRealmBaseUrl();

    clearStudioNimiClient();
    const client = await buildStudioNimiClient(realmBaseUrl).catch((error) => {
      logRendererEvent({
        level: 'warn',
        area: 'studio-bootstrap.runtime-client',
        message: 'action:nimi-client-unavailable',
        flowId,
        details: { error: describeError(error) },
      });
      return null;
    });
    setStudioNimiClient(client);
    const runtime = client?.runtime ?? null;

    const runtimeAccountUser: StudioAuthUser | null = runtime
      ? await loadStudioRuntimeAccountUser(runtime).catch((error) => {
          logRendererEvent({
            level: 'warn',
            area: 'studio-bootstrap.account',
            message: 'action:runtime-account-projection-unavailable',
            flowId,
            details: { error: describeError(error) },
          });
          return null;
        })
      : null;

    if (runtimeAccountUser) {
      store.setAuthSession({
        id: runtimeAccountUser.id,
        displayName: runtimeAccountUser.displayName,
      });
    } else {
      store.clearAuthSession();
    }

    if (runtime) {
      try {
        await runtime.ready();
      } catch (error) {
        logRendererEvent({
          level: 'warn',
          area: 'studio-bootstrap.runtime-ready',
          message: 'action:runtime-ready-nonblocking-failed',
          flowId,
          details: { error: describeError(error) },
        });
      }
    }

    store.setBootstrapReady(true);
    store.setBootstrapError(null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logRendererEvent({
      level: 'error',
      area: 'studio-bootstrap',
      message: 'action:bootstrap-failed',
      flowId,
      details: { error: describeError(error) },
    });
    store.setBootstrapError(message);
    store.setBootstrapReady(false);
  }
}
