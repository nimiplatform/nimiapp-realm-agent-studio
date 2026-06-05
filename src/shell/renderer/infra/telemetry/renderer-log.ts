import { hasTauriInvoke, invoke, type JsonValue } from '../../bridge/index.js';

export type RendererLogLevel = 'info' | 'warn' | 'error';

export type RendererLogEvent = {
  level: RendererLogLevel;
  area: string;
  message: string;
  flowId?: string;
  details?: JsonValue;
};

export function describeError(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: 'NonError', message: String(error) };
}

/**
 * Forwards renderer events to the desktop session log via the nimi-shell-tauri
 * `log_renderer_event` command. Falls back to a no-op when the Tauri bridge is
 * unavailable (e.g. unit tests, vite-only dev preview). Never throws — the
 * caller is logging, not handling a contract.
 */
export function logRendererEvent(event: RendererLogEvent): void {
  if (!hasTauriInvoke()) {
    return;
  }
  void invoke('log_renderer_event', {
    payload: {
      level: event.level,
      area: event.area,
      message: event.message,
      flowId: event.flowId,
      details: event.details ?? null,
      reportedAt: new Date().toISOString(),
    },
  }).catch(() => {
    // Logging failures must not surface to the user or break the calling flow.
  });
}

let installed = false;

export function installStudioGlobalErrorLogging(): void {
  if (installed) return;
  installed = true;
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    logRendererEvent({
      level: 'error',
      area: 'renderer.window.onerror',
      message: 'window.onerror',
      details: {
        error: describeError(event.error || event.message),
        source: event.filename,
        line: event.lineno,
        column: event.colno,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logRendererEvent({
      level: 'error',
      area: 'renderer.window.unhandledrejection',
      message: 'window.unhandledrejection',
      details: { reason: describeError(event.reason) },
    });
  });
}
