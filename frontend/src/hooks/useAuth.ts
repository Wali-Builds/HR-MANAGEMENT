import { useAuthStore } from "../app/store/auth.store";

export function useAuth() {
  return useAuthStore((state) => ({
    status: state.status,
    user: state.user,
    accessToken: state.accessToken,
    isAuthenticated:
      state.status === "authenticated" &&
      state.user !== null,
  }));
}
