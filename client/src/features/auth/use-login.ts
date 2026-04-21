import { useMutation, useQueryClient } from "@tanstack/react-query";
import { loginRequest, logoutRequest, type AuthUser } from "./auth.api";
import { useAuthStore } from "./auth.store";

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, password }: { employeeId: string; password: string }) => {
      const res = await loginRequest(employeeId, password);
      return res.user;
    },
    onSuccess: (user: AuthUser) => {
      // Sync the session query cache so stale admin/manager data
      // doesn't overwrite the newly logged-in user in useSession.
      qc.setQueryData(["session"], user);
      setUser(user);
    },
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        await logoutRequest();
      } catch {
        // Even if the request fails (e.g., already-expired session), clear local state.
      }
    },
    onSettled: () => {
      qc.removeQueries({ queryKey: ["session"] });
      clear();
    },
  });
}
