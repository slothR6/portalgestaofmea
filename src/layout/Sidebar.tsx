import React from "react";
import Logo from "../components/Logo";
import { UserRole, ViewState } from "../types";

type SidebarArea = "admin" | "provider";

interface NavItem {
  label: string;
  icon: string;
  id?: ViewState;
  badge?: number;
  disabled?: boolean;
  helper?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

function Icon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? "#013d23" : "#64748b";

  switch (name) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={stroke} strokeWidth="1.8">
          <path d="M4 5h7v6H4zM13 5h7v10h-7zM4 13h7v6H4zM13 17h7v2h-7z" />
        </svg>
      );
    case "companies":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={stroke} strokeWidth="1.8">
          <path d="M4 20V6l6-2v16M10 20h10V9l-10 2M7 10h.01M7 14h.01M14 12h.01M14 16h.01" />
        </svg>
      );
    case "opportunities":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={stroke} strokeWidth="1.8">
          <path d="M4 18 10 12l4 4 6-8" />
          <path d="M16 8h4v4" />
        </svg>
      );
    case "proposals":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={stroke} strokeWidth="1.8">
          <path d="M7 4h8l4 4v12H7z" />
          <path d="M15 4v4h4M10 12h6M10 16h6" />
        </svg>
      );
    case "projects":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={stroke} strokeWidth="1.8">
          <path d="M4 7h7v5H4zM13 7h7v5h-7zM4 14h7v5H4zM13 14h7v5h-7z" />
        </svg>
      );
    case "deliveries":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={stroke} strokeWidth="1.8">
          <path d="M4 8h11v9H4zM15 11h3l2 2v4h-5z" />
          <path d="M8 18a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM18 18a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
        </svg>
      );
    case "meetings":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={stroke} strokeWidth="1.8">
          <path d="M7 3v3M17 3v3M4 9h16M5 6h14v14H5z" />
          <path d="M9 13h6M9 17h4" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={stroke} strokeWidth="1.8">
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <path d="M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "providers":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={stroke} strokeWidth="1.8">
          <path d="M12 3 4 7l8 4 8-4-8-4Z" />
          <path d="M4 12l8 4 8-4M4 17l8 4 8-4" />
        </svg>
      );
    case "finance":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={stroke} strokeWidth="1.8">
          <path d="M4 7h16v10H4z" />
          <path d="M4 10h16M8 15h3" />
        </svg>
      );
    case "profile":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={stroke} strokeWidth="1.8">
          <path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path d="M5 21a7 7 0 0 1 14 0" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={stroke} strokeWidth="1.8">
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

function getNavGroups(area: SidebarArea, unread: number): NavGroup[] {
  if (area === "provider") {
    return [
      {
        label: "Visao geral",
        items: [{ id: "DASHBOARD", label: "Dashboard", icon: "dashboard", badge: unread }],
      },
      {
        label: "Operacao",
        items: [
          { id: "PROJETOS", label: "Projetos", icon: "projects" },
          { id: "ENTREGAS", label: "Entregas", icon: "deliveries" },
          { id: "REUNIOES", label: "Reunioes", icon: "meetings" },
        ],
      },
      {
        label: "Conta",
        items: [{ id: "PERFIL", label: "Meu perfil", icon: "profile" }],
      },
    ];
  }

  return [
    {
      label: "Visao geral",
      items: [{ id: "DASHBOARD", label: "Dashboard", icon: "dashboard", badge: unread }],
    },
    {
      label: "Comercial",
      items: [
        { id: "EMPRESAS", label: "Empresas", icon: "companies", helper: "Base de clientes e contatos" },
        { id: "OPORTUNIDADES", label: "Oportunidades", icon: "opportunities", helper: "Pipeline comercial" },
        { id: "PROPOSTAS", label: "Propostas", icon: "proposals", helper: "Conversao para projeto" },
      ],
    },
    {
      label: "Projetos",
      items: [
        { id: "PROJETOS", label: "Projetos", icon: "projects" },
        { id: "ENTREGAS", label: "Entregas", icon: "deliveries" },
        { id: "REUNIOES", label: "Reunioes", icon: "meetings" },
      ],
    },
    {
      label: "Operacao",
      items: [
        { id: "USUARIOS", label: "Usuarios", icon: "users" },
        { id: "PRESTADORES", label: "Prestadores", icon: "providers" },
      ],
    },
    {
      label: "Financeiro",
      items: [
        { label: "Painel financeiro", icon: "finance", disabled: true, helper: "Em breve" },
        { label: "Indicadores", icon: "finance", disabled: true, helper: "Em breve" },
      ],
    },
    {
      label: "Conta",
      items: [{ id: "PERFIL", label: "Meu perfil", icon: "profile" }],
    },
  ];
}

export default function Sidebar({
  area,
  role,
  userName,
  view,
  unread,
  onNav,
  onLogout,
  mobileOpen,
  onClose,
}: {
  area: SidebarArea;
  role: UserRole;
  userName: string;
  view: ViewState;
  unread: number;
  onNav: (v: ViewState) => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const navGroups = getNavGroups(area, unread);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm transition md:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[304px] flex-col border-r border-slate-200 bg-[rgba(255,255,255,0.96)] px-5 py-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#013d23]/5 ring-1 ring-[#013d23]/10">
              <Logo size={34} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.34em] text-[#013d23]">FMEA</p>
              <p className="mt-1 text-xs text-slate-500">Portal de gestao</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 md:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6 18 18M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="mt-5 rounded-[28px] border border-[#013d23]/10 bg-[#013d23] px-4 py-5 text-white shadow-[0_20px_50px_-35px_rgba(1,61,35,0.85)]">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-white/60">
            {area === "admin" ? "Operacao corporativa" : "Area do prestador"}
          </p>
          <p className="mt-3 text-lg font-black leading-tight">
            {area === "admin"
              ? "Fluxo comercial, propostas e projetos no mesmo lugar."
              : "Entregas, projetos e reunioes em uma unica visao."}
          </p>
        </div>

        <nav className="mt-5 flex-1 space-y-5 overflow-y-auto pr-1">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.32em] text-slate-400">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = item.id ? view === item.id : false;

                  if (!item.id || item.disabled) {
                    return (
                      <div
                        key={`${group.label}-${item.label}`}
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-slate-400"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
                          <Icon name={item.icon} active={false} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-500">{item.label}</p>
                          {item.helper ? <p className="mt-0.5 text-xs text-slate-400">{item.helper}</p> : null}
                        </div>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                          Em breve
                        </span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={`${group.label}-${item.id}`}
                      onClick={() => {
                        onNav(item.id as ViewState);
                        onClose();
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ${
                        active
                          ? "bg-[#013d23]/6 ring-1 ring-[#013d23]/12"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                          active ? "bg-[#d5d88e]/55" : "bg-slate-100"
                        }`}
                      >
                        <Icon name={item.icon} active={active} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold ${active ? "text-[#013d23]" : "text-slate-700"}`}>
                            {item.label}
                          </p>
                          {item.badge && item.badge > 0 ? (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-700">
                              {item.badge}
                            </span>
                          ) : null}
                        </div>
                        {item.helper ? (
                          <p className={`mt-0.5 text-xs ${active ? "text-[#013d23]/72" : "text-slate-400"}`}>
                            {item.helper}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-5 rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d5d88e]/55 text-sm font-black text-[#013d23]">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-900">{userName}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{role}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-black uppercase tracking-[0.28em] text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Encerrar sessao
          </button>
        </div>
      </aside>
    </>
  );
}
