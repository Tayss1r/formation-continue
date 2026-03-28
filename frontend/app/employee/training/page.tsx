"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

import {
  getEmployeeTrainingCalendar,
  type EmployeeTrainingSession,
} from "@/lib/employeeTraining";

export default function EmployeeTrainingPage() {
  const [sessions, setSessions] = useState<EmployeeTrainingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const calendarRes = await getEmployeeTrainingCalendar();
        setSessions(calendarRes.sessions);
      } catch (err) {
        console.error("Failed to load employee training:", err);
        setError("Impossible de charger votre espace de formation");
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, []);

  const sessionsByDate = useMemo(() => {
    return sessions.reduce((acc, session) => {
      const key = session.session_date;
      if (!acc[key]) acc[key] = [];
      acc[key].push(session);
      return acc;
    }, {} as Record<string, EmployeeTrainingSession[]>);
  }, [sessions]);

  const cohortColorById = useMemo(() => {
    const palette = [
      "bg-blue-100 text-blue-700",
      "bg-red-100 text-red-700",
      "bg-violet-100 text-violet-700",
      "bg-green-100 text-green-700",
      "bg-amber-100 text-amber-700",
      "bg-cyan-100 text-cyan-700",
    ];

    const map: Record<number, string> = {};
    let index = 0;
    for (const session of sessions) {
      if (!(session.cohort_id in map)) {
        map[session.cohort_id] = palette[index % palette.length];
        index += 1;
      }
    }
    return map;
  }, [sessions]);

  const calendarCells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const firstWeekday = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(year, month, 1 - firstWeekday);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return {
        date,
        isoDate,
        inCurrentMonth: date.getMonth() === month,
      };
    });
  }, [currentMonth]);

  const miniMonthCells = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: 42 }, (_, i) => {
      const dayNumber = i - firstWeekday + 1;
      if (dayNumber < 1 || dayNumber > daysInMonth) return null;
      return dayNumber;
    });
  }, [currentMonth]);

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
        <h1 className="heading-display text-2xl text-foreground">My Training</h1>
        <p className="text-muted-foreground">
          Consultez votre calendrier de sessions et les documents de vos cohorts.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <section className="card-elevated overflow-hidden">
        <div className="flex items-center gap-2 px-6 pt-6 pb-4 border-b border-border">
          <CalendarDays className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-foreground">Calendar</h2>
        </div>

        {sessions.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-muted-foreground">Aucune session planifiee pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr]">
            <aside className="border-r border-border bg-muted/20 p-4 space-y-5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                  aria-label="Mois precedent"
                >
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <p className="text-sm font-semibold text-foreground">
                  {currentMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                  aria-label="Mois suivant"
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div>
                <div className="grid grid-cols-7 text-[11px] text-muted-foreground mb-2">
                  {["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"].map((day) => (
                    <span key={day} className="text-center">{day}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {miniMonthCells.map((day, index) => {
                    const today = new Date();
                    const isToday =
                      day !== null &&
                      today.getFullYear() === currentMonth.getFullYear() &&
                      today.getMonth() === currentMonth.getMonth() &&
                      today.getDate() === day;
                    return (
                      <span
                        key={`${day ?? "empty"}-${index}`}
                        className={`h-7 rounded-md flex items-center justify-center ${
                          day === null
                            ? "text-transparent"
                            : isToday
                            ? "bg-primary-100 text-primary-700 font-semibold"
                            : "text-foreground"
                        }`}
                      >
                        {day ?? "."}
                      </span>
                    );
                  })}
                </div>
              </div>
            </aside>

            <div className="overflow-x-auto">
              <div className="min-w-[820px]">
                <div className="grid grid-cols-7 border-b border-border bg-muted/10">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                    <div key={day} className="px-3 py-2 text-sm font-medium text-muted-foreground border-r border-border last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {calendarCells.map((cell) => {
                    const daySessions = sessionsByDate[cell.isoDate] || [];
                    return (
                      <div
                        key={cell.isoDate}
                        className={`h-24 border-r border-b border-border px-2 py-1.5 overflow-hidden ${
                          cell.inCurrentMonth ? "bg-card" : "bg-muted/20"
                        }`}
                      >
                        <p className={`text-xs mb-1 ${cell.inCurrentMonth ? "text-foreground" : "text-muted-foreground/70"}`}>
                          {cell.date.getDate()}
                        </p>
                        <div className="space-y-1">
                          {daySessions.slice(0, 2).map((session) => (
                            <div
                              key={session.id}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium truncate ${cohortColorById[session.cohort_id] || "bg-gray-100 text-gray-700"}`}
                              title={`${session.title} (${session.start_time}-${session.end_time})`}
                            >
                              {session.start_time}-{session.end_time} {session.title}
                            </div>
                          ))}
                          {daySessions.length > 2 && (
                            <p className="text-[10px] text-muted-foreground px-1">+{daySessions.length - 2} more</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
