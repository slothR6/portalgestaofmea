import React, { useMemo, useState } from "react";
import { deleteField } from "firebase/firestore";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import { usePortalStore } from "../hooks/usePortalStore";
import { formatDateInput, formatDateTime, formatTimeInput, buildTimestamp } from "../utils/dates";
import { getMeetingStatusClasses, getMeetingStatusLabel } from "../utils/meetings";
import { createMeeting, updateMeeting as updateMeetingSvc } from "../services/portal";
import { createNotification } from "../services/notifications";
import { Meeting } from "../types";
import { sanitize } from "../utils/sanitize";

export default function MeetingsPage() {
  const { state, role, profile, user, pushToast } = usePortalStore();
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

  const meetingsSorted = useMemo(() => [...state.meetings].sort((a, b) => a.startsAt - b.startsAt), [state.meetings]);

  const meetingParticipants = useMemo(
    () =>
      state.users.filter(
        (u) => u.status === "ACTIVE" && u.active && (u.role === "ADMIN" || u.role === "PRESTADOR")
      ),
    [state.users]
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
      (m) => m.status !== "SCHEDULED" || m.endsAt < activeThreshold || m.startsAt < startOfDay.getTime()
    );

    return {
      meetingsToday,
      meetingsUpcoming,
      meetingsHistory,
    };
  }, [meetingsSorted]);

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

    if (!title) return pushToast({ type: "error", title: "Informe o título da reunião" });
    if (!meetingForm.startDate || !meetingForm.startTime || Number.isNaN(startsAt)) {
      return pushToast({ type: "error", title: "Informe data e hora de início" });
    }
    if (!meetingForm.endTime || Number.isNaN(endsAt)) {
      return pushToast({ type: "error", title: "Informe data e hora de término" });
    }
    if (endsAt <= startsAt) {
      return pushToast({ type: "error", title: "Término deve ser após o início" });
    }

    if (meetingForm.participantUids.length === 0) {
      return pushToast({ type: "error", title: "Selecione os participantes" });
    }

    const participants = Array.from(new Set([...meetingForm.participantUids, user.uid]));

    try {
      if (editingMeetingId) {
        const existing = state.meetings.find((m) => m.id === editingMeetingId);
        if (!existing) {
          pushToast({ type: "error", title: "Reunião não encontrada" });
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

        const newInvitees = participants.filter((uid) => uid !== user.uid && !existing.participantUids.includes(uid));
        await Promise.all(
          newInvitees.map((uid) =>
            createNotification({
              toUid: uid,
              type: "MEETING",
              title: `Atualização de reunião: ${title}`,
              createdAt: Date.now(),
              read: false,
            })
          )
        );

        resetMeetingForm();
        pushToast({ type: "success", title: "Reunião atualizada" });
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
            createNotification({
              toUid: uid,
              type: "MEETING",
              title: `Nova reunião: ${title}`,
              createdAt: Date.now(),
              read: false,
            })
          )
        );

        resetMeetingForm();
        pushToast({ type: "success", title: "Reunião criada" });
      }
    } catch (error: any) {
      pushToast({
        type: "error",
        title: editingMeetingId ? "Erro ao atualizar reunião" : "Erro ao criar reunião",
        message: error?.message || "",
      });
    }
  };

  const updateMeetingStatus = async (meeting: Meeting, status: Meeting["status"]) => {
    if (!profile || profile.role !== "ADMIN") return;
    const label = status === "DONE" ? "concluir" : "cancelar";
    if (!confirm(`Deseja ${label} a reunião "${meeting.title}"?`)) return;

    try {
      const patch =
        status === "DONE" ? { status, completedAt: Date.now() } : { status, completedAt: deleteField() as unknown as number };
      await updateMeetingSvc(meeting.id, patch);
      pushToast({
        type: "success",
        title: status === "DONE" ? "Reunião concluída" : "Reunião cancelada",
      });
    } catch (error: any) {
      pushToast({
        type: "error",
        title: "Erro ao atualizar reunião",
        message: error?.message || "",
      });
    }
  };

  return (
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
              {state.loading.meetings ? (
                <div className="py-6 text-center text-gray-300">Carregando reuniões...</div>
              ) : (
                meetingsToday.map((meeting) => (
                  <div key={meeting.id} className="p-6 border border-slate-200 rounded-3xl bg-white shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-5 min-w-0">
                        <div className="rounded-2xl bg-slate-900 text-white px-4 py-3 min-w-[190px]">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Início</p>
                          <p className="text-sm font-black">{formatDateTime(meeting.startsAt)}</p>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mt-3">Término</p>
                          <p className="text-sm font-black">{formatDateTime(meeting.endsAt)}</p>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-lg font-black text-slate-900 truncate">{meeting.title}</p>
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border ${getMeetingStatusClasses(
                                meeting.status
                              )}`}
                            >
                              {getMeetingStatusLabel(meeting.status)}
                            </span>
                          </div>
                          {meeting.description ? (
                            <p className="text-sm text-slate-500 mt-2">{meeting.description}</p>
                          ) : null}
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-4">
                            Participantes: {meeting.participantUids.length}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-3">
                        {meeting.link ? (
                          <a
                            className="inline-flex items-center justify-center px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] bg-gradient-to-r from-slate-900 via-blue-900 to-blue-600 text-white shadow-lg shadow-blue-900/20"
                            href={meeting.link}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Entrar na reunião
                          </a>
                        ) : null}
                        {role === "ADMIN" ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              onClick={() => startEditMeeting(meeting)}
                              className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-700"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => updateMeetingStatus(meeting, "DONE")}
                              className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 hover:text-emerald-700"
                            >
                              Concluir
                            </button>
                            <button
                              onClick={() => updateMeetingStatus(meeting, "CANCELED")}
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
              {!state.loading.meetings && meetingsToday.length === 0 ? (
                <div className="py-6 text-center text-gray-300">Nenhuma reunião hoje.</div>
              ) : null}
            </div>
          </Card>

          <Card>
            <h3 className="text-xl font-black mb-6 text-slate-800">Próximas reuniões</h3>
            <div className="space-y-3">
              {state.loading.meetings ? (
                <div className="py-6 text-center text-gray-300">Carregando reuniões...</div>
              ) : (
                meetingsUpcoming.map((meeting) => (
                  <div key={meeting.id} className="p-6 border border-slate-200 rounded-3xl bg-white shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-5 min-w-0">
                        <div className="rounded-2xl bg-slate-900 text-white px-4 py-3 min-w-[190px]">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Início</p>
                          <p className="text-sm font-black">{formatDateTime(meeting.startsAt)}</p>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mt-3">Término</p>
                          <p className="text-sm font-black">{formatDateTime(meeting.endsAt)}</p>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-lg font-black text-slate-900 truncate">{meeting.title}</p>
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border ${getMeetingStatusClasses(
                                meeting.status
                              )}`}
                            >
                              {getMeetingStatusLabel(meeting.status)}
                            </span>
                          </div>
                          {meeting.description ? (
                            <p className="text-sm text-slate-500 mt-2">{meeting.description}</p>
                          ) : null}
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-4">
                            Participantes: {meeting.participantUids.length}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-3">
                        {meeting.link ? (
                          <a
                            className="inline-flex items-center justify-center px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] bg-gradient-to-r from-slate-900 via-blue-900 to-blue-600 text-white shadow-lg shadow-blue-900/20"
                            href={meeting.link}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Entrar na reunião
                          </a>
                        ) : null}
                        {role === "ADMIN" ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              onClick={() => startEditMeeting(meeting)}
                              className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-700"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => updateMeetingStatus(meeting, "DONE")}
                              className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 hover:text-emerald-700"
                            >
                              Concluir
                            </button>
                            <button
                              onClick={() => updateMeetingStatus(meeting, "CANCELED")}
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
              {!state.loading.meetings && meetingsUpcoming.length === 0 ? (
                <div className="py-6 text-center text-gray-300">Nenhuma reunião futura.</div>
              ) : null}
            </div>
          </Card>

          <Card>
            <h3 className="text-xl font-black mb-6 text-slate-800">Histórico</h3>
            <div className="space-y-3">
              {state.loading.meetings ? (
                <div className="py-6 text-center text-gray-300">Carregando reuniões...</div>
              ) : (
                meetingsHistory.map((meeting) => (
                  <div key={meeting.id} className="p-6 border border-slate-200 rounded-3xl bg-white shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-5 min-w-0">
                        <div className="rounded-2xl bg-slate-900 text-white px-4 py-3 min-w-[190px]">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Início</p>
                          <p className="text-sm font-black">{formatDateTime(meeting.startsAt)}</p>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 mt-3">Término</p>
                          <p className="text-sm font-black">{formatDateTime(meeting.endsAt)}</p>
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="text-lg font-black text-slate-900 truncate">{meeting.title}</p>
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border ${getMeetingStatusClasses(
                                meeting.status
                              )}`}
                            >
                              {getMeetingStatusLabel(meeting.status)}
                            </span>
                          </div>
                          {meeting.description ? (
                            <p className="text-sm text-slate-500 mt-2">{meeting.description}</p>
                          ) : null}
                          {meeting.status === "DONE" && meeting.completedAt ? (
                            <p className="text-xs text-slate-400 mt-3">Concluída em {formatDateTime(meeting.completedAt)}</p>
                          ) : null}
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-4">
                            Participantes: {meeting.participantUids.length}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-3">
                        {meeting.link ? (
                          <a
                            className="inline-flex items-center justify-center px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] bg-gradient-to-r from-slate-900 via-blue-900 to-blue-600 text-white shadow-lg shadow-blue-900/20"
                            href={meeting.link}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir reunião
                          </a>
                        ) : null}
                        {role === "ADMIN" && meeting.status === "SCHEDULED" ? (
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              onClick={() => startEditMeeting(meeting)}
                              className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 hover:text-slate-700"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => updateMeetingStatus(meeting, "DONE")}
                              className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 hover:text-emerald-700"
                            >
                              Concluir
                            </button>
                            <button
                              onClick={() => updateMeetingStatus(meeting, "CANCELED")}
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
              {!state.loading.meetings && meetingsHistory.length === 0 ? (
                <div className="py-6 text-center text-gray-300">Nenhuma reunião no histórico.</div>
              ) : null}
            </div>
          </Card>
        </div>

        {role === "ADMIN" ? (
          <Card className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-900">
                {editingMeetingId ? "Editar reunião" : "Criar reunião"}
              </h3>
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
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Título</p>
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
                    onChange={(e) => setMeetingForm((m) => ({ ...m, startTime: e.target.value, endTime: "" }))}
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
                <p className="text-[10px] text-slate-400">O término deve ser após o início e sempre no mesmo dia.</p>
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
                  {meetingParticipants.map((participant) => (
                    <label key={participant.uid} className="flex items-center gap-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={meetingForm.participantUids.includes(participant.uid)}
                        onChange={() => toggleMeetingParticipant(participant.uid)}
                        className="h-4 w-4"
                      />
                      <span className="font-bold">{participant.name}</span>
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                        {participant.role}
                      </span>
                    </label>
                  ))}
                  {meetingParticipants.length === 0 ? (
                    <div className="py-6 text-center text-slate-300">Sem usuários ativos.</div>
                  ) : null}
                </div>
                <p className="text-[10px] text-slate-400">Você será incluído automaticamente.</p>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveMeeting}>{editingMeetingId ? "Salvar alterações" : "Criar reunião"}</Button>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </>
  );
}
