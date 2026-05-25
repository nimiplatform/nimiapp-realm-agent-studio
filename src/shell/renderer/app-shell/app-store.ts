import { create } from 'zustand';
import type { RuntimeDefaults } from '../bridge/index.js';

export type AuthUser = {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
};

export type AuthStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated';

/**
 * Optional handoff payload preserved after a successful Realm Agent create so
 * the owner can continue into the settings workspace and finish the public-bio
 * step that was intentionally excluded from CreateAgentDto. See spec/storybook
 * "create flow / public bio carryover".
 */
export type PostCreateHandoff = {
  agentId: string;
  handle: string;
  publicBio: string;
  selectedWorldId: string;
  needsPostCreateSettings: boolean;
};

interface AppState {
  // Studio mirrors parentos PO-SHELL-008 / K-ACCSVC-008: the app does not own
  // access or refresh tokens. The `auth` slice tracks only the runtime-
  // projected account identity. Short-lived access tokens, when needed for a
  // direct realm call, are pulled from `runtime.account.getAccessToken` at
  // call time and never persisted in this store.
  auth: {
    status: AuthStatus;
    user: AuthUser | null;
  };
  bootstrapReady: boolean;
  bootstrapError: string | null;
  runtimeDefaults: RuntimeDefaults | null;

  /** Optional handoff from Create → Settings; cleared once consumed. */
  postCreateHandoff: PostCreateHandoff | null;

  setAuthSession: (user: AuthUser) => void;
  clearAuthSession: () => void;
  setBootstrapReady: (ready: boolean) => void;
  setBootstrapError: (error: string | null) => void;
  setRuntimeDefaults: (defaults: RuntimeDefaults) => void;

  setPostCreateHandoff: (handoff: PostCreateHandoff | null) => void;
  consumePostCreateHandoff: (agentId: string) => PostCreateHandoff | null;
}

export const useAppStore = create<AppState>((set, get) => ({
  auth: {
    status: 'bootstrapping',
    user: null,
  },
  bootstrapReady: false,
  bootstrapError: null,
  runtimeDefaults: null,
  postCreateHandoff: null,

  setAuthSession(user) {
    set({ auth: { status: 'authenticated', user } });
  },
  clearAuthSession() {
    set({
      auth: { status: 'unauthenticated', user: null },
      postCreateHandoff: null,
    });
  },
  setBootstrapReady: (ready) => set({ bootstrapReady: ready }),
  setBootstrapError: (error) => set({ bootstrapError: error }),
  setRuntimeDefaults: (defaults) => set({ runtimeDefaults: defaults }),

  setPostCreateHandoff: (handoff) => set({ postCreateHandoff: handoff }),
  consumePostCreateHandoff: (agentId) => {
    const current = get().postCreateHandoff;
    if (current && current.agentId === agentId) {
      set({ postCreateHandoff: null });
      return current;
    }
    return null;
  },
}));
