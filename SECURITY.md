# Security

## Credential custody

- Do not store Realm credentials, Runtime access tokens, or Runtime refresh tokens in this repository or in any app-local storage.
- All Runtime account state flows through `runtime.account.*` via the `nimi-shell-tauri` IPC bridge; refresh-token custody lives in Runtime, not in Studio.
- Studio uses the kit's `DesktopShellAuthPage` with a code-only proof envelope (PO-SHELL-008 / K-ACCSVC-008 equivalent).

## Platform client

- Use the local-first-party PlatformClient constructed in `src/shell/renderer/app-shell/studio-platform.ts` (`createLocalFirstPartyRuntimePlatformClient` with the `tauri-ipc` transport).
- Do not introduce parallel PlatformClient construction paths or bypass the IPC transport.

## Permission posture

- Treat the scopes declared in `nimi.app.yaml` as review transparency, not grants. Permission grants are platform-owned.
- Do not synthesize success on a typed contract gap (missing artifact, missing scope, missing identity). Fail-close and surface a typed capability-unavailable state to the owner.

## Reporting a vulnerability

If you discover a vulnerability in Realm Agent Studio, do not open a public issue. Contact the Nimi Platform security team through the channel listed in the Nimi developer portal.
