import { SpeedInsights } from "@vercel/speed-insights/next"
import React, { useEffect, useMemo, useState } from "react";
import { EmailAuthProvider, linkWithCredential } from "firebase/auth";
import {
  AppNotification,
  Delivery,
  Meeting,
  Priority,
  Progress,
  Project,
  Status,
  UserProfile,
  UserRole,
  ViewState,
  ProviderSafetyDoc,
  ExternalLink,
  Company,
} from "./types";

import { auth, db } from "./firebase";
import { onSnapshot, collection, orderBy, query, where, doc, updateDoc, addDoc, deleteDoc, deleteField } from "firebase/firestore";

import { useAuth } from "./hooks/useAuth";
import { useToasts } from "./hooks/useToasts";
import Toasts from "./components/ui/Toasts";
import Sidebar from "./layout/Sidebar";

import { loginEmail, signupEmail, logout, loginGoogle, sendPasswordReset } from "./services/auth";
import {
  approveUser as approveUserSvc,
  rejectUser as rejectUserSvc,
  softDeleteUser,
  createProject,
  updateProject as updateProjectSvc,
  deleteProject as deleteProjectSvc,
  createDelivery,
  updateDelivery,
  deleteDelivery,
  addProviderSafetyDoc,
  deleteProviderSafetyDoc,
  createMeeting,
  updateMeeting as updateMeetingSvc,
  getBaseUsersQuery,
  getAdminUsersQuery,
  getBaseProjectsQuery,
  getBaseDeliveriesQuery,
  getMeetingsQuery,
  getSafetyDocsQuery,
} from "./services/portal";
import { getCompaniesQuery } from "./services/companies";

import CompaniesPage from "./pages/CompaniesPage";

import Logo from "./components/Logo";
import { usePagination } from "./hooks/usePagination";

// --------- Helpers ----------
const nowPtBr = () => new Date().toLocaleString("pt-BR");

function sanitize(s: string) {
  return (s || "").trim().replace(/\s+/g, " ");
}

