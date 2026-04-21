import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { meRequest } from "./auth.api";
import { useAuthStore } from "./auth.store";

export function useSession() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clear = useAuthStore((s) => s.clear);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  const query = useQuery({
    queryKey: ["session"],
    queryFn: meRequest,
    enabled: isHydrated && !!user,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) setUser(query.data);
  }, [query.data, setUser]);

  useEffect(() => {
    if (query.isError) clear();
  }, [query.isError, clear]);

  useEffect(() => {
    const handler = () => clear();
    window.addEventListener("auth:unauthorized", handler);
    return () => window.removeEventListener("auth:unauthorized", handler);
  }, [clear]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading: !isHydrated || (!!user && query.isLoading),
    isHydrated,
  };
}
