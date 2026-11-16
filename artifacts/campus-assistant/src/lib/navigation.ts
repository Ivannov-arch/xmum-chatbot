import { useMemo } from "react";
import { useLocation } from "wouter";

export function usePathname() {
  return useLocation()[0];
}

export function useRouter() {
  const [, navigate] = useLocation();
  return useMemo(() => ({
    push: (path: string) => navigate(path),
    replace: (path: string) => navigate(path, { replace: true }),
  }), [navigate]);
}
