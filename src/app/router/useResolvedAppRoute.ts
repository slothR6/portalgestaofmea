import { useMemo } from "react";
import { useAppRouter } from "./RouterProvider";
import { resolveAppRoute } from "./routes";

export function useResolvedAppRoute() {
  const { pathname } = useAppRouter();
  return useMemo(() => resolveAppRoute(pathname), [pathname]);
}
