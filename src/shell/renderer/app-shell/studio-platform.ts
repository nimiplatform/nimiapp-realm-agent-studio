import {
  clearPlatformClient,
  createLocalFirstPartyRuntimePlatformClient,
  getPlatformClient,
  type PlatformClient,
} from '@nimiplatform/sdk';
import {
  AccountCallerMode,
  AccountSessionState,
  type AccountCaller,
  type AccountProjection,
} from '@nimiplatform/sdk/runtime/browser';
import type { Runtime } from '@nimiplatform/sdk/runtime';

// Studio mirrors parentos PO-SHELL-001 / PO-SHELL-008. The caller identity is
// fixed; runtime owns refresh-token custody and short-lived access-token
// projection. No app-owned token surface is admitted.
export const STUDIO_RUNTIME_APP_ID = 'app.nimi.realm-agent-studio';
export const STUDIO_RUNTIME_APP_INSTANCE_ID = `${STUDIO_RUNTIME_APP_ID}.local-first-party`;
export const STUDIO_RUNTIME_DEVICE_ID = 'local-first-party-device';
export const DEFAULT_REALM_BASE_URL = 'http://localhost:3002';

export const studioRuntimeAccountCaller: AccountCaller = {
  appId: STUDIO_RUNTIME_APP_ID,
  appInstanceId: STUDIO_RUNTIME_APP_INSTANCE_ID,
  deviceId: STUDIO_RUNTIME_DEVICE_ID,
  mode: AccountCallerMode.LOCAL_FIRST_PARTY_APP,
  scopes: [],
};

export type StudioAuthUser = {
  id: string;
  displayName: string;
};

export function readRuntimeEnv(name: string): string {
  const value = (import.meta.env as Record<string, string | undefined>)[name];
  return String(value || '').trim();
}

export function resolveStudioRealmBaseUrl(): string {
  return readRuntimeEnv('VITE_NIMI_REALM_BASE_URL')
    || readRuntimeEnv('VITE_REALM_BASE_URL')
    || readRuntimeEnv('NIMI_REALM_URL')
    || DEFAULT_REALM_BASE_URL;
}

export function normalizeStudioAccountProjection(
  projection: AccountProjection | null | undefined,
): StudioAuthUser | null {
  const accountId = String(projection?.accountId || '').trim();
  if (!accountId) {
    return null;
  }
  return {
    id: accountId,
    displayName: String(projection?.displayName || accountId).trim(),
  };
}

export async function loadStudioRuntimeAccountUser(runtime: Runtime): Promise<StudioAuthUser | null> {
  const response = await runtime.account.getAccountSessionStatus({
    caller: studioRuntimeAccountCaller,
  });
  if (response.state !== AccountSessionState.AUTHENTICATED) {
    return null;
  }
  return normalizeStudioAccountProjection(response.accountProjection);
}

export async function buildStudioPlatformClient(realmBaseUrl: string): Promise<PlatformClient> {
  return createLocalFirstPartyRuntimePlatformClient({
    appId: STUDIO_RUNTIME_APP_ID,
    realmBaseUrl,
    runtimeTransport: {
      type: 'tauri-ipc',
      commandNamespace: 'runtime_bridge',
      eventNamespace: 'runtime_bridge',
    },
    runtimeDefaults: {
      appInstanceId: STUDIO_RUNTIME_APP_INSTANCE_ID,
      callerId: STUDIO_RUNTIME_APP_ID,
      surfaceId: 'realm-agent-studio',
    },
  });
}

export function getStudioPlatformClient(): PlatformClient {
  return getPlatformClient();
}

export function clearStudioPlatformClient(): void {
  clearPlatformClient();
}
