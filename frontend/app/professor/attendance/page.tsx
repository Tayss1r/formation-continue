"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CalendarDays, AlertCircle } from "lucide-react";

import {
  getProfessorAssignedCohorts,
  getProfessorCohortSessions,
  getProfessorSessionAttendance,
  markProfessorSessionAttendance,
} from "@/lib/cohorts";
import type {
  AttendanceStatus,
  CohortSession,
  ProfessorAssignedCohort,
  SessionAttendanceRecord,
} from "@/types/cohort";

export default function ProfessorAttendancePage() {
  const searchParams = useSearchParams();
  const initialCohortId = useMemo(() => Number(searchParams.get("cohortId") || 0), [searchParams]);
  const initialSessionId = useMemo(() => Number(searchParams.get("sessionId") || 0), [searchParams]);

  const [cohorts, setCohorts] = useState<ProfessorAssignedCohort[]>([]);
  const [sessionsByCohort, setSessionsByCohort] = useState<Record<number, CohortSession[]>>({});
  const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<SessionAttendanceRecord[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

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

        for (let i = 0; i < cohortsRes.cohorts.length; i++) {
          const cohort = cohortsRes.cohorts[i];
          const result = sessionsEntries[i];

          if (result.status === "fulfilled") {
            const [, sessions] = result.value;
            sessionsMap[cohort.id] = sessions;
          } else {
            sessionsMap[cohort.id] = [];
          }
        }

        setSessionsByCohort(sessionsMap);

        const defaultCohortId =
          initialCohortId > 0 && cohortsRes.cohorts.some((c) => c.id === initialCohortId)
            ? initialCohortId
            : cohortsRes.cohorts[0]?.id || null;

        if (defaultCohortId) {
          const defaultSessionId =
            initialSessionId > 0 && (sessionsMap[defaultCohortId] || []).some((s) => s.id === initialSessionId)
              ? initialSessionId
              : (sessionsMap[defaultCohortId] || [])[0]?.id || null;

          setSelectedCohortId(defaultCohortId);
          setSelectedSessionId(defaultSessionId);

          if (defaultSessionId) {
            await loadAttendance(defaultCohortId, defaultSessionId);
          }
        }
      } catch (err) {
        console.error("Failed to load attendance page:", err);
        setError("Impossible de charger la page des presences");
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function loadAttendance(cohortId: number, sessionId: number) {
    setIsLoadingAttendance(true);
    setError(null);
    try {
      const response = await getProfessorSessionAttendance(cohortId, sessionId);
      setAttendanceRecords(response.attendance);
    } catch (err) {
      setError(getErrorMessage(err, "Erreur lors du chargement des presences"));
    } finally {
      setIsLoadingAttendance(false);
    }
  }

  function updateAttendanceStatus(employeeId: number, status: AttendanceStatus) {
    setAttendanceRecords((prev) =>
      prev.map((item) => (item.employee_id === employeeId ? { ...item, status } : item))
    );
  }

  function updateAttendanceNotes(employeeId: number, notes: string) {
    setAttendanceRecords((prev) =>
      prev.map((item) => (item.employee_id === employeeId ? { ...item, notes } : item))
    );
  }

  async function saveAttendance() {
    if (!selectedCohortId || !selectedSessionId) return;

    const records = attendanceRecords.map((item) => ({
      employee_id: item.employee_id,
      status: (item.status || "present") as AttendanceStatus,
      notes: item.notes || undefined,
    }));

    if (records.length === 0) {
      setError("Aucun employe a enregistrer pour cette session");
      return;
    }

    setIsSavingAttendance(true);
    setError(null);
    try {
      const response = await markProfessorSessionAttendance(selectedCohortId, selectedSessionId, { records });
      setAttendanceRecords(response.attendance);
    } catch (err) {
      setError(getErrorMessage(err, "Erreur lors de l'enregistrement des presences"));
    } finally {
      setIsSavingAttendance(false);
    }
  }

  function handleCohortChange(nextCohortId: number) {
    setSelectedCohortId(nextCohortId);
    const nextSessionId = (sessionsByCohort[nextCohortId] || [])[0]?.id || null;
    setSelectedSessionId(nextSessionId);
    if (nextSessionId) {
      void loadAttendance(nextCohortId, nextSessionId);
    } else {
      setAttendanceRecords([]);
    }
  }

  function handleSessionChange(nextSessionId: number) {
    setSelectedSessionId(nextSessionId);
    if (selectedCohortId) {
      void loadAttendance(selectedCohortId, nextSessionId);
    }
  }

  const selectedSessions = selectedCohortId ? sessionsByCohort[selectedCohortId] || [] : [];
  const selectedSession = selectedSessions.find((session) => session.id === selectedSessionId) || null;

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
            <h1 className="heading-display text-2xl text-foreground">Gestion des Presences</h1>
            <p className="text-muted-foreground mt-2 max-w-3xl">
              Vue simple: selectionnez un cohort et une session puis remplissez le tableau.
            </p>
          </div>
          <Link
            href="/professor/sessions"
            className="btn-secondary inline-flex items-center gap-2 text-sm px-4 h-10"
          >
            <CalendarDays className="w-4 h-4" />
            Aller aux sessions
          </Link>
        </div>
      </section>

      {cohorts.length === 0 ? (
        <div className="card-elevated p-8 text-center">
          <p className="text-muted-foreground text-sm">Aucun cohort assigne pour le moment.</p>
        </div>
      ) : (
        <section className="card-elevated p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Cohort</label>
              <select
                value={selectedCohortId || ""}
                onChange={(event) => handleCohortChange(Number(event.target.value))}
                className="form-input w-full"
              >
                <option value="" disabled>
                  Selectionner un cohort
                </option>
                {cohorts.map((cohort) => (
                  <option key={cohort.id} value={cohort.id}>
                    {cohort.name} - {cohort.course_title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Session</label>
              <select
                value={selectedSessionId || ""}
                onChange={(event) => handleSessionChange(Number(event.target.value))}
                className="form-input w-full"
                disabled={!selectedCohortId || selectedSessions.length === 0}
              >
                <option value="" disabled>
                  Selectionner une session
                </option>
                {selectedSessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.session_date} | {session.start_time}-{session.end_time} | {session.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedSession && (
            <p className="text-sm text-muted-foreground">
              Session active: <span className="font-medium text-foreground">{selectedSession.title}</span> ({selectedSession.session_date} {selectedSession.start_time}-{selectedSession.end_time})
            </p>
          )}

          {!selectedSessionId ? (
            <p className="text-sm text-muted-foreground">Aucune session selectionnee.</p>
          ) : isLoadingAttendance ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Chargement des presences...
            </div>
          ) : attendanceRecords.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun employe inscrit sur cette session.</p>
          ) : (
            <>
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead className="bg-muted/30 border-b border-border">
                      <tr>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Employe</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Email</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Entreprise</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Statut</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.map((record) => (
                        <tr key={record.employee_id} className="border-b border-border/60">
                          <td className="px-4 py-3 text-sm text-foreground">{record.employee_name}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{record.employee_email}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{record.company_name || "-"}</td>
                          <td className="px-4 py-3">
                            <select
                              value={record.status || "present"}
                              onChange={(event) =>
                                updateAttendanceStatus(record.employee_id, event.target.value as AttendanceStatus)
                              }
                              className="form-input py-2 min-w-[130px] text-sm"
                            >
                              <option value="present">Present</option>
                              <option value="late">Retard</option>
                              <option value="absent">Absent</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={record.notes || ""}
                              onChange={(event) => updateAttendanceNotes(record.employee_id, event.target.value)}
                              className="form-input py-2 text-sm"
                              placeholder="Optionnel"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => void saveAttendance()}
                  disabled={isSavingAttendance}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  {isSavingAttendance ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Enregistrer
                </button>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
