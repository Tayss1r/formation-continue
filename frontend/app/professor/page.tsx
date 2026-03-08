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
} from "lucide-react";
import { getProfessorDashboard } from "@/lib/professor";
import { getImageUrl } from "@/lib/config";
import type { ProfessorDashboard } from "@/types/professor";

export default function ProfessorDashboardPage() {
  const [dashboard, setDashboard] = useState<ProfessorDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const data = await getProfessorDashboard();
        setDashboard(data);
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
    </div>
  );
}
