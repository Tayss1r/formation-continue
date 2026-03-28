"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Users,
  Calendar,
  FileText,
  ArrowRight,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  MapPin,
} from "lucide-react";
import { getProfessorDashboard } from "@/lib/professor";
import {
  createProfessorCohortSession,
  deleteProfessorCohortSession,
  getProfessorAssignedCohorts,
  getProfessorCohortSessions,
  updateProfessorCohortSession,
} from "@/lib/cohorts";
import { getImageUrl } from "@/lib/config";
import type { ProfessorDashboard } from "@/types/professor";
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

export default function ProfessorDashboardPage() {
  const [dashboard, setDashboard] = useState<ProfessorDashboard | null>(null);
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
    async function fetchDashboard() {
      try {
        const [data, cohortsRes] = await Promise.all([
          getProfessorDashboard(),
          getProfessorAssignedCohorts(),
        ]);
        setDashboard(data);
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

        for (let index = 0; index < cohortsRes.cohorts.length; index++) {
          const cohort = cohortsRes.cohorts[index];
          const result = sessionsEntries[index];

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
        console.error("Failed to fetch dashboard:", err);
        setError("Impossible de charger le tableau de bord");
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
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

  if (!dashboard) {
    return null;
  }

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

  const stats = [
    {
      label: "Formations Assignées",
      value: dashboard.stats.total_courses,
      icon: BookOpen,
      color: "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400",
    },
    {
      label: "Sessions Totales",
      value: dashboard.stats.total_sessions,
      icon: Calendar,
      color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Employés Inscrits",
      value: dashboard.stats.total_enrolled_employees,
      icon: Users,
      color: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    },
    {
      label: "Sessions à Venir",
      value: dashboard.stats.upcoming_sessions,
      icon: Calendar,
      color: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="heading-display text-2xl text-foreground mb-2">
          Bienvenue, {dashboard.fullname}
        </h1>
        <p className="text-muted-foreground">
          {dashboard.specialization}
          {dashboard.department_display && ` • ${dashboard.department_display}`}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="card-elevated p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Courses */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            Mes Formations Récentes
          </h2>
          <Link
            href="/professor/courses"
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            Voir tout
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {dashboard.recent_courses.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Aucune formation assignée pour le moment.
          </p>
        ) : (
          <div className="space-y-4">
            {dashboard.recent_courses.map((course) => (
              <Link
                key={course.id}
                href={`/professor/courses/${course.id}`}
                className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted transition-colors"
              >
                {/* Course Image */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                  {course.image_path ? (
                    <img
                      src={getImageUrl(course.image_path)}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                </div>

                {/* Course Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">
                    {course.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {course.department_display || "Département non spécifié"}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{course.enrolled_count}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>{course.materials_count}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">My Cohorts</h2>
        {cohorts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Aucun cohort assigne pour le moment.
          </p>
        ) : (
          <div className="space-y-6">
            {cohorts.map((cohort) => (
              <section key={cohort.id} className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
                <div>
                  <p className="font-medium text-foreground">{cohort.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">Formation: {cohort.course_title}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Marge de formation: {cohort.training_start_date} - {cohort.training_end_date} | {cohort.daily_start_hour} - {cohort.daily_end_hour}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                  <input
                    value={(sessionForms[cohort.id] || emptySessionForm).title}
                    onChange={(event) => updateSessionForm(cohort.id, { title: event.target.value })}
                    className="form-input"
                    placeholder="Titre de session"
                  />
                  <input
                    type="date"
                    value={(sessionForms[cohort.id] || emptySessionForm).session_date}
                    min={cohort.training_start_date}
                    max={cohort.training_end_date}
                    onChange={(event) => updateSessionForm(cohort.id, { session_date: event.target.value })}
                    className="form-input"
                  />
                  <input
                    type="time"
                    value={(sessionForms[cohort.id] || emptySessionForm).start_time}
                    min={cohort.daily_start_hour}
                    max={cohort.daily_end_hour}
                    onChange={(event) => updateSessionForm(cohort.id, { start_time: event.target.value })}
                    className="form-input"
                  />
                  <input
                    type="time"
                    value={(sessionForms[cohort.id] || emptySessionForm).end_time}
                    min={cohort.daily_start_hour}
                    max={cohort.daily_end_hour}
                    onChange={(event) => updateSessionForm(cohort.id, { end_time: event.target.value })}
                    className="form-input"
                  />
                  <input
                    value={(sessionForms[cohort.id] || emptySessionForm).location}
                    onChange={(event) => updateSessionForm(cohort.id, { location: event.target.value })}
                    className="form-input"
                    placeholder="Lieu (optionnel)"
                  />
                </div>

                {sessionErrorByCohort[cohort.id] && (
                  <p className="text-sm text-red-600">{sessionErrorByCohort[cohort.id]}</p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void saveSession(cohort)}
                    disabled={!!savingSessionByCohort[cohort.id]}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    {savingSessionByCohort[cohort.id] ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    {editingSessionIdByCohort[cohort.id] ? "Mettre a jour" : "Creer session"}
                  </button>
                  {editingSessionIdByCohort[cohort.id] && (
                    <button onClick={() => cancelEditSession(cohort.id)} className="btn-secondary">
                      Annuler
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Sessions planifiees</p>
                  {loadingSessionsByCohort[cohort.id] ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Chargement des sessions...
                    </div>
                  ) : (sessionsByCohort[cohort.id] || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucune session pour ce cohort.</p>
                  ) : (
                    <div className="space-y-2">
                      {(sessionsByCohort[cohort.id] || []).map((item) => (
                        <div key={item.id} className="p-3 rounded-lg bg-card border border-border flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.session_date} | {item.start_time} - {item.end_time}
                            </p>
                            {item.location && (
                              <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3" />
                                {item.location}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditSession(cohort.id, item)}
                              className="btn-secondary inline-flex items-center gap-1"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Modifier
                            </button>
                            <button
                              onClick={() => void removeSession(cohort.id, item.id)}
                              disabled={deletingSessionId === item.id}
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              {deletingSessionId === item.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              Supprimer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