function isValidDateISO(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function isValidExternalUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

function formatDateTime(value: number) {
  return new Date(value).toLocaleString("pt-BR");
}

function formatDateInput(value: number) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeInput(value: number) {
  const date = new Date(value);
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}

function buildTimestamp(date: string, time: string) {
  return new Date(`${date}T${time}:00`).getTime();
}

function getMeetingStatusLabel(status: Meeting["status"]) {
  switch (status) {
    case "DONE":
      return "Concluída";
    case "CANCELED":
      return "Cancelada";
    default:
      return "Agendada";
  }
}

function getMeetingStatusClasses(status: Meeting["status"]) {
  switch (status) {
    case "DONE":
      return "bg-emerald-100/70 text-emerald-700 border-emerald-200";
    case "CANCELED":
      return "bg-red-100/70 text-red-700 border-red-200";
    default:
      return "bg-blue-100/70 text-blue-700 border-blue-200";
  }
}

function resolveProgress(status: Status, progress?: Progress) {
  if (progress) return progress;
  switch (status) {
    case "APROVADO":
      return "APROVADO";
    case "REVISAO":
      return "REVISAO";
    case "AJUSTES":
      return "FAZENDO";
    default:
      return "A_FAZER";
  }
}

function getNotificationLocation(type: AppNotification["type"]) {
  switch (type) {
    case "MEETING":
      return "Reuniões";
    case "COMMENT":
    case "SUBMITTED":
    case "APPROVED":
    case "ADJUST_REQUESTED":
    case "NEW_DELIVERY":
    case "STARTED":
    case "DEADLINE_CHANGE_REQUESTED":
    case "DEADLINE_CHANGE_APPROVED":
    case "DEADLINE_CHANGE_REJECTED":
      return "Entregas";
    default:
      return "Dashboard";
  }
}

const Badge: React.FC<{ type: "status" | "priority"; value: string }> = ({ type, value }) => {
  const getColors = () => {
    if (type === "status") {
      switch (value) {
        case "APROVADO":
          return "bg-emerald-100/70 text-emerald-700 border-emerald-200";
        case "ATRASADO":
          return "bg-red-100/70 text-red-700 border-red-200";
        case "AJUSTES":
          return "bg-amber-100/70 text-amber-700 border-amber-200";
        case "REVISAO":
          return "bg-blue-100/70 text-blue-700 border-blue-200";
        case "FAZENDO":
          return "bg-indigo-100/70 text-indigo-700 border-indigo-200";
        default:
          return "bg-slate-100 text-slate-700 border-slate-200";
      }
    }
    switch (value) {
      case "ALTA":
        return "bg-red-100/70 text-red-700 border-red-200";
      case "MEDIA":
        return "bg-amber-100/70 text-amber-700 border-amber-200";
      default:
        return "bg-sky-100/70 text-sky-700 border-sky-200";
    }
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-[0.25em] ${getColors()}`}
    >
      {value}
    </span>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({
  children,
  className = "",
  onClick,
}) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-3xl border border-slate-200/80 shadow-[0_22px_45px_-35px_rgba(15,23,42,0.45)] p-8 transition-all duration-300 ${
      onClick ? "cursor-pointer hover:shadow-[0_30px_70px_-40px_rgba(15,23,42,0.5)] hover:-translate-y-1" : ""
    } ${className}`}
  >
    {children}
  </div>
);

const Button: React.FC<{
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "danger";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}> = ({ onClick, children, variant = "primary", className = "", disabled, type = "button" }) => {
  const variants = {
    primary:
      "bg-gradient-to-r from-slate-900 via-blue-900 to-blue-600 text-white shadow-lg shadow-blue-900/30 hover:from-slate-800 hover:via-blue-800 hover:to-blue-500",
    secondary: "bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20",
    outline: "border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`px-6 py-3 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-[0.3em] shadow-sm hover:shadow-md ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Modal: React.FC<{ open: boolean; title: string; onClose: () => void; children: React.ReactNode }> = ({
  open,
  title,
  onClose,
  children,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] bg-black/40 flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <h3 className="text-slate-900 text-xl font-black">{title}</h3>
          <button onClick={onClose} className="text-2xl text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

export default function App() {
  const { authReady, user, profile, role, view, setView } = useAuth();
  const { toasts, push, remove: onCloseToast } = useToasts();

  // UI state
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [linkPassword, setLinkPassword] = useState("");
  const [linkPasswordConfirm, setLinkPasswordConfirm] = useState("");
  const [linkingPassword, setLinkingPassword] = useState(false);

  // Loading states
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  // login/signup fields
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [pixKey, setPixKey] = useState("");

  // Data
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [adminUids, setAdminUids] = useState<string[]>([]);

  // Selected
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<UserProfile | null>(null);

  // Providers
  const [selectedProviderUid, setSelectedProviderUid] = useState<string | null>(null);
  const [providerDocs, setProviderDocs] = useState<ProviderSafetyDoc[]>([]);

  // Modals
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectEditModalOpen, setProjectEditModalOpen] = useState(false);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);

  // forms
  const [projectForm, setProjectForm] = useState({
    companyId: "",
    name: "",
    description: "",
    memberUids: [] as string[],
  });
  const [projectEditForm, setProjectEditForm] = useState({
    id: "",
    companyId: "",
    companyName: "",
    name: "",
    description: "",
    memberUids: [] as string[],
  });

  const [deliveryForm, setDeliveryForm] = useState({
    projectId: "",
    title: "",
    deadline: "",
    priority: "MEDIA" as Priority,
    providerUid: "",
    providerName: "",
    description: "",
  });

  const [meetingForm, setMeetingForm] = useState({
    title: "",
    description: "",
    startDate: "",
    startTime: "",
    endTime: "",
    link: "",
    participantUids: [] as string[],
  });

  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);

  const [projectLinkForm, setProjectLinkForm] = useState({ title: "", url: "" });
  const [deliveryLinkForm, setDeliveryLinkForm] = useState({ title: "", url: "" });

  const [safetyDocForm, setSafetyDocForm] = useState({
    title: "",
    issuedAt: "",
    expiresAt: "",
    externalUrl: "",
    notes: "",
  });
  const [deadlineRequestForm, setDeadlineRequestForm] = useState({ requestedDeadline: "", reason: "" });
  const [deadlineDecisionNote, setDeadlineDecisionNote] = useState("");

  const userDisplayName = useMemo(() => profile?.name || "Usuário", [profile]);
  const hasGoogleProvider = useMemo(
    () => user?.providerData?.some((p) => p.providerId === "google.com") ?? false,
    [user?.providerData]
  );
  const hasPasswordProvider = useMemo(
    () => user?.providerData?.some((p) => p.providerId === "password") ?? false,
    [user?.providerData]
  );
  const unreadNotifCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  useEffect(() => {
    if (user && profile && view === "LOGIN") {
      setView(profile.role === "ADMIN" ? "DASHBOARD" : "ENTREGAS");
    }
  }, [user, profile, view, setView]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  const selectedDelivery = useMemo(
    () => deliveries.find((d) => d.id === selectedDeliveryId) || null,
    [deliveries, selectedDeliveryId]
  );

  useEffect(() => {
    setDeadlineDecisionNote("");
    setDeadlineRequestForm({ requestedDeadline: "", reason: "" });
  }, [selectedDeliveryId]);

  const meetingParticipants = useMemo(
    () =>
      usersList.filter(
        (u) => u.status === "ACTIVE" && u.active && (u.role === "ADMIN" || u.role === "PRESTADOR")
      ),
    [usersList]
  );

  const meetingsSorted = useMemo(
    () => [...meetings].sort((a, b) => a.startsAt - b.startsAt),
    [meetings]
  );

  const timeOptions = useMemo(() => {
    const options: string[] = [];
    for (let hour = 0; hour < 24; hour += 1) {
      for (let minute = 0; minute < 60; minute += 30) {
        options.push(`${`${hour}`.padStart(2, "0")}:${`${minute}`.padStart(2, "0")}`);
      }
    }
    return options;
  }, []);

  const endTimeOptions = useMemo(() => {
    if (!meetingForm.startTime) return timeOptions;
    return timeOptions.filter((time) => time > meetingForm.startTime);
  }, [meetingForm.startTime, timeOptions]);

  const { meetingsToday, meetingsUpcoming, meetingsHistory } = useMemo(() => {
    const now = Date.now();
    const activeThreshold = now - 2 * 60 * 60 * 1000;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const normalized = meetingsSorted.map((m) => ({
      ...m,
      status: m.status || "SCHEDULED",
    }));

    const scheduled = normalized.filter((m) => m.status === "SCHEDULED");
    const meetingsToday = scheduled.filter(
      (m) => m.startsAt >= startOfDay.getTime() && m.startsAt <= endOfDay.getTime() && m.endsAt >= activeThreshold
    );
    const meetingsUpcoming = scheduled.filter((m) => m.startsAt > endOfDay.getTime() && m.endsAt >= activeThreshold);
    const meetingsHistory = normalized.filter(
      (m) =>
        m.status !== "SCHEDULED" ||
        m.endsAt < activeThreshold ||
        m.startsAt < startOfDay.getTime()
    );

    return {
      meetingsToday,
      meetingsUpcoming,
      meetingsHistory,
    };
  }, [meetingsSorted]);

  // ---------- Live subscriptions ----------
  useEffect(() => {
    if (!user || !profile || !profile.active) return;

    setLoadingProjects(true);
    setLoadingCompanies(profile.role === "ADMIN");
    setLoadingDeliveries(true);
    setLoadingMeetings(true);
    setLoadingUsers(profile.role === "ADMIN");

    let unsubUsers = () => {};
    if (profile.role === "ADMIN") {
      const usersQ = getBaseUsersQuery(true);
      unsubUsers = onSnapshot(
        usersQ,
        (snap) => {
          // Filtra DELETED no client-side para admin
          const arr = snap.docs
            .map((d) => d.data() as UserProfile)
            .filter((u) => u.status !== "DELETED");
          setUsersList(arr);
          setLoadingUsers(false);
        },
        (error) => {
          console.error("Error loading users:", error);
          push({ type: "error", title: "Erro ao carregar usuários", message: error.message });
          setLoadingUsers(false);
        }
      );
    } else {
      setUsersList([]);
      setLoadingUsers(false);
    }

    const adminUsersQ = getAdminUsersQuery();
    const unsubAdmins = onSnapshot(
      adminUsersQ,
      (snap) => {
        const arr = snap.docs.map((d) => d.data() as UserProfile);
        setAdminUids(arr.map((u) => u.uid));
      },
      (error) => {
        console.error("Error loading admin users:", error);
        push({ type: "error", title: "Erro ao carregar administradores", message: error.message });
      }
    );

    let unsubCompanies = () => {};
    if (profile.role === "ADMIN") {
      const companiesQ = getCompaniesQuery();
      unsubCompanies = onSnapshot(
        companiesQ,
        (snap) => {
          const arr = snap.docs
            .map((d) => ({ ...(d.data() as Company), id: d.id }))
            .filter((c) => !c.deletedAt);
          setCompanies(arr);
          setLoadingCompanies(false);
        },
        (error) => {
          console.error("Error loading companies:", error);
          push({ type: "error", title: "Erro ao carregar empresas", message: error.message });
          setLoadingCompanies(false);
        }
      );
    } else {
      setCompanies([]);
      setLoadingCompanies(false);
    }

    // Projects
    const projectsQ = getBaseProjectsQuery(profile.role === "ADMIN", user.uid);
    const unsubProjects = onSnapshot(
      projectsQ,
      (snap) => {
        console.log("Projects loaded:", snap.size, "docs for user:", user.uid, "role:", profile.role);
        const arr = snap.docs
          .map((d) => {
            const data = d.data() as any;
            return {
              ...data,
              id: d.id,
              // Suporte a projetos antigos que ainda tinham o campo "client".
              companyName: data.companyName || data.client || "Empresa não definida",
              companyId: data.companyId || "",
            } as Project;
          })
          .filter((p) => !p.deletedAt);
        console.log("Projects after filter:", arr);
        setProjects(arr);
        setLoadingProjects(false);
      },
      (error) => {
        console.error("Error loading projects:", error);
        console.error("User uid:", user.uid, "Role:", profile.role);
        push({ type: "error", title: "Erro ao carregar projetos", message: error.message });
        setLoadingProjects(false);
      }
    );

    // Deliveries
    const deliveriesQ = getBaseDeliveriesQuery(profile.role === "ADMIN", user.uid);
    const unsubDeliveries = onSnapshot(
      deliveriesQ,
      (snap) => {
        const arr = snap.docs
          .map((d) => {
            const data = d.data() as Delivery;
            return {
              ...data,
              id: d.id,
              progress: resolveProgress(data.status, data.progress),
            } as Delivery;
          })
          .filter((d) => !d.deletedAt);
        setDeliveries(arr);
        setLoadingDeliveries(false);
      },
      (error) => {
        console.error("Error loading deliveries:", error);
        push({ type: "error", title: "Erro ao carregar entregas", message: error.message });
        setLoadingDeliveries(false);
      }
    );

    // Meetings
    const meetingsQ = getMeetingsQuery(profile.role === "ADMIN", user.uid);
    const unsubMeetings = onSnapshot(
      meetingsQ,
      (snap) => {
        const arr = snap.docs.map((d) => {
          const data = d.data() as Meeting;
          return { ...data, id: d.id, status: data.status || "SCHEDULED" } as Meeting;
        });
        setMeetings(arr);
        setLoadingMeetings(false);
      },
      (error) => {
        console.error("Error loading meetings:", error);
        push({ type: "error", title: "Erro ao carregar reuniões", message: error.message });
        setLoadingMeetings(false);
      }
    );

    // Notifications
    const notifQ = query(collection(db, "notifications"), where("toUid", "==", user.uid), orderBy("createdAt", "desc"));
    const unsubNotif = onSnapshot(
      notifQ,
      (snap) => {
        const arr = snap.docs.map((d) => ({ ...(d.data() as any), id: d.id } as AppNotification));
        setNotifications(arr);
      },
      (error) => {
        console.error("Error loading notifications:", error);
        push({ type: "error", title: "Erro ao carregar notificações", message: error.message });
      }
    );

    return () => {
      unsubUsers();
      unsubCompanies();
      unsubProjects();
      unsubDeliveries();
      unsubMeetings();
      unsubNotif();
      unsubAdmins();
    };
  }, [user?.uid, profile?.role, profile?.active]);

  // Provider docs live
  useEffect(() => {
    if (!selectedProviderUid) {
      setProviderDocs([]);
      setSafetyDocForm({ title: "", issuedAt: "", expiresAt: "", externalUrl: "", notes: "" });
      return;
    }
    const qDocs = getSafetyDocsQuery(selectedProviderUid);
    const unsub = onSnapshot(
      qDocs,
      (snap) => {
        const arr = snap.docs.map((d) => ({ ...(d.data() as any), id: d.id } as ProviderSafetyDoc));
        setProviderDocs(arr);
      },
      (error) => {
        console.error("Error loading safety docs:", error);
        push({ type: "error", title: "Erro ao carregar registros do prestador", message: error.message });
      }
    );
    return () => unsub();
  }, [selectedProviderUid]);

  // ---------- Pagination (client-side slice) ----------
  const usersPaged = usePagination(usersList);
  const projectsPaged = usePagination(projects);
  const deliveriesPaged = usePagination(deliveries);
  const deliveriesByProgress = useMemo(() => {
    const columns: Record<Progress, Delivery[]> = {
      A_FAZER: [],
      FAZENDO: [],
      REVISAO: [],
      APROVADO: [],
    };
    deliveriesPaged.sliced.forEach((delivery) => {
      const progress = resolveProgress(delivery.status, delivery.progress);
      columns[progress].push(delivery);
    });
    return columns;
  }, [deliveriesPaged.sliced]);
  const deliveryColumns: { key: Progress; title: string; subtitle: string }[] = [
    { key: "A_FAZER", title: "A fazer", subtitle: "Backlog" },
    { key: "FAZENDO", title: "Fazendo", subtitle: "Em execução" },
    { key: "REVISAO", title: "Revisão", subtitle: "Qualidade" },
    { key: "APROVADO", title: "Aprovado", subtitle: "Histórico" },
  ];

  // ---------- Auth actions ----------
  const doLogin = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await loginEmail(email, senha);
      push({ type: "success", title: "Login realizado" });
    } catch (e: any) {
      setAuthError(e?.message || "Não foi possível entrar.");
      push({ type: "error", title: "Falha no login", message: e?.message || "" });
    } finally {
      setAuthLoading(false);
    }
  };

  const doSignup = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signupEmail({ name: nome, email, password: senha, pixKey });
      push({ type: "success", title: "Conta criada", message: "Aguardando aprovação do admin." });
    } catch (e: any) {
      setAuthError(e?.message || "Não foi possível criar conta.");
      push({ type: "error", title: "Falha ao criar conta", message: e?.message || "" });
    } finally {
      setAuthLoading(false);
    }
  };

  const doGoogle = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await loginGoogle();
      push({ type: "success", title: "Conectado com Google", message: "Se for primeiro acesso, ficará pendente." });
    } catch (e: any) {
      setAuthError(e?.message || "Não foi possível entrar com Google.");
      push({ type: "error", title: "Falha no Google", message: e?.message || "" });
    } finally {
      setAuthLoading(false);
    }
  };

  const doLogout = async () => {
    await logout();
    setEmail("");
    setSenha("");
    setNome("");
    setPixKey("");
    setSelectedDeliveryId(null);
    setSelectedProjectId(null);
    setSelectedProviderUid(null);
    setView("LOGIN");
    push({ type: "info", title: "Sessão encerrada" });
  };

  const doResetPassword = async () => {
    if (!email || !email.trim()) {
      push({ type: "error", title: "Digite seu email no campo acima" });
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      await sendPasswordReset(email);
      push({ 
        type: "success", 
        title: "Email enviado!", 
        message: "Verifique sua caixa de entrada e spam." 
      });
      setResetPasswordModalOpen(false);
    } catch (e: any) {
      setAuthError(e?.message || "Erro ao enviar email de recuperação.");
      push({ type: "error", title: "Erro", message: e?.message || "" });
    } finally {
      setAuthLoading(false);
    }
  };

  const doLinkPassword = async () => {
    if (!user) return;
    if (hasPasswordProvider) {
      push({ type: "info", title: "Email/senha já vinculado a esta conta." });
      return;
    }
    if (!user.email) {
      push({ type: "error", title: "Conta sem email principal para vincular senha." });
      return;
    }
    if (!linkPassword || linkPassword.length < 6) {
      push({ type: "error", title: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (linkPassword !== linkPasswordConfirm) {
      push({ type: "error", title: "As senhas não coincidem." });
      return;
    }

    setLinkingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, linkPassword);
      await linkWithCredential(user, credential);
      setLinkPassword("");
      setLinkPasswordConfirm("");
      push({ type: "success", title: "Senha vinculada com sucesso." });
    } catch (e: any) {
      push({ type: "error", title: "Erro ao vincular senha", message: e?.message || "" });
    } finally {
      setLinkingPassword(false);
    }
  };

  // ---------- Admin: approve/reject/delete ----------
  const approveUser = async (u: UserProfile, newRole: UserRole) => {
    try {
      await approveUserSvc(u.uid, newRole);
      push({ type: "success", title: "Usuário aprovado", message: `${u.name} -> ${newRole}` });
    } catch (e: any) {
      push({ type: "error", title: "Erro ao aprovar usuário", message: e?.message || "" });
    }
  };

  const rejectUser = async (u: UserProfile) => {
    try {
      await rejectUserSvc(u.uid);
      push({ type: "info", title: "Usuário rejeitado", message: u.name });
    } catch (e: any) {
      push({ type: "error", title: "Erro ao rejeitar usuário", message: e?.message || "" });
    }
  };

  const removeUser = async (u: UserProfile) => {
    if (!confirm(`Remover usuário "${u.name}"? (soft delete)`)) return;
    try {
      await softDeleteUser(u.uid);
      push({ type: "success", title: "Usuário removido", message: u.name });
    } catch (e: any) {
      push({ type: "error", title: "Erro ao remover usuário", message: e?.message || "" });
    }
  };

  const openUserProfile = (u: UserProfile) => {
    setSelectedUserProfile(u);
  };

  const closeUserProfile = () => {
    setSelectedUserProfile(null);
  };

  // ---------- Project CRUD ----------
  const openCreateProject = () => {
    setProjectForm({ companyId: "", name: "", description: "", memberUids: [] });
    setProjectModalOpen(true);
  };

  const saveProject = async () => {
    if (!profile || profile.role !== "ADMIN") return;

    const companyId = projectForm.companyId;
    const company = companies.find((c) => c.id === companyId) || null;
    const name = sanitize(projectForm.name);
    const description = sanitize(projectForm.description);

    if (!companyId || !company) {
      push({ type: "error", title: "Selecione uma empresa válida" });
      return;
    }
    if (!name) {
      push({ type: "error", title: "Informe o nome do projeto" });
      return;
    }

    try {
      await createProject({
        companyId,
        companyName: company.name,
        name,
        description,
        manager: profile.name,
        managerUid: profile.uid,
        memberUids: projectForm.memberUids,
        status: "EM_ANDAMENTO",
        completionRate: 0,
        createdAt: Date.now(),
      });
      setProjectModalOpen(false);
      push({ type: "success", title: "Projeto criado" });
      setView("PROJETOS");
    } catch (e: any) {
      push({ type: "error", title: "Erro ao criar projeto", message: e?.message || "" });
    }
  };

  const openEditProject = (p: Project) => {
    setProjectEditForm({
      id: p.id,
      companyId: p.companyId,
      companyName: p.companyName,
      name: p.name,
      description: p.description || "",
      memberUids: p.memberUids || [],
    });
    setProjectEditModalOpen(true);
  };

  const saveProjectEdits = async () => {
    if (!profile || profile.role !== "ADMIN") return;

    const companyId = projectEditForm.companyId;
    const company = companies.find((c) => c.id === companyId) || null;
    const name = sanitize(projectEditForm.name);
    const description = sanitize(projectEditForm.description);

    if (!companyId || !company) {
      push({ type: "error", title: "Selecione uma empresa válida" });
      return;
    }
    if (!name) {
      push({ type: "error", title: "Informe o nome do projeto" });
      return;
    }

    try {
      await updateProjectSvc(projectEditForm.id, {
        companyId,
        companyName: company.name,
        name,
        description,
        memberUids: projectEditForm.memberUids,
      });
      setProjectEditModalOpen(false);
      push({ type: "success", title: "Projeto atualizado" });
    } catch (e: any) {
      push({ type: "error", title: "Erro ao atualizar projeto", message: e?.message || "" });
    }
  };

  const deleteProject = async (p: Project) => {
    if (!confirm(`Excluir o projeto "${p.name}"? Isso também removerá as entregas dele.`)) return;
    try {
      await deleteProjectSvc(p.id);
      push({ type: "success", title: "Projeto excluído" });
      setView("PROJETOS");
      if (selectedProjectId === p.id) setSelectedProjectId(null);
    } catch (e: any) {
      push({ type: "error", title: "Erro ao excluir projeto", message: e?.message || "" });
    }
  };

  // ---------- Delivery CRUD ----------
  const openCreateDelivery = (projectId?: string) => {
    setDeliveryForm({
      projectId: projectId || "",
      title: "",
      deadline: "",
      priority: "MEDIA",
      providerUid: "",
      providerName: "",
      description: "",
    });
    setDeliveryModalOpen(true);
  };

  const projectMembers = useMemo(() => {
    if (!deliveryForm.projectId) return [];
    const p = projects.find((x) => x.id === deliveryForm.projectId);
    const memberUids = p?.memberUids || [];
    return usersList
      .filter((u) => u.role === "PRESTADOR" && u.active && u.status === "ACTIVE")
      .filter((u) => memberUids.includes(u.uid));
  }, [deliveryForm.projectId, projects, usersList]);

  const saveDelivery = async () => {
    if (!profile || profile.role !== "ADMIN") return;

    const p = projects.find((x) => x.id === deliveryForm.projectId);
    if (!p) {
      push({ type: "error", title: "Selecione um projeto" });
      return;
    }

    const title = sanitize(deliveryForm.title);
    const deadline = deliveryForm.deadline;

    if (!title) return push({ type: "error", title: "Informe o título da entrega" });
    if (!deadline || !isValidDateISO(deadline)) return push({ type: "error", title: "Informe um prazo válido" });
    if (!deliveryForm.providerUid) return push({ type: "error", title: "Selecione um prestador" });

    try {
      const deliveryId = await createDelivery({
        projectId: p.id,
        client: p.companyName || "Empresa não definida",
        project: p.name,
        title,
        deadline,
        status: "PENDENTE" as Status,
        progress: "A_FAZER" as Progress,
        priority: deliveryForm.priority,
        providerUid: deliveryForm.providerUid,
        provider: deliveryForm.providerName || "Prestador",
        description: sanitize(deliveryForm.description),
        checklist: [],
        createdAt: Date.now(),
      });
      await addDoc(collection(db, "notifications"), {
        toUid: deliveryForm.providerUid,
        type: "NEW_DELIVERY",
        title: `Nova entrega atribuída: ${title}`,
        projectId: p.id,
        deliveryId,
        createdAt: Date.now(),
        read: false,
      });
      setDeliveryModalOpen(false);
      push({ type: "success", title: "Entrega criada" });
      setView("ENTREGAS");
    } catch (e: any) {
      push({ type: "error", title: "Erro ao criar entrega", message: e?.message || "" });
    }
  };

  const removeDelivery = async (d: Delivery) => {
    if (!confirm(`Excluir entrega "${d.title}"?`)) return;
    try {
      await deleteDelivery(d.id);
      push({ type: "success", title: "Entrega excluída" });
      if (selectedDeliveryId === d.id) setSelectedDeliveryId(null);
      setView("ENTREGAS");
    } catch (e: any) {
      push({ type: "error", title: "Erro ao excluir entrega", message: e?.message || "" });
    }
  };

  // ---------- Meetings ----------
  const resetMeetingForm = () => {
    setMeetingForm({
      title: "",
      description: "",
      startDate: "",
      startTime: "",
      endTime: "",
      link: "",
      participantUids: [],
    });
    setEditingMeetingId(null);
  };

  const startEditMeeting = (meeting: Meeting) => {
    setMeetingForm({
      title: meeting.title,
      description: meeting.description || "",
      startDate: formatDateInput(meeting.startsAt),
      startTime: formatTimeInput(meeting.startsAt),
      endTime: formatTimeInput(meeting.endsAt),
      link: meeting.link || "",
      participantUids: meeting.participantUids || [],
    });
    setEditingMeetingId(meeting.id);
  };

  const toggleMeetingParticipant = (uid: string) => {
    setMeetingForm((m) => {
      const next = new Set(m.participantUids);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return { ...m, participantUids: Array.from(next) };
    });
  };

  const saveMeeting = async () => {
    if (!profile || !user || profile.role !== "ADMIN") return;

    const title = sanitize(meetingForm.title);
    const description = sanitize(meetingForm.description);
    const startsAt = buildTimestamp(meetingForm.startDate, meetingForm.startTime);
    const endsAt = buildTimestamp(meetingForm.startDate, meetingForm.endTime);

    if (!title) return push({ type: "error", title: "Informe o título da reunião" });
    if (!meetingForm.startDate || !meetingForm.startTime || Number.isNaN(startsAt)) {
      return push({ type: "error", title: "Informe data e hora de início" });
    }
    if (!meetingForm.endTime || Number.isNaN(endsAt)) {
      return push({ type: "error", title: "Informe data e hora de término" });
    }
    if (endsAt <= startsAt) {
      return push({ type: "error", title: "Término deve ser após o início" });
    }

    if (meetingForm.participantUids.length === 0) {
      return push({ type: "error", title: "Selecione os participantes" });
    }

    const participants = Array.from(new Set([...meetingForm.participantUids, user.uid]));

    try {
      if (editingMeetingId) {
        const existing = meetings.find((m) => m.id === editingMeetingId);
        if (!existing) {
          push({ type: "error", title: "Reunião não encontrada" });
          return;
        }

        await updateMeetingSvc(editingMeetingId, {
          title,
          description,
          startsAt,
          endsAt,
          participantUids: participants,
          link: sanitize(meetingForm.link),
        });

        const newInvitees = participants.filter(
          (uid) => uid !== user.uid && !existing.participantUids.includes(uid)
        );
        await Promise.all(
          newInvitees.map((uid) =>
            addDoc(collection(db, "notifications"), {
              toUid: uid,
              type: "MEETING",
              title: `Atualização de reunião: ${title}`,
              createdAt: Date.now(),
              read: false,
            })
          )
        );

        resetMeetingForm();
        push({ type: "success", title: "Reunião atualizada" });
      } else {
        await createMeeting({
          title,
          description,
          startsAt,
          endsAt,
          status: "SCHEDULED",
          participantUids: participants,
          link: sanitize(meetingForm.link),
          createdByUid: user.uid,
          createdAt: Date.now(),
        });

        const invitees = participants.filter((uid) => uid !== user.uid);
        await Promise.all(
          invitees.map((uid) =>
            addDoc(collection(db, "notifications"), {
              toUid: uid,
              type: "MEETING",
              title: `Nova reunião: ${title}`,
              createdAt: Date.now(),
              read: false,
            })
          )
        );

        resetMeetingForm();
        push({ type: "success", title: "Reunião criada" });
        setView("REUNIOES");
      }
    } catch (e: any) {
      push({
        type: "error",
        title: editingMeetingId ? "Erro ao atualizar reunião" : "Erro ao criar reunião",
        message: e?.message || "",
      });
    }
  };

  const updateMeetingStatus = async (meeting: Meeting, status: Meeting["status"]) => {
    if (!profile || profile.role !== "ADMIN") return;
    const label = status === "DONE" ? "concluir" : "cancelar";
    if (!confirm(`Deseja ${label} a reunião "${meeting.title}"?`)) return;

    try {
      const patch =
        status === "DONE"
          ? { status, completedAt: Date.now() }
          : { status, completedAt: deleteField() as unknown as number };
      await updateMeetingSvc(meeting.id, patch);
      push({
        type: "success",
        title: status === "DONE" ? "Reunião concluída" : "Reunião cancelada",
      });
    } catch (e: any) {
      push({
        type: "error",
        title: "Erro ao atualizar reunião",
        message: e?.message || "",
      });
    }
  };

  // ---------- Comments ----------
  const [commentText, setCommentText] = useState("");

  // ---------- External links ----------
  const buildExternalLink = (title: string, url: string): ExternalLink => ({
    id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    url,
    createdAt: Date.now(),
    createdByUid: user?.uid || "",
  });

  const addProjectLink = async () => {
    if (!selectedProject || !user || role !== "ADMIN") return;
    const title = sanitize(projectLinkForm.title);
    const url = sanitize(projectLinkForm.url);

    if (!title) return push({ type: "error", title: "Informe o título do link" });
    if (!url || !isValidExternalUrl(url)) {
      return push({ type: "error", title: "URL inválida (use http:// ou https://)" });
    }

    try {
      const nextLinks = [...(selectedProject.externalLinks || []), buildExternalLink(title, url)];
      await updateProjectSvc(selectedProject.id, { externalLinks: nextLinks });
      setProjectLinkForm({ title: "", url: "" });
      push({ type: "success", title: "Link adicionado ao projeto" });
    } catch (e: any) {
      push({ type: "error", title: "Erro ao adicionar link", message: e?.message || "" });
    }
  };

  const removeProjectLink = async (linkId: string) => {
    if (!selectedProject || !user || role !== "ADMIN") return;
    const nextLinks = (selectedProject.externalLinks || []).filter((link) => link.id !== linkId);
    try {
      await updateProjectSvc(selectedProject.id, { externalLinks: nextLinks });
      push({ type: "success", title: "Link removido do projeto" });
    } catch (e: any) {
      push({ type: "error", title: "Erro ao remover link", message: e?.message || "" });
    }
  };

  const addDeliveryLink = async () => {
    if (!selectedDelivery || !user || !(role === "ADMIN" || role === "PRESTADOR")) return;
    const title = sanitize(deliveryLinkForm.title);
    const url = sanitize(deliveryLinkForm.url);

    if (!title) return push({ type: "error", title: "Informe o título do link" });
    if (!url || !isValidExternalUrl(url)) {
      return push({ type: "error", title: "URL inválida (use http:// ou https://)" });
    }

    try {
      const nextLinks = [...(selectedDelivery.externalLinks || []), buildExternalLink(title, url)];
      await updateDelivery(selectedDelivery.id, { externalLinks: nextLinks });
      setDeliveryLinkForm({ title: "", url: "" });
      push({ type: "success", title: "Link adicionado à entrega" });
    } catch (e: any) {
      push({ type: "error", title: "Erro ao adicionar link", message: e?.message || "" });
    }
  };

  const removeDeliveryLink = async (linkId: string) => {
    if (!selectedDelivery || !user || role !== "ADMIN") return;
    const nextLinks = (selectedDelivery.externalLinks || []).filter((link) => link.id !== linkId);
    try {
      await updateDelivery(selectedDelivery.id, { externalLinks: nextLinks });
      push({ type: "success", title: "Link removido da entrega" });
    } catch (e: any) {
      push({ type: "error", title: "Erro ao remover link", message: e?.message || "" });
    }
  };

  const addComment = async (deliveryId: string) => {
    if (!profile || !user) return;
    const text = sanitize(commentText);
    if (!text) return;

    try {
      const d = deliveries.find((x) => x.id === deliveryId);
      if (!d) return;

      const next = [
        ...(d.comments || []),
        {
          id: Math.random().toString(36).slice(2),
          authorUid: user.uid,
          authorName: profile.name,
          date: nowPtBr(),
          text,
          createdAt: Date.now(),
        },
      ];

      await updateDelivery(deliveryId, { comments: next as any });
      setCommentText("");
      push({ type: "success", title: "Comentário publicado" });

    } catch (e: any) {
      push({ type: "error", title: "Erro ao publicar comentário", message: e?.message || "" });
    }
  };

  const markNotificationRead = async (notification: AppNotification) => {
    if (notification.read) return;
    try {
      await updateDoc(doc(db, "notifications", notification.id), { read: true });
    } catch (e: any) {
      push({ type: "error", title: "Erro ao marcar notificação", message: e?.message || "" });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, "notifications", notificationId));
    } catch (e: any) {
      push({ type: "error", title: "Erro ao excluir notificação", message: e?.message || "" });
    }
  };

  const notifyAdmins = async (payload: Omit<AppNotification, "id" | "toUid">) => {
    if (!adminUids.length) return;
    await Promise.all(
      adminUids.map((uid) =>
        addDoc(collection(db, "notifications"), {
          ...payload,
          toUid: uid,
        })
      )
    );
  };

  // ---------- Status transitions ----------
  const startDelivery = async (deliveryId: string) => {
    if (!profile || !user || profile.role !== "PRESTADOR") return;

    const d = deliveries.find((x) => x.id === deliveryId);
    if (!d || d.status === "APROVADO" || d.progress === "FAZENDO") return;

    try {
      await updateDelivery(deliveryId, { progress: "FAZENDO" });
      push({ type: "success", title: "Entrega iniciada" });

      await notifyAdmins({
        type: "STARTED",
        title: `Entrega em andamento: ${d.title}`,
        projectId: d.projectId,
        deliveryId: d.id,
        createdAt: Date.now(),
        read: false,
      });
    } catch (e: any) {
      push({ type: "error", title: "Erro ao iniciar entrega", message: e?.message || "" });
    }
  };

  const setDeliveryStatus = async (deliveryId: string, newStatus: Status) => {
    if (!profile || !user) return;
    if (profile.role === "PRESTADOR" && newStatus !== "REVISAO") return;
    if (profile.role === "ADMIN" && newStatus === "REVISAO") return;

    const d = deliveries.find((x) => x.id === deliveryId);
    if (!d) return;

    try {
      const patch: Partial<Delivery> = { status: newStatus };
      if (newStatus === "REVISAO") patch.progress = "REVISAO";
      if (newStatus === "APROVADO") patch.progress = "APROVADO";
      if (newStatus === "AJUSTES") patch.progress = "FAZENDO";
      await updateDelivery(deliveryId, patch);
      push({ type: "success", title: "Status atualizado", message: newStatus });

      if (profile.role === "ADMIN" && newStatus === "AJUSTES" && d.providerUid) {
        await addDoc(collection(db, "notifications"), {
          toUid: d.providerUid,
          type: "ADJUST_REQUESTED",
          title: `Ajustes solicitados: ${d.title}`,
          projectId: d.projectId,
          deliveryId: d.id,
          createdAt: Date.now(),
          read: false,
        });
      }

      if (profile.role === "ADMIN" && newStatus === "APROVADO" && d.providerUid) {
        await addDoc(collection(db, "notifications"), {
          toUid: d.providerUid,
          type: "APPROVED",
          title: `Entrega aprovada: ${d.title}`,
          projectId: d.projectId,
          deliveryId: d.id,
          createdAt: Date.now(),
          read: false,
        });
      }

      if (profile.role === "PRESTADOR" && newStatus === "REVISAO") {
        await notifyAdmins({
          type: "SUBMITTED",
          title: `Entrega enviada para revisão: ${d.title}`,
          projectId: d.projectId,
          deliveryId: d.id,
          createdAt: Date.now(),
          read: false,
        });
      }
    } catch (e: any) {
      push({ type: "error", title: "Erro ao atualizar status", message: e?.message || "" });
    }
  };

  const submitDeadlineChangeRequest = async (deliveryId: string) => {
    if (!profile || !user || profile.role !== "PRESTADOR") return;

    const d = deliveries.find((x) => x.id === deliveryId);
    if (!d) return;

    const requestedDeadline = deadlineRequestForm.requestedDeadline;
    const reason = sanitize(deadlineRequestForm.reason);

    if (!requestedDeadline || !isValidDateISO(requestedDeadline)) {
      push({ type: "error", title: "Informe um prazo válido" });
      return;
    }
    if (!reason) {
      push({ type: "error", title: "Informe o motivo da alteração" });
      return;
    }

    try {
      await updateDelivery(deliveryId, {
        deadlineChangeRequest: {
          requestedDeadline,
          reason,
          requestedAt: Date.now(),
          requestedByUid: user.uid,
          status: "PENDING",
        },
      });

      await notifyAdmins({
        type: "DEADLINE_CHANGE_REQUESTED",
        title: `Solicitação de prazo: ${d.title}`,
        projectId: d.projectId,
        deliveryId: d.id,
        createdAt: Date.now(),
        read: false,
      });

      setDeadlineRequestForm({ requestedDeadline: "", reason: "" });
      push({ type: "success", title: "Solicitação enviada" });
    } catch (e: any) {
      push({ type: "error", title: "Erro ao solicitar alteração", message: e?.message || "" });
    }
  };

  const decideDeadlineChangeRequest = async (deliveryId: string, decision: "APPROVED" | "REJECTED") => {
    if (!profile || !user || profile.role !== "ADMIN") return;

    const d = deliveries.find((x) => x.id === deliveryId);
    const request = d?.deadlineChangeRequest;
    if (!d || !request || request.status !== "PENDING") return;

    const adminNote = sanitize(deadlineDecisionNote);
    const patch: Partial<Delivery> = {
      deadlineChangeRequest: {
        ...request,
        status: decision,
        decidedAt: Date.now(),
        decidedByUid: user.uid,
        adminNote: adminNote || "",
      },
    };

    if (decision === "APPROVED") {
      patch.deadline = request.requestedDeadline;
    }

    try {
      await updateDelivery(deliveryId, patch);

      if (d.providerUid) {
        await addDoc(collection(db, "notifications"), {
          toUid: d.providerUid,
          type: decision === "APPROVED" ? "DEADLINE_CHANGE_APPROVED" : "DEADLINE_CHANGE_REJECTED",
          title:
            decision === "APPROVED"
              ? `Prazo aprovado: ${d.title}`
              : `Prazo rejeitado: ${d.title}`,
          projectId: d.projectId,
          deliveryId: d.id,
          createdAt: Date.now(),
          read: false,
        });
      }

      setDeadlineDecisionNote("");
      push({
        type: "success",
        title: decision === "APPROVED" ? "Prazo aprovado" : "Solicitação rejeitada",
      });
    } catch (e: any) {
      push({ type: "error", title: "Erro ao decidir solicitação", message: e?.message || "" });
    }
  };

  const markAllNotificationsRead = async () => {
    if (!user) return;
    try {
      const unread = notifications.filter((n) => !n.read);
      await Promise.all(unread.map((n) => updateDoc(doc(db, "notifications", n.id), { read: true })));
      push({ type: "success", title: "Notificações marcadas como lidas" });
    } catch (e: any) {
      push({ type: "error", title: "Erro ao marcar notificações", message: e?.message || "" });
    }
  };

  // ---------- Safety docs ----------
  const openProvider = (uid: string) => {
    setSelectedProviderUid(uid);
    setSafetyDocForm({ title: "", issuedAt: "", expiresAt: "", externalUrl: "", notes: "" });
  };

  const saveSafetyDoc = async () => {
    if (!profile || !selectedProviderUid) return;
    const title = sanitize(safetyDocForm.title);
    const issuedAt = safetyDocForm.issuedAt;

    if (!title) return push({ type: "error", title: "Informe o título do registro" });
    if (!issuedAt || !isValidDateISO(issuedAt)) return push({ type: "error", title: "Informe a data de emissão válida" });
    if (safetyDocForm.expiresAt && !isValidDateISO(safetyDocForm.expiresAt)) {
      return push({ type: "error", title: "Data de validade inválida" });
    }

    try {
      await addProviderSafetyDoc(selectedProviderUid, {
        title,
        issuedAt,
        expiresAt: safetyDocForm.expiresAt || "",
        externalUrl: sanitize(safetyDocForm.externalUrl),
        notes: sanitize(safetyDocForm.notes),
        createdAt: Date.now(),
        createdByUid: profile.uid,
        createdByName: profile.name,
      });
      push({ type: "success", title: "Registro adicionado" });
      setSafetyDocForm({ title: "", issuedAt: "", expiresAt: "", externalUrl: "", notes: "" });
    } catch (e: any) {
      push({ type: "error", title: "Erro ao salvar registro", message: e?.message || "" });
    }
  };

  const removeSafetyDoc = async (docId: string) => {
    if (!selectedProviderUid) return;
    if (!confirm("Excluir este registro?")) return;
    try {
      await deleteProviderSafetyDoc(selectedProviderUid, docId);
      push({ type: "success", title: "Registro removido" });
    } catch (e: any) {
      push({ type: "error", title: "Erro ao remover registro", message: e?.message || "" });
    }
  };

  // ---------- Guards ----------
  if (!authReady) return null;

  // ---------- LOGIN ----------
  if (!user && view === "LOGIN") {
    return (
      <>
        <Toasts toasts={toasts} onClose={onCloseToast} />
        <div className="min-h-screen flex items-center justify-center bg-[#D6DCE5] p-6 relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#75AD4D] opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#1895BD] opacity-10 rounded-full blur-3xl"></div>

          <Card className="max-w-xl w-full py-16 px-12 z-10">
            <div className="mb-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 rotate-3 shadow-xl border border-gray-100">
                <Logo size={72} />
              </div>
              <h1 className="text-[#1895BD] uppercase tracking-tighter mb-4">Portal FMEA</h1>
              <p className="text-gray-500 max-w-md mx-auto text-lg leading-relaxed">
                Faça login para acessar. Se for primeiro acesso, ficará pendente de aprovação.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">E-mail</p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none transition-all shadow-inner"
                  placeholder="email"
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Senha</p>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none transition-all shadow-inner"
                  placeholder="senha"
                />
              </div>

              {authError ? (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-sm font-bold">
                  {authError}
                </div>
              ) : null}

              <Button className="w-full" onClick={doLogin} disabled={authLoading || !email || !senha}>
                {authLoading ? "Entrando..." : "Entrar"}
              </Button>

              <Button className="w-full" variant="outline" onClick={doGoogle} disabled={authLoading}>
                Entrar com Google
              </Button>

              <button
                className="w-full text-center text-sm font-black text-[#1895BD] uppercase tracking-widest mt-4"
                onClick={() => {
                  setAuthError(null);
                  setView("SIGNUP");
                }}
              >
                Criar conta
              </button>

              <button
                className="w-full text-center text-sm text-gray-500 hover:text-[#1895BD] mt-2 transition-colors"
                onClick={() => {
                  console.log("Abrindo modal de reset password");
                  setResetPasswordModalOpen(true);
                }}
              >
                Esqueci minha senha
              </button>
            </div>
          </Card>
        </div>

        {/* Modal Reset Password - FORA do Card de Login */}
        <Modal open={resetPasswordModalOpen} title="Recuperar Senha" onClose={() => setResetPasswordModalOpen(false)}>
          <div className="space-y-5">
            <p className="text-gray-600">
              Digite seu email cadastrado. Você receberá um link para criar uma nova senha.
            </p>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">E-mail</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner"
                placeholder="seu@email.com"
              />
            </div>

            {authError ? (
              <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-sm font-bold">
                {authError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setResetPasswordModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={doResetPassword} disabled={authLoading || !email}>
                {authLoading ? "Enviando..." : "Enviar email"}
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  // ---------- SIGNUP ----------
  if (!user && view === "SIGNUP") {
    return (
      <>
        <Toasts toasts={toasts} onClose={onCloseToast} />
        <div className="min-h-screen flex items-center justify-center bg-[#D6DCE5] p-6 relative overflow-hidden">
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#75AD4D] opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#1895BD] opacity-10 rounded-full blur-3xl"></div>

          <Card className="max-w-xl w-full py-16 px-12 z-10">
            <div className="mb-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-6 rotate-3 shadow-xl border border-gray-100">
                <Logo size={72} />
              </div>
              <h1 className="text-[#1895BD] uppercase tracking-tighter mb-4">Criar Conta</h1>
              <p className="text-gray-500 max-w-md mx-auto text-lg leading-relaxed">
                Após o cadastro, o acesso fica pendente de aprovação do administrador.
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Nome</p>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none transition-all shadow-inner"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">E-mail</p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none transition-all shadow-inner"
                  placeholder="email"
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Senha</p>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none transition-all shadow-inner"
                  placeholder="mínimo 6 caracteres"
                />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Chave Pix (opcional)</p>
                <input
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none transition-all shadow-inner"
                  placeholder="CPF, e-mail, telefone, aleatória..."
                />
              </div>

              {authError ? (
                <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-sm font-bold">
                  {authError}
                </div>
              ) : null}

              <Button className="w-full" onClick={doSignup} disabled={authLoading || !email || !senha || !nome}>
                {authLoading ? "Criando..." : "Criar conta"}
              </Button>

              <Button className="w-full" variant="outline" onClick={doGoogle} disabled={authLoading}>
                Criar/Entrar com Google
              </Button>

              <button
                className="w-full text-center text-sm font-black text-[#1895BD] uppercase tracking-widest mt-4"
                onClick={() => {
                  setAuthError(null);
                  setView("LOGIN");
                }}
              >
                Voltar para login
              </button>
            </div>
          </Card>
        </div>

        {/* Modal Reset Password */}
        <Modal open={resetPasswordModalOpen} title="Recuperar Senha" onClose={() => setResetPasswordModalOpen(false)}>
          <div className="space-y-5">
            <p className="text-gray-600">
              Digite seu email cadastrado. Você receberá um link para criar uma nova senha.
            </p>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">E-mail</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner"
                placeholder="seu@email.com"
              />
            </div>

            {authError ? (
              <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-sm font-bold">
                {authError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setResetPasswordModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={doResetPassword} disabled={authLoading || !email}>
                {authLoading ? "Enviando..." : "Enviar email"}
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  // ---------- PENDING ----------
  if (user && profile && (!profile.active || profile.status !== "ACTIVE")) {
    return (
      <>
        <Toasts toasts={toasts} onClose={onCloseToast} />
        <div className="min-h-screen flex items-center justify-center bg-[#D6DCE5] p-6">
          <Card className="max-w-xl w-full text-center py-16 px-12">
            <div className="mb-8">
              <div className="w-20 h-20 bg-white rounded-3xl mx-auto flex items-center justify-center mb-6 border border-gray-100 shadow-sm">
                <Logo size={56} />
              </div>
              <h1 className="text-[#1895BD] uppercase tracking-tighter mb-4">Acesso pendente</h1>
              <p className="text-gray-500 text-lg leading-relaxed">
                A conta foi criada, mas ainda não foi aprovada por um administrador.
              </p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-6 text-left">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Conta</p>
              <p className="font-black text-gray-800">{profile.name}</p>
              <p className="text-sm text-gray-500">{profile.email}</p>
              <p className="text-xs text-gray-400 mt-3">
                Status: <span className="font-black">{profile.status}</span>
              </p>
            </div>

            <div className="mt-10">
              <Button variant="outline" onClick={doLogout} className="w-full">
                Sair
              </Button>
            </div>
          </Card>
        </div>
      </>
    );
  }

  if (!user || !profile || !role) return null;

  // ---------- App shell ----------
  const onNav = (v: ViewState) => {
    setView(v);
    if (v !== "DETALHE_ENTREGA") setSelectedDeliveryId(null);
    if (v !== "DETALHE_PROJETO") setSelectedProjectId(null);
  };

  // ---------- Views ----------
  return (
    <>
      <Toasts toasts={toasts} onClose={onCloseToast} />

      <div className="flex flex-col md:flex-row min-h-screen bg-[#F8FAFC]">
        <Sidebar role={role} userName={userDisplayName} view={view} unread={unreadNotifCount} onNav={onNav} onLogout={doLogout} />

        {/* Modal Reset Password */}
        <Modal open={resetPasswordModalOpen} title="Recuperar Senha" onClose={() => setResetPasswordModalOpen(false)}>
          <div className="space-y-5">
            <p className="text-gray-600">
              Digite seu email cadastrado. Você receberá um link para criar uma nova senha.
            </p>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">E-mail</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner"
                placeholder="seu@email.com"
              />
            </div>

            {authError ? (
              <div className="bg-red-50 border border-red-100 text-red-600 rounded-2xl p-4 text-sm font-bold">
                {authError}
              </div>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setResetPasswordModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={doResetPassword} disabled={authLoading || !email}>
                {authLoading ? "Enviando..." : "Enviar email"}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Modal Criar Projeto */}
        <Modal open={projectModalOpen} title="Criar Projeto" onClose={() => setProjectModalOpen(false)}>
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Empresa</p>
              <select
                value={projectForm.companyId}
                onChange={(e) => setProjectForm((p) => ({ ...p, companyId: e.target.value }))}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner"
              >
                <option value="">Selecione uma empresa</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {companies.length === 0 ? (
                <p className="text-[10px] text-gray-400 mt-2">
                  Cadastre uma empresa antes de criar projetos.
                </p>
              ) : null}
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Nome do projeto</p>
              <input
                value={projectForm.name}
                onChange={(e) => setProjectForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner"
                placeholder="Ex: Inspeção Guindaste X"
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Descrição (opcional)</p>
              <textarea
                value={projectForm.description}
                onChange={(e) => setProjectForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner min-h-[100px]"
                placeholder="Descreva o escopo e objetivos do projeto..."
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Membros do projeto</p>
              <select
                multiple
                value={projectForm.memberUids}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const selected = Array.from(e.currentTarget.selectedOptions).map(
                    (opt: HTMLOptionElement) => opt.value
                  );
                  setProjectForm((p) => ({ ...p, memberUids: selected }));
                }}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-[#1895BD] outline-none shadow-inner min-h-[120px]"
              >
                {usersList
                  .filter((u) => u.role === "PRESTADOR" && u.active && u.status === "ACTIVE")
                  .map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name}
                    </option>
                  ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-2">
                Dica: segure CTRL (Windows) ou CMD (Mac) para selecionar mais de um.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setProjectModalOpen(false)}>Cancelar</Button>
              <Button onClick={saveProject}>Salvar</Button>
            </div>
          </div>
        </Modal>

        {/* Modal Editar Projeto */}
        <Modal open={projectEditModalOpen} title="Editar Projeto" onClose={() => setProjectEditModalOpen(false)}>
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Empresa</p>
              <select
                value={projectEditForm.companyId}
                onChange={(e) => setProjectEditForm((p) => ({ ...p, companyId: e.target.value }))}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner"
              >
                <option value="">Selecione uma empresa</option>
                {projectEditForm.companyId && !companies.find((c) => c.id === projectEditForm.companyId) ? (
                  <option value={projectEditForm.companyId}>
                    {projectEditForm.companyName || "Empresa removida"}
                  </option>
                ) : null}
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Projeto</p>
              <input
                value={projectEditForm.name}
                onChange={(e) => setProjectEditForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner"
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Descrição</p>
              <textarea
                value={projectEditForm.description}
                onChange={(e) => setProjectEditForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner min-h-[100px]"
                placeholder="Descreva o escopo e objetivos do projeto..."
              />
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Membros do projeto</p>
              <select
                multiple
                value={projectEditForm.memberUids}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const selected = Array.from(e.currentTarget.selectedOptions).map(
                    (opt: HTMLOptionElement) => opt.value
                  );
                  setProjectEditForm((p) => ({ ...p, memberUids: selected }));
                }}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner min-h-[120px]"
              >                 
                {usersList
                  .filter((u) => u.role === "PRESTADOR" && u.active && u.status === "ACTIVE")
                  .map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name}
                    </option>
                  ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-2">
                Selecione os membros que você deseja manter. Desmarque para remover.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setProjectEditModalOpen(false)}>Cancelar</Button>
              <Button onClick={saveProjectEdits}>Salvar Alterações</Button>
            </div>
          </div>
        </Modal>

        <Modal open={deliveryModalOpen} title="Solicitar Entrega" onClose={() => setDeliveryModalOpen(false)}>
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Projeto</p>
              <select
                value={deliveryForm.projectId}
                onChange={(e) => {
                  setDeliveryForm((d) => ({ ...d, projectId: e.target.value, providerUid: "", providerName: "" }));
                }}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner"
              >
                <option value="">Selecione</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.companyName} - {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Título</p>
              <input
                value={deliveryForm.title}
                onChange={(e) => setDeliveryForm((d) => ({ ...d, title: e.target.value }))}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner"
                placeholder="Ex: Relatório final..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Prazo</p>
                <input
                  type="date"
                  value={deliveryForm.deadline}
                  onChange={(e) => setDeliveryForm((d) => ({ ...d, deadline: e.target.value }))}
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner"
                />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Prioridade</p>
                <select
                  value={deliveryForm.priority}
                  onChange={(e) => setDeliveryForm((d) => ({ ...d, priority: e.target.value as Priority }))}
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner"
                >
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                </select>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                Prestador (somente membros do projeto)
              </p>
              <select
                value={deliveryForm.providerUid}
                onChange={(e) => {
                  const uid = e.target.value;
                  const u = usersList.find((x) => x.uid === uid) || null;
                  setDeliveryForm((d) => ({ ...d, providerUid: uid, providerName: u?.name || "" }));
                }}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner"
                disabled={!deliveryForm.projectId}
              >
                <option value="">Selecione</option>
                {projectMembers.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.name}
                  </option>
                ))}
              </select>

              {!deliveryForm.projectId ? (
                <p className="text-[10px] text-gray-400 mt-2">Selecione um projeto para carregar os membros.</p>
              ) : null}
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Descrição (opcional)</p>
              <textarea
                value={deliveryForm.description}
                onChange={(e) => setDeliveryForm((d) => ({ ...d, description: e.target.value }))}
                className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl text-sm outline-none shadow-inner min-h-[120px]"
                placeholder="Escopo e observações..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDeliveryModalOpen(false)}>Cancelar</Button>
              <Button onClick={saveDelivery}>Salvar</Button>
            </div>
          </div>
        </Modal>

        {/* Main */}
        <main className="flex-1 md:ml-80 p-8 md:p-16">
          <div className="max-w-6xl mx-auto space-y-10">

            {/* DASHBOARD */}
            {view === "DASHBOARD" && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-[#1895BD] mb-2">Resumo</h1>
                    <p className="text-gray-400">Visão geral e notificações.</p>
                  </div>
                  <div className="flex gap-3">
                    {role === "ADMIN" && (
                      <>
                        <Button variant="outline" onClick={markAllNotificationsRead} disabled={unreadNotifCount === 0}>
                          Marcar notificações como lidas
                        </Button>
                        <Button variant="secondary" onClick={() => setProjectModalOpen(true)}>
                          + Novo projeto
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                      Entregas Pendentes
                    </p>
                    <p className="text-4xl font-black text-[#1895BD]">
                      {deliveries.filter(d => d.status === "PENDENTE").length}
                    </p>
                  </Card>

                  <Card>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                      Em Revisão
                    </p>
                    <p className="text-4xl font-black text-[#75AD4D]">
                      {deliveries.filter(d => d.status === "REVISAO").length}
                    </p>
                  </Card>

                  <Card>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                      Atrasadas
                    </p>
                    <p className="text-4xl font-black text-red-500">
                      {deliveries.filter(d => d.status === "ATRASADO").length}
                    </p>
                  </Card>

                  <Card>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                      {role === "ADMIN" ? "Usuários Pendentes" : "Projetos Ativos"}
                    </p>
                    <p className="text-4xl font-black text-orange-500">
                      {role === "ADMIN" 
                        ? usersList.filter(u => u.status === "PENDING").length
                        : projects.length}
                    </p>
                  </Card>
                </div>

                <Card>
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl text-gray-800">Notificações</h3>
                      {unreadNotifCount > 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-50 text-[#1895BD]">
                          {unreadNotifCount} nova(s)
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {notifications.slice(0, 15).map((n) => (
                      <div key={n.id} className="p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${n.read ? "bg-gray-100 text-gray-500" : "bg-blue-50 text-[#1895BD]"}`}>
                          {n.type === "COMMENT"
                            ? "💬"
                            : n.type === "SUBMITTED"
                            ? "📤"
                            : n.type === "APPROVED"
                            ? "✅"
                            : n.type === "MEETING"
                            ? "📅"
                            : n.type === "NEW_DELIVERY"
                            ? "📦"
                            : n.type === "STARTED"
                            ? "🚀"
                            : n.type === "DEADLINE_CHANGE_REQUESTED"
                            ? "⏰"
                            : n.type === "DEADLINE_CHANGE_APPROVED"
                            ? "✅"
                            : n.type === "DEADLINE_CHANGE_REJECTED"
                            ? "⛔"
                            : "🛠️"}
                        </div>
                        <div className="flex-1">
                          <p className={`font-black ${n.read ? "text-gray-600" : "text-gray-800"}`}>{n.title}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {new Date(n.createdAt).toLocaleString("pt-BR")}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Aba: {getNotificationLocation(n.type)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          {!n.read ? (
                            <button
                              onClick={() => markNotificationRead(n)}
                              className="text-[10px] font-black uppercase tracking-widest text-[#75AD4D] hover:text-[#639441]"
                            >
                              Marcar lida
                            </button>
                          ) : null}
                          <button
                            onClick={() => deleteNotification(n.id)}
                            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 ? <div className="py-10 text-center text-gray-300">Sem notificações.</div> : null}
                  </div>
                </Card>
              </>
            )}

            {/* REUNIOES */}
            {view === "REUNIOES" && (
              <>
                <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white px-8 py-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-200">Reuniões</p>
                  <h1 className="text-3xl font-black mt-2">Reuniões</h1>
                  <p className="text-slate-200 mt-1">Minhas reuniões ativas e histórico.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <Card>
                      <h3 className="text-xl font-black mb-6 text-slate-800">Hoje</h3>
                      <div className="space-y-3">
                        {loadingMeetings ? (
                          <div className="py-6 text-center text-gray-300">Carregando reuniões...</div>
                        ) : (
                          meetingsToday.map((m) => (
                            <div key={m.id} className="p-6 border border-slate-200 rounded-3xl bg-white shadow-sm">
                              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                                <div className="flex flex-col sm:flex-row sm:items-start gap-5 min-w-0">
                                  <div className="rounded-2xl bg-slate-900 text-white px-4 py-3 min-w-[190px]">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
                                      Início
                                    </p>
                                    <p className="text-sm font-black">{formatDateTime(m.startsAt)}</p>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mt-3">
                                      Término
                                    </p>
                                    <p className="text-sm font-black">{formatDateTime(m.endsAt)}</p>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-3">
                                      <p className="text-lg font-black text-slate-900 truncate">{m.title}</p>
                                      <span
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border ${getMeetingStatusClasses(
                                          m.status
                                        )}`}
                                      >
                                        {getMeetingStatusLabel(m.status)}
                                      </span>
                                    </div>
                                    {m.description ? (
                                      <p className="text-sm text-slate-500 mt-2">{m.description}</p>
                                    ) : null}
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-4">
                                      Participantes: {m.participantUids.length}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-start gap-3">
                                  {m.link ? (
                                    <a
                                      className="inline-flex items-center justify-center px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] bg-gradient-to-r from-slate-900 via-blue-900 to-blue-600 text-white shadow-lg shadow-blue-900/20"
                                      href={m.link}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Entrar na reunião
                                    </a>
                                  ) : null}
                                  {role === "ADMIN" ? (
                                    <div className="flex flex-wrap items-center gap-3">
                                      <button
                                        onClick={() => startEditMeeting(m)}
                                        className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-700"
                                      >
                                        Editar
                                      </button>
                                      <button
                                        onClick={() => updateMeetingStatus(m, "DONE")}
                                        className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 hover:text-emerald-700"
                                      >
                                        Concluir
                                      </button>
                                      <button
                                        onClick={() => updateMeetingStatus(m, "CANCELED")}
                                        className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 hover:text-red-600"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        {!loadingMeetings && meetingsToday.length === 0 ? (
                          <div className="py-6 text-center text-gray-300">Nenhuma reunião hoje.</div>
                        ) : null}
                      </div>
                    </Card>

                    <Card>
                      <h3 className="text-xl font-black mb-6 text-slate-800">Próximas reuniões</h3>
                      <div className="space-y-3">
                        {loadingMeetings ? (
                          <div className="py-6 text-center text-gray-300">Carregando reuniões...</div>
                        ) : (
                          meetingsUpcoming.map((m) => (
                            <div key={m.id} className="p-6 border border-slate-200 rounded-3xl bg-white shadow-sm">
                              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                                <div className="flex flex-col sm:flex-row sm:items-start gap-5 min-w-0">
                                  <div className="rounded-2xl bg-slate-900 text-white px-4 py-3 min-w-[190px]">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
                                      Início
                                    </p>
                                    <p className="text-sm font-black">{formatDateTime(m.startsAt)}</p>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mt-3">
                                      Término
                                    </p>
                                    <p className="text-sm font-black">{formatDateTime(m.endsAt)}</p>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-3">
                                      <p className="text-lg font-black text-slate-900 truncate">{m.title}</p>
                                      <span
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border ${getMeetingStatusClasses(
                                          m.status
                                        )}`}
                                      >
                                        {getMeetingStatusLabel(m.status)}
                                      </span>
                                    </div>
                                    {m.description ? (
                                      <p className="text-sm text-slate-500 mt-2">{m.description}</p>
                                    ) : null}
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-4">
                                      Participantes: {m.participantUids.length}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-start gap-3">
                                  {m.link ? (
                                    <a
                                      className="inline-flex items-center justify-center px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] bg-gradient-to-r from-slate-900 via-blue-900 to-blue-600 text-white shadow-lg shadow-blue-900/20"
                                      href={m.link}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Entrar na reunião
                                    </a>
                                  ) : null}
                                  {role === "ADMIN" ? (
                                    <div className="flex flex-wrap items-center gap-3">
                                      <button
                                        onClick={() => startEditMeeting(m)}
                                        className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-700"
                                      >
                                        Editar
                                      </button>
                                      <button
                                        onClick={() => updateMeetingStatus(m, "DONE")}
                                        className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 hover:text-emerald-700"
                                      >
                                        Concluir
                                      </button>
                                      <button
                                        onClick={() => updateMeetingStatus(m, "CANCELED")}
                                        className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 hover:text-red-600"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        {!loadingMeetings && meetingsUpcoming.length === 0 ? (
                          <div className="py-6 text-center text-gray-300">Nenhuma reunião futura.</div>
                        ) : null}
                      </div>
                    </Card>

                    <Card>
                      <h3 className="text-xl font-black mb-6 text-slate-800">Histórico</h3>
                      <div className="space-y-3">
                        {loadingMeetings ? (
                          <div className="py-6 text-center text-gray-300">Carregando reuniões...</div>
                        ) : (
                          meetingsHistory.map((m) => (
                            <div key={m.id} className="p-6 border border-slate-200 rounded-3xl bg-white shadow-sm">
                              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                                <div className="flex flex-col sm:flex-row sm:items-start gap-5 min-w-0">
                                  <div className="rounded-2xl bg-slate-900 text-white px-4 py-3 min-w-[190px]">
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
                                      Início
                                    </p>
                                    <p className="text-sm font-black">{formatDateTime(m.startsAt)}</p>
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mt-3">
                                      Término
                                    </p>
                                    <p className="text-sm font-black">{formatDateTime(m.endsAt)}</p>
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-3">
                                      <p className="text-lg font-black text-slate-900 truncate">{m.title}</p>
                                      <span
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border ${getMeetingStatusClasses(
                                          m.status
                                        )}`}
                                      >
                                        {getMeetingStatusLabel(m.status)}
                                      </span>
                                    </div>
                                    {m.description ? (
                                      <p className="text-sm text-slate-500 mt-2">{m.description}</p>
                                    ) : null}
                                    {m.status === "DONE" && m.completedAt ? (
                                      <p className="text-xs text-slate-400 mt-3">
                                        Concluída em {formatDateTime(m.completedAt)}
                                      </p>
                                    ) : null}
                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-4">
                                      Participantes: {m.participantUids.length}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-start gap-3">
                                  {m.link ? (
                                    <a
                                      className="inline-flex items-center justify-center px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] bg-gradient-to-r from-slate-900 via-blue-900 to-blue-600 text-white shadow-lg shadow-blue-900/20"
                                      href={m.link}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Abrir reunião
                                    </a>
                                  ) : null}
                                  {role === "ADMIN" && m.status === "SCHEDULED" ? (
                                    <div className="flex flex-wrap items-center gap-3">
                                      <button
                                        onClick={() => startEditMeeting(m)}
                                        className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-700"
                                      >
                                        Editar
                                      </button>
                                      <button
                                        onClick={() => updateMeetingStatus(m, "DONE")}
                                        className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 hover:text-emerald-700"
                                      >
                                        Concluir
                                      </button>
                                      <button
                                        onClick={() => updateMeetingStatus(m, "CANCELED")}
                                        className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500 hover:text-red-600"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        {!loadingMeetings && meetingsHistory.length === 0 ? (
                          <div className="py-6 text-center text-gray-300">Nenhuma reunião no histórico.</div>
                        ) : null}
                      </div>
                    </Card>
                  </div>

                  {role === "ADMIN" ? (
                    <Card className="lg:col-span-1">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-black text-slate-900">{editingMeetingId ? "Editar reunião" : "Criar reunião"}</h3>
                        {editingMeetingId ? (
                          <button
                            onClick={resetMeetingForm}
                            className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-[#1895BD]"
                          >
                            Cancelar edição
                          </button>
                        ) : null}
                      </div>
                      <div className="space-y-6">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Dados</h4>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
                              Título
                            </p>
                            <input
                              value={meetingForm.title}
                              onChange={(e) => setMeetingForm((m) => ({ ...m, title: e.target.value }))}
                              className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-white"
                              placeholder="Reunião de alinhamento"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
                              Descrição (opcional)
                            </p>
                            <textarea
                              value={meetingForm.description}
                              onChange={(e) => setMeetingForm((m) => ({ ...m, description: e.target.value }))}
                              className="w-full px-4 py-3 border border-slate-200 rounded-2xl min-h-[90px] bg-white"
                              placeholder="Resumo da pauta ou objetivo"
                            />
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Horário</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input
                              type="date"
                              value={meetingForm.startDate}
                              onChange={(e) => setMeetingForm((m) => ({ ...m, startDate: e.target.value }))}
                              className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-white"
                            />
                            <select
                              value={meetingForm.startTime}
                              onChange={(e) =>
                                setMeetingForm((m) => ({ ...m, startTime: e.target.value, endTime: "" }))
                              }
                              className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-white"
                            >
                              <option value="">Início</option>
                              {timeOptions.map((time) => (
                                <option key={time} value={time}>
                                  {time}
                                </option>
                              ))}
                            </select>
                            <select
                              value={meetingForm.endTime}
                              onChange={(e) => setMeetingForm((m) => ({ ...m, endTime: e.target.value }))}
                              className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-white"
                              disabled={!meetingForm.startTime}
                            >
                              <option value="">Término</option>
                              {endTimeOptions.map((time) => (
                                <option key={time} value={time}>
                                  {time}
                                </option>
                              ))}
                            </select>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            O término deve ser após o início e sempre no mesmo dia.
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Link</h4>
                          <input
                            value={meetingForm.link}
                            onChange={(e) => setMeetingForm((m) => ({ ...m, link: e.target.value }))}
                            className="w-full px-4 py-3 border border-slate-200 rounded-2xl bg-white"
                            placeholder="https://meet.google.com/..."
                          />
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Participantes</h4>
                          <div className="space-y-2 max-h-64 overflow-auto border border-slate-200 rounded-2xl p-3 bg-white">
                            {meetingParticipants.map((u) => (
                              <label key={u.uid} className="flex items-center gap-3 text-sm text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={meetingForm.participantUids.includes(u.uid)}
                                  onChange={() => toggleMeetingParticipant(u.uid)}
                                  className="h-4 w-4"
                                />
                                <span className="font-bold">{u.name}</span>
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                  {u.role}
                                </span>
                              </label>
                            ))}
                            {meetingParticipants.length === 0 ? (
                              <div className="py-6 text-center text-slate-300">Sem usuários ativos.</div>
                            ) : null}
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Você será incluído automaticamente.
                          </p>
                        </div>

                        <div className="flex justify-end">
                          <Button onClick={saveMeeting}>{editingMeetingId ? "Salvar alterações" : "Criar reunião"}</Button>
                        </div>
                      </div>
                    </Card>
                  ) : null}
                </div>
              </>
            )}

            {/* USUARIOS */}
            {view === "USUARIOS" && role === "ADMIN" && (
              <>
                <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white px-8 py-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-200">Usuários</p>
                  <h1 className="text-3xl font-black mt-2">Usuários</h1>
                  <p className="text-slate-200 mt-1">Aprovação e gestão.</p>
                </div>

                <Card>
                  <h3 className="text-xl font-black mb-6 text-slate-800">Pendentes</h3>
                  <div className="space-y-4">
                    {usersPaged.sliced.filter((u) => u.status === "PENDING").map((u) => (
                      <div key={u.uid} className="p-6 border border-slate-200 rounded-3xl bg-white shadow-sm flex flex-col lg:flex-row lg:items-center gap-6">
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-black text-slate-900">{u.name}</p>
                          <p className="text-sm text-slate-500">{u.email}</p>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-3">
                            UID: {u.uid}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" className="px-4 py-2" onClick={() => openUserProfile(u)}>
                            Ver perfil
                          </Button>
                          <Button variant="secondary" className="px-4 py-2" onClick={() => approveUser(u, "PRESTADOR")}>
                            Aprovar Prestador
                          </Button>
                          <Button variant="primary" className="px-4 py-2" onClick={() => approveUser(u, "ADMIN")}>
                            Aprovar Admin
                          </Button>
                          <Button variant="danger" className="px-4 py-2" onClick={() => rejectUser(u)}>
                            Rejeitar
                          </Button>
                          <Button variant="outline" className="px-4 py-2" onClick={() => removeUser(u)}>
                            Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                    {usersList.filter((u) => u.status === "PENDING").length === 0 ? (
                      <div className="py-10 text-center text-gray-300">Sem usuários pendentes.</div>
                    ) : null}

                    {usersPaged.canLoadMore ? (
                      <div className="pt-4 flex justify-center">
                        <Button variant="outline" onClick={usersPaged.loadMore}>Carregar mais</Button>
                      </div>
                    ) : null}
                  </div>
                </Card>

                <Card className="mt-8">
                  <h3 className="text-xl font-black mb-6 text-slate-800">Ativos</h3>
                  <div className="space-y-3">
                    {usersList.filter((u) => u.status === "ACTIVE").slice(0, 50).map((u) => (
                      <div key={u.uid} className="p-5 border border-slate-200 rounded-3xl bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <p className="text-base font-black text-slate-900">{u.name}</p>
                          <p className="text-sm text-slate-500">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{u.role}</span>
                          <Button variant="outline" className="px-4 py-2" onClick={() => openUserProfile(u)}>
                            Ver perfil
                          </Button>
                          <Button variant="outline" className="px-4 py-2" onClick={() => removeUser(u)}>
                            Remover
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Modal open={!!selectedUserProfile} title="Perfil do usuário" onClose={closeUserProfile}>
                  {selectedUserProfile ? (
                    <div className="space-y-5">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Nome</p>
                        <p className="text-lg font-black text-slate-900 mt-2">{selectedUserProfile.name}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Email</p>
                        <p className="text-sm font-bold text-slate-700 mt-2">{selectedUserProfile.email}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Chave Pix</p>
                        <p className="text-sm font-bold text-slate-700 mt-2">
                          {selectedUserProfile.pixKey || "Não informado"}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </Modal>
              </>
            )}

            {/* PRESTADORES */}
            {view === "PRESTADORES" && role === "ADMIN" && (
              <>
                <div>
                  <h1 className="text-[#1895BD]">Prestadores</h1>
                  <p className="text-gray-400">Cadastro e documentação de segurança (sem upload por enquanto).</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <Card className="lg:col-span-1">
                    <h3 className="text-xl mb-4">Lista</h3>
                    <div className="space-y-2 max-h-[520px] overflow-auto pr-2">
                      {usersList
                        .filter((u) => u.role === "PRESTADOR" && u.status === "ACTIVE")
                        .map((u) => (
                          <button
                            key={u.uid}
                            onClick={() => openProvider(u.uid)}
                            className={`w-full text-left p-4 rounded-2xl border transition ${
                              selectedProviderUid === u.uid ? "border-[#1895BD] bg-blue-50" : "border-gray-100 hover:bg-gray-50"
                            }`}
                          >
                            <p className="font-black text-gray-800">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </button>
                        ))}
                      {usersList.filter((u) => u.role === "PRESTADOR" && u.status === "ACTIVE").length === 0 ? (
                        <div className="py-10 text-center text-gray-300">Sem prestadores ativos.</div>
                      ) : null}
                    </div>
                  </Card>

                  <Card className="lg:col-span-2">
                    {!selectedProviderUid ? (
                      <div className="py-16 text-center text-gray-300">Selecione um prestador para ver os registros.</div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-6">
                          <div>
                            <h3 className="text-2xl text-gray-800">Registros</h3>
                            <p className="text-gray-500 text-sm">
                              Adicione registros como NR-10, NR-33, NR-35, ASO etc. Por enquanto, use link externo.
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 p-6 border border-gray-100 rounded-2xl">
                          <h4 className="font-black text-gray-700 mb-4">Adicionar registro</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                              value={safetyDocForm.title}
                              onChange={(e) => setSafetyDocForm((s) => ({ ...s, title: e.target.value }))}
                              className="px-4 py-3 border border-gray-100 rounded-xl"
                              placeholder="Título (ex: NR-35)"
                            />
                            <input
                              type="date"
                              value={safetyDocForm.issuedAt}
                              onChange={(e) => setSafetyDocForm((s) => ({ ...s, issuedAt: e.target.value }))}
                              className="px-4 py-3 border border-gray-100 rounded-xl"
                              placeholder="Emissão"
                            />
                            <input
                              type="date"
                              value={safetyDocForm.expiresAt}
                              onChange={(e) => setSafetyDocForm((s) => ({ ...s, expiresAt: e.target.value }))}
                              className="px-4 py-3 border border-gray-100 rounded-xl"
                              placeholder="Validade (opcional)"
                            />
                            <input
                              value={safetyDocForm.externalUrl}
                              onChange={(e) => setSafetyDocForm((s) => ({ ...s, externalUrl: e.target.value }))}
                              className="px-4 py-3 border border-gray-100 rounded-xl"
                              placeholder="Link externo (Drive/OneDrive)"
                            />
                            <textarea
                              value={safetyDocForm.notes}
                              onChange={(e) => setSafetyDocForm((s) => ({ ...s, notes: e.target.value }))}
                              className="px-4 py-3 border border-gray-100 rounded-xl md:col-span-2"
                              placeholder="Observações (opcional)"
                            />
                          </div>

                          <div className="mt-4 flex justify-end">
                            <Button onClick={saveSafetyDoc}>Salvar registro</Button>
                          </div>
                        </div>

                        <div className="mt-8 space-y-3">
                          {providerDocs.map((d) => (
                            <div key={d.id} className="p-5 border border-gray-100 rounded-2xl flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-black text-gray-800">{d.title}</p>
                                <p className="text-sm text-gray-600">Emissão: {d.issuedAt}</p>
                                {d.expiresAt ? <p className="text-sm text-gray-600">Validade: {d.expiresAt}</p> : null}
                                {d.externalUrl ? (
                                  <a className="text-sm text-[#1895BD] font-black hover:underline" href={d.externalUrl} target="_blank" rel="noreferrer">
                                    Abrir link
                                  </a>
                                ) : null}
                                {d.notes ? <p className="text-sm text-gray-500 mt-2">{d.notes}</p> : null}
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" onClick={() => removeSafetyDoc(d.id)}>Excluir</Button>
                              </div>
                            </div>
                          ))}
                          {providerDocs.length === 0 ? (
                            <div className="py-10 text-center text-gray-300">Nenhum registro ainda.</div>
                          ) : null}
                        </div>
                      </>
                    )}
                  </Card>
                </div>
              </>
            )}

            {/* EMPRESAS */}
            {view === "EMPRESAS" && role === "ADMIN" && (
              <CompaniesPage
                companies={companies}
                projects={projects}
                currentUserUid={profile.uid}
                loading={loadingCompanies}
                onOpenProject={(projectId) => {
                  setSelectedProjectId(projectId);
                  setView("DETALHE_PROJETO");
                }}
                pushToast={push}
              />
            )}

            {/* PROJETOS */}
            {view === "PROJETOS" && (
              <>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white px-8 py-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-200">Projetos</p>
                    <h1 className="text-3xl font-black mt-2">Projetos</h1>
                    <p className="text-slate-200 mt-1">Cadastro e acompanhamento.</p>
                  </div>
                  {role === "ADMIN" ? (
                    <Button variant="primary" onClick={openCreateProject}>+ Novo Projeto</Button>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
                  {projectsPaged.sliced.map((p) => (
                    <Card
                      key={p.id}
                      onClick={() => {
                        setSelectedProjectId(p.id);
                        setView("DETALHE_PROJETO");
                      }}
                      className="bg-gradient-to-br from-white via-white to-slate-50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">
                            {p.companyName}
                          </p>
                          <h3 className="mt-3 text-2xl text-slate-900 font-black truncate">{p.name}</h3>
                          <p className="text-sm text-slate-500 mt-2 line-clamp-2">
                            {p.description || "Sem descrição cadastrada."}
                          </p>
                        </div>
                        <Badge type="status" value={p.status.replace("_", " ")} />
                      </div>

                      <div className="mt-6 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3">
                        <div className="h-12 w-12 rounded-2xl border border-slate-200 bg-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center justify-center">
                          Logo
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Empresa</p>
                          <p className="text-sm font-bold text-slate-700 truncate">{p.companyName}</p>
                        </div>
                      </div>

                      <div className="mt-8 pt-5 border-t border-slate-200 flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Gestor</p>
                            <p className="text-sm font-bold text-slate-700 truncate">{p.manager}</p>
                          </div>
                          {role === "ADMIN" ? (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                className="px-4 py-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditProject(p);
                                }}
                              >
                                Editar
                              </Button>
                              <Button
                                variant="danger"
                                className="px-4 py-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteProject(p);
                                }}
                              >
                                Excluir
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {projectsPaged.canLoadMore ? (
                  <div className="flex justify-center pt-4">
                    <Button variant="outline" onClick={projectsPaged.loadMore}>Carregar mais</Button>
                  </div>
                ) : null}
              </>
            )}

            {/* DETALHE PROJETO */}
            {view === "DETALHE_PROJETO" && selectedProject && (
              <>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white px-8 py-6">
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setView("PROJETOS")}
                      className="text-xs font-black uppercase tracking-[0.4em] text-slate-200 hover:text-white text-left"
                    >
                      ← Projetos
                    </button>
                    <h1 className="text-3xl font-black">{selectedProject.name}</h1>
                  </div>

                  {role === "ADMIN" ? (
                    <div className="flex gap-3 flex-wrap">
                      <Button variant="outline" onClick={() => openEditProject(selectedProject)}>
                        Editar projeto
                      </Button>
                      <Button variant="primary" onClick={() => openCreateDelivery(selectedProject.id)}>
                        + Solicitar entrega
                      </Button>
                    </div>
                  ) : null}
                </div>

                {/* Descrição do Projeto */}
                {selectedProject.description && (
                  <Card>
                    <h3 className="text-xl mb-3">Descrição do Projeto</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedProject.description}</p>
                  </Card>
                )}

                {/* Informações do Projeto */}
                <Card>
                  <h3 className="text-xl mb-4">Informações</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Empresa</p>
                      <p className="font-bold text-gray-800">{selectedProject.companyName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Gestor</p>
                      <p className="font-bold text-gray-800">{selectedProject.manager}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Status</p>
                      <p className="font-bold text-gray-800">{selectedProject.status.replace("_", " ")}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Membros</p>
                      <p className="font-bold text-gray-800">{selectedProject.memberUids.length} prestador(es)</p>
                    </div>
                  </div>
                </Card>

                <Card>
                  <h3 className="text-xl mb-4">Links</h3>
                  <div className="space-y-3">
                    {(selectedProject.externalLinks || []).map((link) => (
                      <div key={link.id} className="p-4 border border-gray-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 truncate">{link.title}</p>
                          <p className="text-xs text-gray-400 truncate">{link.url}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a
                            className="text-xs font-black uppercase tracking-widest text-[#1895BD] hover:underline"
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir
                          </a>
                          {role === "ADMIN" ? (
                            <Button variant="outline" onClick={() => removeProjectLink(link.id)}>Remover</Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                    {(selectedProject.externalLinks || []).length === 0 ? (
                      <div className="py-6 text-center text-gray-300">Nenhum link adicionado.</div>
                    ) : null}
                  </div>

                  {role === "ADMIN" ? (
                    <div className="mt-6 p-5 border border-gray-100 rounded-2xl">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Adicionar link</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          value={projectLinkForm.title}
                          onChange={(e) => setProjectLinkForm((f) => ({ ...f, title: e.target.value }))}
                          className="px-4 py-3 border border-gray-100 rounded-xl"
                          placeholder="Título"
                        />
                        <input
                          value={projectLinkForm.url}
                          onChange={(e) => setProjectLinkForm((f) => ({ ...f, url: e.target.value }))}
                          className="px-4 py-3 border border-gray-100 rounded-xl"
                          placeholder="https://..."
                        />
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button onClick={addProjectLink}>Adicionar link</Button>
                      </div>
                    </div>
                  ) : null}
                </Card>

                <Card>
                  <h3 className="text-xl mb-4">Entregas do projeto</h3>
                  <div className="space-y-3">
                    {deliveries
                      .filter((d) => d.projectId === selectedProject.id)
                      .map((d) => (
                        <div
                          key={d.id}
                          onClick={() => { setSelectedDeliveryId(d.id); setView("DETALHE_ENTREGA"); }}
                          className="p-5 border border-gray-100 rounded-2xl hover:bg-gray-50 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div>
                            <p className="font-black text-gray-800">{d.title}</p>
                            <p className="text-xs text-gray-500">Prestador: {d.provider}</p>
                            <p className="text-xs text-gray-500">Prazo: {d.deadline}</p>
                          </div>
                          <div className="flex gap-3 items-center">
                            <Badge type="priority" value={d.priority} />
                            <Badge type="status" value={d.status} />
                            {role === "ADMIN" ? (
                              <Button variant="danger" onClick={(e) => { e.stopPropagation(); removeDelivery(d); }}>
                                Excluir
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    {deliveries.filter((d) => d.projectId === selectedProject.id).length === 0 ? (
                      <div className="py-10 text-center text-gray-300">Nenhuma entrega ainda.</div>
                    ) : null}
                  </div>
                </Card>
              </>
            )}

            {/* ENTREGAS */}
            {view === "ENTREGAS" && (
              <>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white px-8 py-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-200">
                      {role === "ADMIN" ? "Entregas" : "Minhas Entregas"}
                    </p>
                    <h1 className="text-3xl font-black mt-2">
                      {role === "ADMIN" ? "Entregas" : "Minhas Entregas"}
                    </h1>
                    <p className="text-slate-200 mt-1">Controle de execução e revisão.</p>
                  </div>
                  {role === "ADMIN" ? (
                    <Button variant="primary" onClick={() => openCreateDelivery()}>
                      + Solicitar entrega
                    </Button>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                  {deliveryColumns.map((column) => (
                    <div
                      key={column.key}
                      className="flex flex-col rounded-3xl border border-slate-200 bg-slate-50/80 max-h-[720px]"
                    >
                      <div className="sticky top-0 z-10 px-5 py-4 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">
                              {column.subtitle}
                            </p>
                            <h3 className="text-lg font-black text-slate-800">{column.title}</h3>
                          </div>
                          <span className="text-xs font-black text-slate-500">
                            {deliveriesByProgress[column.key].length}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                        {deliveriesByProgress[column.key].map((d) => (
                          <div
                            key={d.id}
                            onClick={() => {
                              setSelectedDeliveryId(d.id);
                              setView("DETALHE_ENTREGA");
                            }}
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                  {d.client}
                                </p>
                                <h4 className="mt-2 text-lg font-black text-slate-900 truncate">{d.title}</h4>
                                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-blue-700 mt-2 truncate">
                                  {d.project}
                                </p>
                              </div>
                              <Badge type="priority" value={d.priority} />
                            </div>

                            <div className="mt-4 grid gap-3 text-xs text-slate-500">
                              <div className="flex items-center justify-between">
                                <span className="uppercase tracking-[0.3em] font-black text-[9px]">Prazo</span>
                                <span className="text-sm font-bold text-slate-700">{d.deadline}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="uppercase tracking-[0.3em] font-black text-[9px]">Prestador</span>
                                <span className="text-sm font-bold text-slate-700 truncate max-w-[140px]">
                                  {d.provider || "A definir"}
                                </span>
                              </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3">
                              <Badge type="status" value={d.status} />
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  className="px-3 py-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDeliveryId(d.id);
                                    setView("DETALHE_ENTREGA");
                                  }}
                                >
                                  Abrir
                                </Button>
                                {role === "ADMIN" ? (
                                  <Button
                                    variant="danger"
                                    className="px-3 py-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeDelivery(d);
                                    }}
                                  >
                                    Excluir
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                        {deliveriesByProgress[column.key].length === 0 ? (
                          <div className="py-10 text-center text-slate-300 text-sm">
                            Nenhuma entrega aqui.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                {deliveriesPaged.canLoadMore ? (
                  <div className="flex justify-center pt-4">
                    <Button variant="outline" onClick={deliveriesPaged.loadMore}>Carregar mais</Button>
                  </div>
                ) : null}
              </>
            )}

            {/* DETALHE ENTREGA */}
            {view === "DETALHE_ENTREGA" && selectedDelivery && (
              <>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 text-white px-8 py-6">
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setView("ENTREGAS")}
                      className="text-xs font-black uppercase tracking-[0.4em] text-slate-200 hover:text-white text-left"
                    >
                      ← Voltar
                    </button>
                    <div>
                      <h1 className="text-3xl font-black mb-1">{selectedDelivery.title}</h1>
                      <p className="text-slate-200 font-black uppercase text-xs tracking-[0.4em]">
                        {selectedDelivery.project}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    {role === "PRESTADOR" && selectedDelivery.status !== "APROVADO" ? (
                      <>
                        {selectedDelivery.progress === "A_FAZER" ? (
                          <Button variant="outline" onClick={() => startDelivery(selectedDelivery.id)}>
                            Iniciar entrega
                          </Button>
                        ) : null}
                        <Button
                          variant="primary"
                          disabled={selectedDelivery.status === "REVISAO"}
                          onClick={() => setDeliveryStatus(selectedDelivery.id, "REVISAO")}
                        >
                          {selectedDelivery.status === "REVISAO"
                            ? "Aguardando retorno do gestor"
                            : "Enviar para revisão"}
                        </Button>
                      </>
                    ) : null}

                    {role === "ADMIN" && selectedDelivery.status === "REVISAO" ? (
                      <>
                        <Button variant="primary" onClick={() => setDeliveryStatus(selectedDelivery.id, "APROVADO")}>
                          Aprovar
                        </Button>
                        <Button variant="outline" onClick={() => setDeliveryStatus(selectedDelivery.id, "AJUSTES")}>
                          Pedir ajustes
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 space-y-8">
                    <Card>
                      <h3 className="text-xl mb-3">Escopo</h3>
                      <p className="text-gray-700">{selectedDelivery.description || "Sem descrição."}</p>
                    </Card>

                    <Card>
                      <h3 className="text-xl mb-4">Links</h3>
                      <div className="space-y-3">
                        {(selectedDelivery.externalLinks || []).map((link) => (
                          <div key={link.id} className="p-4 border border-gray-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="min-w-0">
                              <p className="font-bold text-gray-800 truncate">{link.title}</p>
                              <p className="text-xs text-gray-400 truncate">{link.url}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <a
                                className="text-xs font-black uppercase tracking-widest text-[#1895BD] hover:underline"
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Abrir
                              </a>
                              {role === "ADMIN" ? (
                                <Button variant="outline" onClick={() => removeDeliveryLink(link.id)}>Remover</Button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                        {(selectedDelivery.externalLinks || []).length === 0 ? (
                          <div className="py-6 text-center text-gray-300">Nenhum link adicionado.</div>
                        ) : null}
                      </div>

                      {role === "ADMIN" || role === "PRESTADOR" ? (
                        <div className="mt-6 p-5 border border-gray-100 rounded-2xl">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Adicionar link</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              value={deliveryLinkForm.title}
                              onChange={(e) => setDeliveryLinkForm((f) => ({ ...f, title: e.target.value }))}
                              className="px-4 py-3 border border-gray-100 rounded-xl"
                              placeholder="Título"
                            />
                            <input
                              value={deliveryLinkForm.url}
                              onChange={(e) => setDeliveryLinkForm((f) => ({ ...f, url: e.target.value }))}
                              className="px-4 py-3 border border-gray-100 rounded-xl"
                              placeholder="https://..."
                            />
                          </div>
                          <div className="flex justify-end mt-4">
                            <Button onClick={addDeliveryLink}>Adicionar link</Button>
                          </div>
                        </div>
                      ) : null}
                    </Card>

                    <Card>
                      <h3 className="text-xl mb-4">Comentários</h3>

                      <div className="space-y-4">
                        {(selectedDelivery.comments || []).map((c) => (
                          <div key={c.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                            <div className="flex justify-between items-center mb-1">
                              <p className="text-xs font-black text-[#1895BD] uppercase tracking-widest">{c.authorName}</p>
                              <p className="text-[10px] font-black text-gray-300">{c.date}</p>
                            </div>
                            <p className="text-gray-700">{c.text}</p>
                          </div>
                        ))}

                        {(selectedDelivery.comments || []).length === 0 ? (
                          <div className="py-8 text-center text-gray-300">Nenhum comentário ainda.</div>
                        ) : null}
                      </div>

                      <div className="pt-4">
                        <textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Adicionar comentário..."
                          className="w-full bg-white border-2 border-gray-100 rounded-2xl p-4 min-h-[120px] outline-none focus:border-[#1895BD]"
                        />
                        <div className="flex justify-end mt-3">
                          <Button onClick={() => addComment(selectedDelivery.id)}>Publicar</Button>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <div className="space-y-8">
                    <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white border-0">
                      <h3 className="text-xl mb-6">Gestão</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Status</span>
                          <Badge type="status" value={selectedDelivery.status} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Progresso</span>
                          <Badge type="status" value={selectedDelivery.progress} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Prioridade</span>
                          <Badge type="priority" value={selectedDelivery.priority} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Prestador</span>
                          <span className="text-sm font-black">{selectedDelivery.provider}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Prazo</span>
                          <span className="text-sm font-black">{selectedDelivery.deadline}</span>
                        </div>
                      </div>
                    </Card>

                    {role === "ADMIN" ? (
                      <Card>
                        <h3 className="text-xl mb-4">Ações</h3>
                        <Button variant="danger" className="w-full" onClick={() => removeDelivery(selectedDelivery)}>
                          Excluir entrega
                        </Button>
                      </Card>
                    ) : null}

                    <Card>
                      <h3 className="text-xl mb-4">Alteração de prazo</h3>
                      {selectedDelivery.deadlineChangeRequest ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Solicitado</p>
                            <p className="text-sm font-bold text-gray-700">
                              {selectedDelivery.deadlineChangeRequest.requestedDeadline}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Motivo</p>
                            <p className="text-sm text-gray-700">
                              {selectedDelivery.deadlineChangeRequest.reason}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-gray-400">
                            <span>Status</span>
                            <span>{selectedDelivery.deadlineChangeRequest.status}</span>
                          </div>
                          {selectedDelivery.deadlineChangeRequest.status !== "PENDING" ? (
                            <div>
                              <p className="text-xs font-black uppercase tracking-widest text-gray-400">Decisão</p>
                              <p className="text-sm text-gray-700">
                                {selectedDelivery.deadlineChangeRequest.adminNote || "Sem observações."}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Nenhuma solicitação registrada.</p>
                      )}

                      {role === "PRESTADOR" && selectedDelivery.status !== "APROVADO" ? (
                        <>
                          {selectedDelivery.deadlineChangeRequest?.status === "PENDING" ? (
                            <p className="mt-4 text-xs font-black uppercase tracking-widest text-orange-400">
                              Solicitação pendente de avaliação.
                            </p>
                          ) : (
                            <div className="mt-4 space-y-3">
                              <input
                                type="date"
                                value={deadlineRequestForm.requestedDeadline}
                                onChange={(e) =>
                                  setDeadlineRequestForm((f) => ({ ...f, requestedDeadline: e.target.value }))
                                }
                                className="w-full px-4 py-3 border border-gray-100 rounded-xl"
                              />
                              <textarea
                                value={deadlineRequestForm.reason}
                                onChange={(e) =>
                                  setDeadlineRequestForm((f) => ({ ...f, reason: e.target.value }))
                                }
                                className="w-full bg-white border-2 border-gray-100 rounded-2xl p-4 min-h-[90px] outline-none focus:border-[#1895BD]"
                                placeholder="Explique o motivo do ajuste."
                              />
                              <div className="flex justify-end">
                                <Button onClick={() => submitDeadlineChangeRequest(selectedDelivery.id)}>
                                  Solicitar alteração
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : null}

                      {role === "ADMIN" && selectedDelivery.deadlineChangeRequest?.status === "PENDING" ? (
                        <div className="mt-4 space-y-3">
                          <textarea
                            value={deadlineDecisionNote}
                            onChange={(e) => setDeadlineDecisionNote(e.target.value)}
                            className="w-full bg-white border-2 border-gray-100 rounded-2xl p-4 min-h-[80px] outline-none focus:border-[#1895BD]"
                            placeholder="Observações para o prestador (opcional)."
                          />
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => decideDeadlineChangeRequest(selectedDelivery.id, "REJECTED")}>
                              Rejeitar
                            </Button>
                            <Button variant="primary" onClick={() => decideDeadlineChangeRequest(selectedDelivery.id, "APPROVED")}>
                              Aprovar
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </Card>

                    <Card>
                      <h3 className="text-xl mb-2">Arquivos</h3>
                      <p className="text-sm text-gray-500">
                        Upload desativado no MVP (Storage pago). Por enquanto, use links nos comentários.
                      </p>
                    </Card>
                  </div>
                </div>
              </>
            )}

            {/* PERFIL */}
            {view === "PERFIL" && (
              <div className="max-w-2xl mx-auto py-10">
                <h1 className="text-3xl font-black text-center text-slate-900 mb-10">Minha Conta</h1>

                <Card className="py-12">
                  <div className="text-center">
                    <h2 className="text-2xl text-slate-900 font-black">{profile.name}</h2>
                    <p className="text-slate-500 mt-2">{profile.email}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mt-4">
                      {profile.role}
                    </p>
                  </div>

                  <div className="mt-10 space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Chave Pix</p>
                      <p className="text-sm font-bold text-slate-700 mt-2">{profile.pixKey || "Não informado"}</p>
                    </div>
                  </div>

                  {hasGoogleProvider ? (
                    <div className="mt-10">
                      <h3 className="text-lg font-black text-slate-900 mb-2">Definir senha</h3>
                      <p className="text-sm text-slate-500 mb-4">
                        Vincule uma senha para entrar também com email e senha.
                      </p>

                      {hasPasswordProvider ? (
                        <div className="text-sm text-emerald-600 font-bold">
                          Email/senha já vinculado a esta conta.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
                              Nova senha
                            </p>
                            <input
                              type="password"
                              value={linkPassword}
                              onChange={(e) => setLinkPassword(e.target.value)}
                              className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                              placeholder="mín. 6 caracteres"
                            />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
                              Confirmar senha
                            </p>
                            <input
                              type="password"
                              value={linkPasswordConfirm}
                              onChange={(e) => setLinkPasswordConfirm(e.target.value)}
                              className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none"
                              placeholder="repita a senha"
                            />
                          </div>
                          <div className="flex justify-end">
                            <Button onClick={doLinkPassword} disabled={linkingPassword}>
                              {linkingPassword ? "Vinculando..." : "Vincular email/senha"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="mt-12 flex justify-center">
                    <Button variant="outline" onClick={doLogout}>
                      Desconectar
                    </Button>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}