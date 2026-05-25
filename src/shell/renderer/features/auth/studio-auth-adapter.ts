import type { AuthPlatformAdapter } from '@nimiplatform/kit/auth';
import { getPlatformClient } from '@nimiplatform/sdk';
import { studioTauriOAuthBridge } from '../../bridge/index.js';
import {
  ensureStudioRuntimeClientReady,
} from '../../infra/studio-bootstrap.js';
import {
  loadStudioRuntimeAccountUser,
  studioRuntimeAccountCaller,
  type StudioAuthUser,
} from '../../app-shell/studio-platform.js';

const STUDIO_EMBEDDED_AUTH_UNSUPPORTED =
  'Embedded auth flow is not supported in Realm Agent Studio desktop-browser mode.';

const STUDIO_TOKEN_PROXY_FORBIDDEN =
  'Realm Agent Studio does not own access/refresh token custody. Runtime is the sole owner; '
  + 'login through the desktop browser broker.';

function unsupported<T>(): Promise<T> {
  return Promise.reject(new Error(STUDIO_EMBEDDED_AUTH_UNSUPPORTED));
}

export async function loadCurrentUser(): Promise<StudioAuthUser | null> {
  await ensureStudioRuntimeClientReady();
  return loadStudioRuntimeAccountUser(getPlatformClient().runtime);
}

export async function logoutStudioRuntimeAccount(): Promise<void> {
  await ensureStudioRuntimeClientReady();
  await getPlatformClient().runtime.account.logout({
    caller: studioRuntimeAccountCaller,
    reason: 'realm_agent_studio_logout',
  });
}

/**
 * Adapter for the kit's `<DesktopShellAuthPage>` in Realm Agent Studio
 * desktop-browser mode. Account/session truth is owned by RuntimeAccountService;
 * this adapter intentionally rejects every app-owned token surface so a
 * regression that tries to flow a bearer or refresh token through the kit fails
 * fast.
 */
export function createStudioDesktopBrowserAuthAdapter(): AuthPlatformAdapter {
  return {
    checkEmail: unsupported,
    passwordLogin: unsupported,
    requestEmailOtp: unsupported,
    verifyEmailOtp: unsupported,
    verifyTwoFactor: unsupported,
    walletChallenge: unsupported,
    walletLogin: unsupported,
    oauthLogin: unsupported,
    updatePassword: unsupported,
    loadCurrentUser,
    applyToken: async () => {
      throw new Error(STUDIO_TOKEN_PROXY_FORBIDDEN);
    },
    persistSession: async () => {
      throw new Error(STUDIO_TOKEN_PROXY_FORBIDDEN);
    },
    clearPersistedSession: async () => {
      await logoutStudioRuntimeAccount();
    },
    oauthBridge: studioTauriOAuthBridge,
    syncAfterLogin: async () => {},
  };
}

/**
 * RuntimeAccountService browser broker for Studio desktop login. Pairs with
 * the kit's `performDesktopWebAuth` direct-to-loopback flow: runtime BeginLogin
 * returns a fully-formed realm OAuth authorize URL with PKCE S256 challenge
 * bound to runtime-held verifier; on user consent the realm 302-redirects
 * directly to the desktop loopback redirect_uri with a raw OAuth `code`;
 * runtime CompleteLogin exchanges the code with the realm token endpoint and
 * projects account material into runtime custody.
 *
 * The kit/desktop never observes access tokens or refresh tokens at any stage
 * of this flow.
 */
export function createStudioRuntimeAccountBrowserBroker() {
  return {
    begin: async (input: { callbackUrl: string; baseUrl?: string; timeoutMs: number }) => {
      await ensureStudioRuntimeClientReady();
      const response = await getPlatformClient().runtime.account.beginLogin({
        caller: studioRuntimeAccountCaller,
        redirectUri: input.callbackUrl,
        callbackOrigin: new URL(input.callbackUrl).origin,
        requestedScopes: [],
        ttlSeconds: Math.max(10, Math.ceil(input.timeoutMs / 1000)),
      });
      if (
        !response.accepted
        || !response.loginAttemptId
        || !response.oauthAuthorizationUrl
        || !response.state
        || !response.nonce
      ) {
        throw new Error(
          `Runtime account login could not start: ${String(response.accountReasonCode || response.reasonCode || 'unknown')}`,
        );
      }
      return {
        loginAttemptId: response.loginAttemptId,
        authorizationUrl: response.oauthAuthorizationUrl,
        state: response.state,
        nonce: response.nonce,
      };
    },
    complete: async (input: {
      loginAttemptId: string;
      code: string;
      state: string;
      nonce: string;
      callbackUrl: string;
    }) => {
      await ensureStudioRuntimeClientReady();
      const response = await getPlatformClient().runtime.account.completeLogin({
        caller: studioRuntimeAccountCaller,
        loginAttemptId: input.loginAttemptId,
        code: input.code,
        refreshToken: '',
        state: input.state,
        nonce: input.nonce,
        redirectUri: input.callbackUrl,
        callbackOrigin: new URL(input.callbackUrl).origin,
        uxTraceId: '',
        sealedCompletionTicket: '',
      });
      if (!response.accepted) {
        throw new Error(
          `Runtime account login could not complete: ${String(response.accountReasonCode || response.reasonCode || 'unknown')}`,
        );
      }
      const accountId = String(response.accountProjection?.accountId || '').trim();
      return {
        user: accountId
          ? {
              id: accountId,
              displayName: String(response.accountProjection?.displayName || '').trim(),
            }
          : null,
      };
    },
  };
}
