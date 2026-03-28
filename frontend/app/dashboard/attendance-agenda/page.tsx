"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Send,
} from "lucide-react";

import { getMyApplications, getMyAttendanceSummary } from "@/lib/applications";
import { getActiveCalls } from "@/lib/calls";
import type { Application, CompanyAttendanceEmployee } from "@/types/application";
import type { CallPublic } from "@/types/call";

function toDeadlineLabel(deadline: string) {
  return new Date(deadline).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CompanyAttendanceAgendaPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeCalls, setActiveCalls] = useState<CallPublic[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<CompanyAttendanceEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const [applicationsData, callsData, attendanceData] = await Promise.all([
          getMyApplications(),
          getActiveCalls(),
          getMyAttendanceSummary(),
        ]);

        setApplications(applicationsData.applications || []);
        setActiveCalls(callsData.calls || []);
        setAttendanceSummary(attendanceData.attendance || []);
      } catch (err) {
        console.error("Error loading attendance agenda page:", err);
        setError("Impossible de charger les donnees de presences et agenda");
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, []);

  const agendaItems = useMemo(() => {
    return activeCalls
      .map((call) => ({
        id: call.id,
        title: call.title,
        reference: call.reference_number,
        department: call.department_display,
        deadline: call.application_deadline,
        daysRemaining: call.days_remaining,
      }))
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
  }, [activeCalls]);

  function formatList(items: string[]) {
    if (!items || items.length === 0) {
      return <span className="text-xs text-muted-foreground">-</span>;
    }
    return (
      <div className="space-y-1">
        {items.map((item) => (
          <p key={item} className="text-xs text-foreground">{item}</p>
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="heading-display text-2xl text-foreground">Presences et Agenda</h1>
          <p className="text-muted-foreground">Vue detaillee des presences des employes et des echeances d'appels.</p>
        </div>
        <Link href="/dashboard" className="btn-secondary">Retour dashboard</Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-2xl bg-card border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary-500" />
                Presences des employes
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Taux de presence calcule sur les sessions marquees (Present + Retard).
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              {attendanceSummary.length} employe{attendanceSummary.length > 1 ? "s" : ""}
            </span>
          </div>

          {attendanceSummary.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">Aucune donnee de presence disponible pour le moment.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="max-h-[460px] overflow-y-auto">
                <table className="w-full min-w-[1120px]">
                  <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border">
                    <tr>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Employe</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Formation(s)</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Cohorte(s)</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Session(s)</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Present</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Retard</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Absent</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Sessions</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceSummary.map((row) => (
                      <tr key={row.employee_id} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 align-top">
                          <p className="text-sm font-medium text-foreground">{row.employee_name}</p>
                          <p className="text-xs text-muted-foreground">{row.employee_email}</p>
                        </td>
                        <td className="px-4 py-3 align-top">{formatList(row.course_titles)}</td>
                        <td className="px-4 py-3 align-top">{formatList(row.cohort_titles)}</td>
                        <td className="px-4 py-3 align-top">{formatList(row.session_titles)}</td>
                        <td className="px-4 py-3 text-sm text-emerald-600">{row.present_count}</td>
                        <td className="px-4 py-3 text-sm text-amber-600">{row.late_count}</td>
                        <td className="px-4 py-3 text-sm text-red-600">{row.absent_count}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{row.total_sessions_marked}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                              row.presence_percentage >= 85
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : row.presence_percentage >= 60
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            }`}
                          >
                            {row.presence_percentage.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-card border border-border p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
            <CalendarClock className="w-5 h-5 text-primary-500" />
            Agenda
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Echeances des appels ouverts pour suivre vos priorites de depot.
          </p>

          {agendaItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">Aucun appel actif dans l'agenda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agendaItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-border p-3 bg-muted/20">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.reference} - {item.department}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Deadline: {toDeadlineLabel(item.deadline)}</span>
                    {typeof item.daysRemaining === "number" && (
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium ${
                          item.daysRemaining <= 3
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            : item.daysRemaining <= 7
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        }`}
                      >
                        J-{item.daysRemaining}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 rounded-xl border border-border p-4 bg-card/80">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Candidatures approuvees
            </h3>
            <p className="text-2xl font-bold text-foreground mt-2">
              {applications.filter((app) => app.status === "approved").length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Dossiers valides pouvant alimenter la phase de formation.
            </p>
            <Link href="/dashboard/applications" className="mt-3 inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline">
              Voir les candidatures
              <Send className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
