import type { Realm } from '@nimiplatform/sdk/realm';
import { getCurrentStudioNimiClient } from '@renderer/app-shell/studio-platform.js';

export function createStudioRealmClient(): Realm {
  const realm = getCurrentStudioNimiClient().realm;
  if (!realm) {
    throw new Error('Realm Agent Studio Realm client is not ready.');
  }
  return realm;
}
