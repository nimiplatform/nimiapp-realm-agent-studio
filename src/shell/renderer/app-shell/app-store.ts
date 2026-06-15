import { create } from 'zustand';
import type { StudioRuntimeDefaults } from '../bridge/index.js';

export type AuthUser = {
  id: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
};

export type AuthStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated';

interface AppState {
  // Studio stores only Runtime-projected account identity and the Studio
  // defaults allowlist. Auth token values never enter renderer state.
  auth: {
    status: AuthStatus;
    user: AuthUser | null;
  };
  bootstrapReady: boolean;
  bootstrapError: string | null;
  runtimeDefaults: StudioRuntimeDefaults | null;

  setAuthSession: (user: AuthUser) => void;
  clearAuthSession: () => void;
  setBootstrapReady: (ready: boolean) => void;
  setBootstrapError: (error: string | null) => void;
  setRuntimeDefaults: (defaults: StudioRuntimeDefaults) => void;
}

export const useAppStore = create<AppState>((set) => ({
  auth: {
    status: 'bootstrapping',
    user: null,
  },
  bootstrapReady: false,
  bootstrapError: null,
  runtimeDefaults: null,

  setAuthSession(user) {
    set({ auth: { status: 'authenticated', user } });
  },
  clearAuthSession() {
    set({
      auth: { status: 'unauthenticated', user: null },
    });
  },
  setBootstrapReady: (ready) => set({ bootstrapReady: ready }),
  setBootstrapError: (error) => set({ bootstrapError: error }),
  setRuntimeDefaults: (defaults) => set({ runtimeDefaults: defaults }),
}));
