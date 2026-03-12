import React, { createContext, useContext, useMemo, useState } from "react";
import { normalizePathname } from "./routes";

interface NavigateOptions {
  replace?: boolean;
}

interface RouterContextValue {
  pathname: string;
  navigate: (to: string, options?: NavigateOptions) => void;
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

export function AppRouterProvider({ children }: { children: React.ReactNode }) {
  const [pathname, setPathname] = useState(() =>
    typeof window === "undefined" ? "/" : normalizePathname(window.location.pathname)
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const onPopState = () => {
      setPathname(normalizePathname(window.location.pathname));
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const value = useMemo<RouterContextValue>(
    () => ({
      pathname,
      navigate: (to, options) => {
        if (typeof window === "undefined") return;

        const nextPath = normalizePathname(to);
        const currentPath = normalizePathname(window.location.pathname);

        if (nextPath === currentPath) {
          if (pathname !== nextPath) {
            setPathname(nextPath);
          }
          return;
        }

        if (options?.replace) {
          window.history.replaceState(null, "", nextPath);
        } else {
          window.history.pushState(null, "", nextPath);
        }

        setPathname(nextPath);
      },
    }),
    [pathname]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useAppRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useAppRouter must be used within AppRouterProvider");
  }
  return context;
}

