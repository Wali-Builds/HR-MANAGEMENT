import { create } from "zustand";

import type { AuthUser } from "../../features/auth/types/auth.types";

export type AuthStatus =
  | "bootstrapping"
  | "authenticated"
  | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  user: AuthUser | null;

  setSession: (
    accessToken: string,
    user: AuthUser,
  ) => void;

  setBootstrapping: () => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "bootstrapping",
  accessToken: null,
  user: null,

  setSession: (accessToken, user) => {
    set({
      status: "authenticated",
      accessToken,
      user,
    });
  },

  setBootstrapping: () => {
    set({ status: "bootstrapping" });
  },

  clearSession: () => {
    set({
      status: "unauthenticated",
      accessToken: null,
      user: null,
    });
  },
}));
