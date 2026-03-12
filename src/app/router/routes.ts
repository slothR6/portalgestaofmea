import { UserRole, ViewState } from "../../types";

export type RouteArea = "public" | "admin" | "provider" | "unknown";

export interface ResolvedAppRoute {
  area: RouteArea;
  view: ViewState | null;
  params: {
    companyId?: string;
    contactId?: string;
    opportunityId?: string;
    proposalId?: string;
    projectId?: string;
    deliveryId?: string;
  };
}

const PUBLIC_ROUTE_MAP: Record<string, ViewState> = {
  "/": "LOGIN",
  "/login": "LOGIN",
  "/signup": "SIGNUP",
  "/pending": "PENDING",
};

const ADMIN_VIEW_PATHS: Partial<Record<ViewState, string>> = {
  DASHBOARD: "/admin/dashboard",
  REUNIOES: "/admin/meetings",
  USUARIOS: "/admin/users",
  PRESTADORES: "/admin/providers",
  EMPRESAS: "/admin/companies",
  OPORTUNIDADES: "/admin/opportunities",
  PROPOSTAS: "/admin/proposals",
  PROJETOS: "/admin/projects",
  ENTREGAS: "/admin/deliveries",
  PERFIL: "/admin/profile",
};

const PROVIDER_VIEW_PATHS: Partial<Record<ViewState, string>> = {
  DASHBOARD: "/provider/dashboard",
  REUNIOES: "/provider/meetings",
  PROJETOS: "/provider/projects",
  ENTREGAS: "/provider/deliveries",
  PERFIL: "/provider/profile",
};

function trimTrailingSlash(pathname: string) {
  if (!pathname) return "/";
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
}

function matchDetailPath(pathname: string, prefix: string) {
  const normalizedPath = trimTrailingSlash(pathname);
  const normalizedPrefix = trimTrailingSlash(prefix);

  if (!normalizedPath.startsWith(`${normalizedPrefix}/`)) return null;

  const suffix = normalizedPath.slice(normalizedPrefix.length + 1);
  if (!suffix || suffix.includes("/")) return null;

  return decodeURIComponent(suffix);
}

export function normalizePathname(pathname: string) {
  return trimTrailingSlash(pathname || "/");
}

export function areaForRole(role: UserRole): Exclude<RouteArea, "public" | "unknown"> {
  return role === "ADMIN" ? "admin" : "provider";
}

export function getDefaultViewForRole(role: UserRole): ViewState {
  return "DASHBOARD";
}

export function isViewAllowedForRole(role: UserRole, view: ViewState) {
  if (role === "ADMIN") {
    return view !== "LOGIN" && view !== "SIGNUP" && view !== "PENDING";
  }

  return (
    view === "DASHBOARD" ||
    view === "REUNIOES" ||
    view === "PROJETOS" ||
    view === "DETALHE_PROJETO" ||
    view === "ENTREGAS" ||
    view === "DETALHE_ENTREGA" ||
    view === "PERFIL"
  );
}

export function resolveAppRoute(pathname: string): ResolvedAppRoute {
  const normalizedPath = normalizePathname(pathname);

  if (PUBLIC_ROUTE_MAP[normalizedPath]) {
    return {
      area: "public",
      view: PUBLIC_ROUTE_MAP[normalizedPath],
      params: {},
    };
  }

  const companyContactMatch = normalizedPath.match(/^\/admin\/companies\/([^/]+)\/contacts\/([^/]+)$/);
  if (companyContactMatch) {
    return {
      area: "admin",
      view: "EMPRESAS",
      params: {
        companyId: decodeURIComponent(companyContactMatch[1]),
        contactId: decodeURIComponent(companyContactMatch[2]),
      },
    };
  }

  const companyMatch = normalizedPath.match(/^\/admin\/companies\/([^/]+)$/);
  if (companyMatch) {
    return {
      area: "admin",
      view: "EMPRESAS",
      params: {
        companyId: decodeURIComponent(companyMatch[1]),
      },
    };
  }

  const opportunityMatch = normalizedPath.match(/^\/admin\/opportunities\/([^/]+)$/);
  if (opportunityMatch) {
    return {
      area: "admin",
      view: "OPORTUNIDADES",
      params: {
        opportunityId: decodeURIComponent(opportunityMatch[1]),
      },
    };
  }

  const proposalMatch = normalizedPath.match(/^\/admin\/proposals\/([^/]+)$/);
  if (proposalMatch) {
    return {
      area: "admin",
      view: "PROPOSTAS",
      params: {
        proposalId: decodeURIComponent(proposalMatch[1]),
      },
    };
  }

  const projectId =
    matchDetailPath(normalizedPath, "/admin/projects") ??
    matchDetailPath(normalizedPath, "/provider/projects");
  if (projectId) {
    return {
      area: normalizedPath.startsWith("/admin/") ? "admin" : "provider",
      view: "DETALHE_PROJETO",
      params: { projectId },
    };
  }

  const deliveryId =
    matchDetailPath(normalizedPath, "/admin/deliveries") ??
    matchDetailPath(normalizedPath, "/provider/deliveries");
  if (deliveryId) {
    return {
      area: normalizedPath.startsWith("/admin/") ? "admin" : "provider",
      view: "DETALHE_ENTREGA",
      params: { deliveryId },
    };
  }

  const adminRoutes: Record<string, ViewState> = {
    "/admin": "DASHBOARD",
    "/admin/dashboard": "DASHBOARD",
    "/admin/meetings": "REUNIOES",
    "/admin/users": "USUARIOS",
    "/admin/providers": "PRESTADORES",
    "/admin/companies": "EMPRESAS",
    "/admin/opportunities": "OPORTUNIDADES",
    "/admin/proposals": "PROPOSTAS",
    "/admin/projects": "PROJETOS",
    "/admin/deliveries": "ENTREGAS",
    "/admin/profile": "PERFIL",
  };

  if (adminRoutes[normalizedPath]) {
    return {
      area: "admin",
      view: adminRoutes[normalizedPath],
      params: {},
    };
  }

  const providerRoutes: Record<string, ViewState> = {
    "/provider": "DASHBOARD",
    "/provider/dashboard": "DASHBOARD",
    "/provider/meetings": "REUNIOES",
    "/provider/projects": "PROJETOS",
    "/provider/deliveries": "ENTREGAS",
    "/provider/profile": "PERFIL",
  };

  if (providerRoutes[normalizedPath]) {
    return {
      area: "provider",
      view: providerRoutes[normalizedPath],
      params: {},
    };
  }

  return {
    area: "unknown",
    view: null,
    params: {},
  };
}

interface BuildPathArgs {
  view: ViewState;
  role?: UserRole | null;
  selectedProjectId?: string | null;
  selectedDeliveryId?: string | null;
}

export function buildPathForView({
  view,
  role,
  selectedProjectId,
  selectedDeliveryId,
}: BuildPathArgs) {
  if (view === "LOGIN") return "/login";
  if (view === "SIGNUP") return "/signup";
  if (view === "PENDING") return "/pending";
  if (!role) return null;

  const area = areaForRole(role);
  const baseMap = role === "ADMIN" ? ADMIN_VIEW_PATHS : PROVIDER_VIEW_PATHS;

  if (view === "DETALHE_PROJETO") {
    if (!selectedProjectId) return null;
    return `/${area}/projects/${encodeURIComponent(selectedProjectId)}`;
  }

  if (view === "DETALHE_ENTREGA") {
    if (!selectedDeliveryId) return null;
    return `/${area}/deliveries/${encodeURIComponent(selectedDeliveryId)}`;
  }

  return baseMap[view] || null;
}
