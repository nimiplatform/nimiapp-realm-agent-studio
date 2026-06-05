import type { Runtime } from '@nimiplatform/sdk/runtime';
import { getCurrentStudioNimiClient } from '@renderer/app-shell/studio-platform.js';
export { hasTauriIpcRuntime } from '@renderer/app-shell/tauri-runtime.js';

export async function createStudioRuntimeClient(): Promise<Runtime | null> {
  try {
    return getCurrentStudioNimiClient().runtime;
  } catch {
    return null;
  }
}
