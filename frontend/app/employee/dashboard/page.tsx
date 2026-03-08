"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  User,
  Send,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getMySubmissions, getAvailableSubmissions } from "@/lib/submissions";
import type { Submission, AvailableSubmission } from "@/types/submission";
import { SUBMISSION_STATUS_LABELS, SUBMISSION_STATUS_COLORS } from "@/types/submission";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [availableSubmissions, setAvailableSubmissions] = useState<AvailableSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const [submissionsData, availableData] = await Promise.all([
          getMySubmissions(),
          getAvailableSubmissions(),
        ]);
        setSubmissions(submissionsData.submissions || []);
        setAvailableSubmissions(availableData.available || []);
      } catch (err) {
        console.error("Error loading dashboard:", err);
        setError("Erreur lors du chargement des données");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Calculate stats
  const totalSubmissions = submissions.length;
  const pendingSubmissions = submissions.filter(s => ["pending", "submitted"].includes(s.status)).length;
  const approvedSubmissions = submissions.filter(s => s.status === "approved").length;
  const availableCount = availableSubmissions.filter(a => !a.has_submitted).length;

  // Stats cards data
  const stats = [
    {
      label: "Mes Soumissions",
      value: totalSubmissions,
      icon: FileText,
      color: "from-primary-500 to-primary-600",
    },
    {
      label: "En attente",
      value: pendingSubmissions,
      icon: Clock,
      color: "from-amber-500 to-orange-500",
    },
    {
      label: "Approuvées",
      value: approvedSubmissions,
      icon: CheckCircle,
      color: "from-green-500 to-emerald-500",
    },
    {
      label: "Formations disponibles",
      value: availableCount,
      icon: Send,
      color: "from-blue-500 to-cyan-500",
      highlight: availableCount > 0,
    },
  ];

  const getStatusBadge = (status: string) => {
    const color = SUBMISSION_STATUS_COLORS[status as keyof typeof SUBMISSION_STATUS_COLORS] || "gray";
    const label = SUBMISSION_STATUS_LABELS[status as keyof typeof SUBMISSION_STATUS_LABELS] || status;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-${color}-100 text-${color}-700 dark:bg-${color}-500/20 dark:text-${color}-400`}>
        {status === "approved" && <CheckCircle className="w-3 h-3" />}
        {status === "rejected" && <XCircle className="w-3 h-3" />}
        {status === "pending" && <Clock className="w-3 h-3" />}
        {label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-900/30">
            <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="heading-display text-2xl text-foreground">
              Tableau de Bord Employé
            </h1>
            <p className="text-muted-foreground">
              Bienvenue, {user?.first_name || "Employé"}
            </p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`relative overflow-hidden rounded-2xl bg-card border p-5 ${
              stat.highlight
                ? "border-primary-200 dark:border-primary-800"
                : "border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
              <div
                className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} text-white`}
              >
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Available Submissions */}
      {availableCount > 0 && (
        <div className="rounded-2xl bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Send className="w-5 h-5 text-primary-500" />
              Formations disponibles pour vous
            </h2>
            <span className="text-sm text-primary-600 dark:text-primary-400">
              {availableCount} formation(s) disponible(s)
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {availableSubmissions
              .filter(a => !a.has_submitted)
              .slice(0, 4)
              .map((available) => (
                <Link
                  key={available.application_id}
                  href={`/employee/submit/${available.application_id}`}
                  className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-800 border border-border hover:border-primary-300 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {available.call_title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {available.department}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* Recent Submissions */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            Mes soumissions récentes
          </h2>
          <Link
            href="/employee/submissions"
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            Voir tout
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-4">
              Vous n'avez aucune soumission pour le moment
            </p>
            {availableCount > 0 && (
              <p className="text-sm text-primary-600">
                Consultez les formations disponibles ci-dessus
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.slice(0, 5).map((submission) => (
              <Link
                key={submission.id}
                href={`/employee/submissions/${submission.id}`}
                className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {submission.call?.title || `Soumission #${submission.id}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {submission.call?.department || `Application #${submission.application_id}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(submission.status)}
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
