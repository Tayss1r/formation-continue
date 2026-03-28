"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarCheck2, Loader2, MapPin } from "lucide-react";

import {
  getEmployeeAttendanceHistory,
  type EmployeeAttendanceHistoryItem,
  type EmployeeAttendanceStatus,
} from "@/lib/employeeTraining";

const statusMeta: Record<EmployeeAttendanceStatus, { label: string; className: string }> = {
  present: {
    label: "Présent",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  absent: {
    label: "Absent",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  late: {
    label: "En retard",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
};

export default function EmployeeAttendancePage() {
  const [items, setItems] = useState<EmployeeAttendanceHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getEmployeeAttendanceHistory();
        setItems(response.attendance);
      } catch (err) {
        console.error("Failed to load attendance history:", err);
        setError("Impossible de charger votre historique de présence");
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, []);

  const summary = useMemo(() => {
    const present = items.filter((item) => item.status === "present").length;
    const absent = items.filter((item) => item.status === "absent").length;
    const late = items.filter((item) => item.status === "late").length;
    return { present, absent, late, total: items.length };
  }, [items]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-display text-2xl text-foreground">Historique de Présence</h1>
        <p className="text-muted-foreground">Consultez vos présences marquées par session de formation.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card-elevated p-4">
          <p className="text-xs text-muted-foreground">Total Sessions Marquées</p>
          <p className="text-2xl font-bold text-foreground mt-1">{summary.total}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-xs text-muted-foreground">Présent</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{summary.present}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-xs text-muted-foreground">En retard</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{summary.late}</p>
        </div>
        <div className="card-elevated p-4">
          <p className="text-xs text-muted-foreground">Absent</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{summary.absent}</p>
        </div>
      </section>

      <section className="card-elevated overflow-hidden">
        <div className="flex items-center gap-2 px-6 pt-6 pb-4 border-b border-border">
          <CalendarCheck2 className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-foreground">Sessions</h2>
        </div>

        {items.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-muted-foreground">Aucune présence marquée pour le moment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Session</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Cohort</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Professeur</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Statut</th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">Marqué le</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`${item.session_id}-${item.marked_at}`} className="border-b border-border/70 hover:bg-muted/20">
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm font-medium text-foreground">{item.session_title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.session_date} | {item.start_time} - {item.end_time}
                      </p>
                      {item.location && (
                        <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm text-foreground">{item.cohort_name}</p>
                      <p className="text-xs text-muted-foreground">{item.course_title}</p>
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-foreground">{item.professor_name}</td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          statusMeta[item.status]?.className || "bg-muted text-muted-foreground"
                        }`}
                      >
                        {statusMeta[item.status]?.label || item.status}
                      </span>
                      {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
                    </td>
                    <td className="px-4 py-3 align-top text-sm text-muted-foreground">
                      {new Date(item.marked_at).toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
