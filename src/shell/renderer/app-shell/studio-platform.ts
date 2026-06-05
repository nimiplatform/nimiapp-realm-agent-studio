import {
  createNimiClient,
  createRealmFetchTransport,
  type NimiClient,
} from '@nimiplatform/sdk';
import {
  AccountCallerMode,
  AccountSessionState,
  type AccountCaller,
  type AccountProjection,
} from '@nimiplatform/sdk/runtime/generated';
import type { Runtime } from '@nimiplatform/sdk/runtime';
import { getStudioNimiClient, setStudioNimiClient } from '../infra/studio-nimi-client.js';

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

export async function buildStudioNimiClient(realmBaseUrl: string): Promise<NimiClient> {
  const client = createNimiClient({
    appId: STUDIO_RUNTIME_APP_ID,
    runtime: {
      appId: STUDIO_RUNTIME_APP_ID,
      metadata: {
        callerId: STUDIO_RUNTIME_APP_ID,
        surfaceId: 'realm-agent-studio',
      },
      transport: {
        type: 'tauri-ipc',
        commandNamespace: 'runtime_bridge',
        eventNamespace: 'runtime_bridge',
      },
    },
    realm: {
      transport: createRealmFetchTransport({
        baseUrl: realmBaseUrl,
        credentials: 'include',
      }),
    },
    app: false,
    permissions: false,
  });
  await client.runtime.ready();
  return client;
}

export function getCurrentStudioNimiClient(): NimiClient {
  return getStudioNimiClient();
}

export function clearStudioNimiClient(): void {
  setStudioNimiClient(null);
}
