"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  CalendarCheck,
} from "lucide-react";

import {
  createProfessorCohortSession,
  deleteProfessorCohortSession,
  getProfessorAssignedCohorts,
  getProfessorCohortSessions,
  updateProfessorCohortSession,
} from "@/lib/cohorts";
import type {
  CohortSession,
  CohortSessionPayload,
  ProfessorAssignedCohort,
} from "@/types/cohort";

interface SessionFormState {
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location: string;
}

const emptySessionForm: SessionFormState = {
  title: "",
  session_date: "",
  start_time: "09:00",
  end_time: "10:00",
  location: "",
};

export default function ProfessorSessionsPage() {
  const [cohorts, setCohorts] = useState<ProfessorAssignedCohort[]>([]);
  const [sessionsByCohort, setSessionsByCohort] = useState<Record<number, CohortSession[]>>({});
  const [sessionForms, setSessionForms] = useState<Record<number, SessionFormState>>({});
  const [editingSessionIdByCohort, setEditingSessionIdByCohort] = useState<Record<number, number | null>>({});
  const [loadingSessionsByCohort, setLoadingSessionsByCohort] = useState<Record<number, boolean>>({});
  const [savingSessionByCohort, setSavingSessionByCohort] = useState<Record<number, boolean>>({});
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null);
  const [sessionErrorByCohort, setSessionErrorByCohort] = useState<Record<number, string | null>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const cohortsRes = await getProfessorAssignedCohorts();
        setCohorts(cohortsRes.cohorts);

        const sessionsEntries = await Promise.allSettled(
          cohortsRes.cohorts.map(async (cohort) => {
            const response = await getProfessorCohortSessions(cohort.id);
            return [cohort.id, response.sessions] as const;
          })
        );

        const sessionsMap: Record<number, CohortSession[]> = {};
        const formsMap: Record<number, SessionFormState> = {};
        const editingMap: Record<number, number | null> = {};
        const errorMap: Record<number, string | null> = {};

        for (let i = 0; i < cohortsRes.cohorts.length; i++) {
          const cohort = cohortsRes.cohorts[i];
          const result = sessionsEntries[i];

          formsMap[cohort.id] = { ...emptySessionForm };
          editingMap[cohort.id] = null;

          if (result.status === "fulfilled") {
            const [, sessions] = result.value;
            sessionsMap[cohort.id] = sessions;
            errorMap[cohort.id] = null;
          } else {
            sessionsMap[cohort.id] = [];
            errorMap[cohort.id] = "Impossible de charger les sessions pour ce cohort";
          }
        }

        setSessionsByCohort(sessionsMap);
        setSessionForms(formsMap);
        setEditingSessionIdByCohort(editingMap);
        setSessionErrorByCohort(errorMap);
      } catch (err) {
        console.error("Failed to load sessions page:", err);
        setError("Impossible de charger la page des sessions");
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, []);

  function getErrorMessage(err: unknown, fallback: string): string {
    if (err && typeof err === "object" && "message" in err) {
      const message = (err as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) {
        return message;
      }
    }
    if (err && typeof err === "object" && "detail" in err) {
      const detail = (err as { detail?: unknown }).detail;
      if (typeof detail === "string" && detail.trim()) {
        return detail;
      }
    }
    return fallback;
  }

  function updateSessionForm(cohortId: number, patch: Partial<SessionFormState>) {
    setSessionForms((prev) => ({
      ...prev,
      [cohortId]: {
        ...(prev[cohortId] || emptySessionForm),
        ...patch,
      },
    }));
  }

  function validateSessionForm(cohort: ProfessorAssignedCohort, form: SessionFormState): string | null {
    if (!form.title.trim()) return "Le titre de la session est requis";
    if (!form.session_date) return "La date de session est requise";
    if (!form.start_time || !form.end_time) return "Les heures sont requises";
    if (form.start_time >= form.end_time) return "L'heure de debut doit etre avant l'heure de fin";

    if (form.session_date < cohort.training_start_date || form.session_date > cohort.training_end_date) {
      return "La session doit etre planifiee dans la periode de formation du cohort";
    }
    if (form.start_time < cohort.daily_start_hour || form.end_time > cohort.daily_end_hour) {
      return "La session doit respecter la marge horaire quotidienne du cohort";
    }

    return null;
  }

  function isCohortOutdated(cohort: ProfessorAssignedCohort): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(cohort.training_end_date);
    endDate.setHours(0, 0, 0, 0);
    return endDate < today;
  }

  async function reloadCohortSessions(cohortId: number) {
    setLoadingSessionsByCohort((prev) => ({ ...prev, [cohortId]: true }));
    try {
      const response = await getProfessorCohortSessions(cohortId);
      setSessionsByCohort((prev) => ({ ...prev, [cohortId]: response.sessions }));
    } finally {
      setLoadingSessionsByCohort((prev) => ({ ...prev, [cohortId]: false }));
    }
  }

  async function saveSession(cohort: ProfessorAssignedCohort) {
    const cohortId = cohort.id;
    const form = sessionForms[cohortId] || emptySessionForm;
    const validation = validateSessionForm(cohort, form);

    if (validation) {
      setSessionErrorByCohort((prev) => ({ ...prev, [cohortId]: validation }));
      return;
    }

    const payload: CohortSessionPayload = {
      title: form.title.trim(),
      session_date: form.session_date,
      start_time: form.start_time,
      end_time: form.end_time,
      location: form.location.trim() || undefined,
    };

    setSavingSessionByCohort((prev) => ({ ...prev, [cohortId]: true }));
    setSessionErrorByCohort((prev) => ({ ...prev, [cohortId]: null }));

    try {
      const editingId = editingSessionIdByCohort[cohortId];
      if (editingId) {
        await updateProfessorCohortSession(cohortId, editingId, payload);
      } else {
        await createProfessorCohortSession(cohortId, payload);
      }

      await reloadCohortSessions(cohortId);
      setSessionForms((prev) => ({ ...prev, [cohortId]: { ...emptySessionForm } }));
      setEditingSessionIdByCohort((prev) => ({ ...prev, [cohortId]: null }));
    } catch (err) {
      setSessionErrorByCohort((prev) => ({
        ...prev,
        [cohortId]: getErrorMessage(err, "Erreur lors de l'enregistrement de la session"),
      }));
    } finally {
      setSavingSessionByCohort((prev) => ({ ...prev, [cohortId]: false }));
    }
  }

  function startEditSession(cohortId: number, item: CohortSession) {
    setEditingSessionIdByCohort((prev) => ({ ...prev, [cohortId]: item.id }));
    setSessionForms((prev) => ({
      ...prev,
      [cohortId]: {
        title: item.title,
        session_date: item.session_date,
        start_time: item.start_time,
        end_time: item.end_time,
        location: item.location || "",
      },
    }));
    setSessionErrorByCohort((prev) => ({ ...prev, [cohortId]: null }));
  }

  function cancelEditSession(cohortId: number) {
    setEditingSessionIdByCohort((prev) => ({ ...prev, [cohortId]: null }));
    setSessionForms((prev) => ({ ...prev, [cohortId]: { ...emptySessionForm } }));
    setSessionErrorByCohort((prev) => ({ ...prev, [cohortId]: null }));
  }

  async function removeSession(cohortId: number, sessionId: number) {
    setDeletingSessionId(sessionId);
    setSessionErrorByCohort((prev) => ({ ...prev, [cohortId]: null }));
    try {
      await deleteProfessorCohortSession(cohortId, sessionId);
      await reloadCohortSessions(cohortId);
      if (editingSessionIdByCohort[cohortId] === sessionId) {
        cancelEditSession(cohortId);
      }
    } catch (err) {
      setSessionErrorByCohort((prev) => ({
        ...prev,
        [cohortId]: getErrorMessage(err, "Erreur lors de la suppression de la session"),
      }));
    } finally {
      setDeletingSessionId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section className="card-elevated p-6 md:p-7 bg-gradient-to-br from-primary-50 via-card to-amber-50/40 dark:from-primary-900/20 dark:via-card dark:to-transparent border border-primary-200/40 dark:border-primary-500/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="heading-display text-2xl text-foreground">Gestion des Sessions</h1>
            <p className="text-muted-foreground mt-2 max-w-3xl">
              Planifiez vos sessions par cohort et gérez leur calendrier.
            </p>
          </div>
          <Link
            href="/professor/attendance"
            className="btn-secondary inline-flex items-center gap-2 text-sm px-4 h-10"
          >
            <CalendarCheck className="w-4 h-4" />
            Ouvrir les présences
          </Link>
        </div>
      </section>

      {cohorts.length === 0 ? (
        <div className="card-elevated p-8 text-center">
          <p className="text-muted-foreground text-sm">Aucun cohort assigne pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {cohorts.map((cohort) => (
            <section key={cohort.id} className="card-elevated overflow-hidden">
              <div className="px-6 py-5 border-b border-border bg-muted/20">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <p className="font-semibold text-foreground">{cohort.name}</p>
                  <span className="px-2.5 py-1 rounded-full text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                    {cohort.course_title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Periode: {cohort.training_start_date} - {cohort.training_end_date} | Horaires: {cohort.daily_start_hour} - {cohort.daily_end_hour}
                </p>
              </div>

              <div className="p-6 space-y-4">
                {isCohortOutdated(cohort) && (
                  <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                    Ce cohort est termine. La creation de nouvelles sessions est desactivee.
                  </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                  <input
                    value={(sessionForms[cohort.id] || emptySessionForm).title}
                    onChange={(event) => updateSessionForm(cohort.id, { title: event.target.value })}
                    className="form-input"
                    placeholder="Titre de session"
                    disabled={isCohortOutdated(cohort)}
                  />
                  <input
                    type="date"
                    value={(sessionForms[cohort.id] || emptySessionForm).session_date}
                    min={cohort.training_start_date}
                    max={cohort.training_end_date}
                    onChange={(event) => updateSessionForm(cohort.id, { session_date: event.target.value })}
                    className="form-input"
                    disabled={isCohortOutdated(cohort)}
                  />
                  <input
                    type="time"
                    value={(sessionForms[cohort.id] || emptySessionForm).start_time}
                    min={cohort.daily_start_hour}
                    max={cohort.daily_end_hour}
                    onChange={(event) => updateSessionForm(cohort.id, { start_time: event.target.value })}
                    className="form-input"
                    disabled={isCohortOutdated(cohort)}
                  />
                  <input
                    type="time"
                    value={(sessionForms[cohort.id] || emptySessionForm).end_time}
                    min={cohort.daily_start_hour}
                    max={cohort.daily_end_hour}
                    onChange={(event) => updateSessionForm(cohort.id, { end_time: event.target.value })}
                    className="form-input"
                    disabled={isCohortOutdated(cohort)}
                  />
                  <input
                    value={(sessionForms[cohort.id] || emptySessionForm).location}
                    onChange={(event) => updateSessionForm(cohort.id, { location: event.target.value })}
                    className="form-input"
                    placeholder="Lieu (optionnel)"
                    disabled={isCohortOutdated(cohort)}
                  />
                </div>

                {sessionErrorByCohort[cohort.id] && (
                  <p className="text-sm text-red-600">{sessionErrorByCohort[cohort.id]}</p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void saveSession(cohort)}
                    disabled={!!savingSessionByCohort[cohort.id] || isCohortOutdated(cohort)}
                    className="btn-primary inline-flex items-center gap-1.5 text-xs px-3 py-1.5"
                  >
                    {savingSessionByCohort[cohort.id] ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    {editingSessionIdByCohort[cohort.id] ? "Mettre a jour" : "Creer session"}
                  </button>
                  {editingSessionIdByCohort[cohort.id] && (
                    <button
                      onClick={() => cancelEditSession(cohort.id)}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      Annuler
                    </button>
                  )}
                </div>

                <div className="space-y-3 pt-1">
                  <p className="text-sm font-medium text-foreground">Sessions planifiees</p>
                  {loadingSessionsByCohort[cohort.id] ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Chargement des sessions...
                    </div>
                  ) : (sessionsByCohort[cohort.id] || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune session pour ce cohort.</p>
                  ) : (
                    <div className="space-y-3">
                      {(sessionsByCohort[cohort.id] || []).map((item) => (
                        <div key={item.id} className="rounded-xl border border-border bg-card/80 p-4 space-y-3 shadow-sm">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="font-medium text-foreground">{item.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.session_date} | {item.start_time} - {item.end_time}
                              </p>
                              {item.location && (
                                <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3" />
                                  {item.location}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                              <Link
                                href={`/professor/attendance?cohortId=${cohort.id}&sessionId=${item.id}`}
                                className="btn-secondary inline-flex items-center justify-center gap-2 text-sm px-4 h-9"
                              >
                                <CalendarCheck className="w-4 h-4" />
                                Présences
                              </Link>
                              <button
                                onClick={() => startEditSession(cohort.id, item)}
                                className="btn-secondary inline-flex items-center justify-center gap-2 text-sm px-4 h-9"
                              >
                                <Pencil className="w-4 h-4" />
                                Modifier
                              </button>
                              <button
                                onClick={() => void removeSession(cohort.id, item.id)}
                                disabled={deletingSessionId === item.id}
                                className="inline-flex items-center justify-center gap-2 px-4 h-9 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm transition-colors disabled:opacity-50"
                              >
                                {deletingSessionId === item.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                                Supprimer
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
