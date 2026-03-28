"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Building2,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Send,
  Trash2,
  Newspaper,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { deleteMyApplication, getMyApplications } from "@/lib/applications";
import { getActiveCalls } from "@/lib/calls";
import type { Application } from "@/types/application";
import type { CallPublic } from "@/types/call";
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUS_COLORS } from "@/types/application";

export default function CompanyDashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeCalls, setActiveCalls] = useState<CallPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [applicationsData, callsData] = await Promise.all([
          getMyApplications(),
          getActiveCalls(),
        ]);
        setApplications(applicationsData.applications || []);
        setActiveCalls(callsData.calls || []);
      } catch (err) {
        console.error("Error loading dashboard:", err);
        setError("Impossible de charger les données du tableau de bord");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthLoading]);

  const stats = [
    {
      label: "Candidatures totales",
      value: applications.length,
      icon: FileText,
      color: "from-primary-500 to-primary-600",
    },
    {
      label: "En attente",
      value: applications.filter((a) => ["pending", "submitted", "under_review"].includes(a.status)).length,
      icon: Clock,
      color: "from-amber-500 to-orange-500",
    },
    {
      label: "Approuvées",
      value: applications.filter((a) => a.status === "approved").length,
      icon: CheckCircle2,
      color: "from-green-500 to-emerald-500",
    },
    {
      label: "Appels ouverts",
      value: activeCalls.length,
      icon: Send,
      color: "from-blue-500 to-cyan-500",
    },
  ];

  async function handleDeleteApplication(applicationId: number) {
    const confirmed = window.confirm("Supprimer cette candidature ?");
    if (!confirmed) return;

    setDeletingId(applicationId);
    setError(null);
    try {
      await deleteMyApplication(applicationId);
      setApplications((prev) => prev.filter((app) => app.id !== applicationId));
    } catch (err) {
      console.error("Error deleting application:", err);
      setError("Impossible de supprimer cette candidature");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-900/30">
            <Building2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="heading-display text-2xl lg:text-3xl text-foreground">
              Tableau de Bord
            </h1>
            <p className="text-muted-foreground">
              Bienvenue, {user?.first_name || "Entreprise"}
            </p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
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

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="relative overflow-hidden rounded-2xl bg-card border border-border p-5"
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

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Applications */}
            <div className="lg:col-span-2 rounded-2xl bg-card border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary-500" />
                  Mes candidatures récentes
                </h2>
                <Link
                  href="/dashboard/applications"
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                >
                  Voir tout
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {applications.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    Aucune candidature pour le moment
                  </p>
                  <Link
                    href="/"
                    className="mt-4 inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Voir les appels ouverts
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.slice(0, 5).map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="font-medium text-foreground truncate">
                          {app.call?.title || `Candidature #${app.id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {app.call?.reference_number
                            ? `Référence: ${app.call.reference_number}`
                            : `Appel #${app.call_id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {app.submitted_at
                            ? `Soumise le ${new Date(app.submitted_at).toLocaleDateString("fr-FR")}`
                            : "Date de soumission indisponible"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            APPLICATION_STATUS_COLORS[app.status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {APPLICATION_STATUS_LABELS[app.status] || app.status}
                        </span>
                        {app.status !== "approved" && (
                          <button
                            onClick={() => handleDeleteApplication(app.id)}
                            disabled={deletingId === app.id}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                            title="Supprimer la candidature"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Calls */}
            <div className="rounded-2xl bg-card border border-border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary-500" />
                  Appels ouverts
                </h2>
              </div>

              {activeCalls.length === 0 ? (
                <div className="text-center py-8">
                  <Send className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    Aucun appel ouvert
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeCalls.slice(0, 4).map((call) => (
                    <Link
                      key={call.id}
                      href={`/calls/${call.id}`}
                      className="block p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                    >
                      <p className="font-medium text-foreground text-sm truncate">
                        {call.title}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {call.department_display}
                        </span>
                        {call.days_remaining !== undefined && (
                          <span
                            className={`text-xs font-medium ${
                              call.days_remaining <= 3
                                ? "text-red-500"
                                : call.days_remaining <= 7
                                ? "text-amber-500"
                                : "text-muted-foreground"
                            }`}
                          >
                            {call.days_remaining} jours
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <Link
                href="/"
                className="mt-4 block text-center text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Voir tous les appels
              </Link>
            </div>

            <div className="lg:col-span-3 rounded-2xl bg-card border border-border p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Newspaper className="w-5 h-5 text-primary-500" />
                    Résultats publiés
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Une fois validés par le coordinateur, les résultats (entreprises et employés admis) sont publiés dans les actualités avec un fichier téléchargeable.
                  </p>
                </div>
                <Link href="/#news" className="btn-secondary whitespace-nowrap">
                  Voir les actualités
                </Link>
              </div>
            </div>

            <div className="lg:col-span-3 rounded-2xl bg-card border border-border p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Présences et Agenda</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Consultez les détails des présences des employés et l'agenda des échéances sur une page dédiée.
                  </p>
                </div>
                <Link href="/dashboard/attendance-agenda" className="btn-secondary whitespace-nowrap">
                  Ouvrir la page
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
