"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  BookOpen,
  Users,
  ClipboardList,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  BarChart3,
  Activity,
  Building2,
  Eye,
  Download,
  Send,
  Loader2,
  CalendarClock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboard, getPendingReviews, getRecentActivity, getAnalytics, getMyCalls } from "@/lib/coordinator";
import { getCallApplications } from "@/lib/applications";
import { downloadResultsFile, publishResultsAsNews } from "@/lib/invitations";
import { StatCard, StatusBadge, CardSkeleton, EmptyState } from "@/components/coordinator/CoordinatorUI";
import type { DashboardStats, PendingReviewItem, RecentActivityItem, AnalyticsData } from "@/types/coordinator";
import { ACTION_LABELS, ENTITY_TYPE_LABELS, formatActivityLabel } from "@/types/coordinator";

interface DashboardResultCall {
  id: number;
  title: string;
  reference_number: string;
  status: string;
  approved_companies: number;
}

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pendingItems, setPendingItems] = useState<PendingReviewItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [resultCalls, setResultCalls] = useState<DashboardResultCall[]>([]);
  const [isResultsLoading, setIsResultsLoading] = useState(true);
  const [generatingCallId, setGeneratingCallId] = useState<number | null>(null);
  const [publishingCallId, setPublishingCallId] = useState<number | null>(null);
  const [generatedCalls, setGeneratedCalls] = useState<Record<number, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const [dashboardRes, pendingRes, activityRes, analyticsRes] = await Promise.all([
          getDashboard(),
          getPendingReviews(10),
          getRecentActivity(7, 10),
          getAnalytics(30),
        ]);

        setStats(dashboardRes.stats);
        setPendingItems(pendingRes.items);
        setRecentActivity(activityRes.activities);
        setAnalytics(analyticsRes.data);
        await fetchResultsWorkflowData();
      } catch (err) {
        console.error("Error loading dashboard:", err);
        setError("Erreur lors du chargement du tableau de bord");
      } finally {
        setIsLoading(false);
      }
  }

  async function fetchResultsWorkflowData() {
    setIsResultsLoading(true);
    try {
      const callsRes = await getMyCalls();
      const eligible = callsRes.calls.filter((c) =>
        ["published", "closed", "under_review", "results_published"].includes(c.status)
      );

      const resultData = await Promise.all(
        eligible.map(async (call) => {
          try {
            const apps = await getCallApplications(call.id, "approved");
            return {
              id: call.id,
              title: call.title,
              reference_number: call.reference_number,
              status: call.status,
              approved_companies: apps.applications.length,
            } as DashboardResultCall;
          } catch {
            return {
              id: call.id,
              title: call.title,
              reference_number: call.reference_number,
              status: call.status,
              approved_companies: 0,
            } as DashboardResultCall;
          }
        })
      );

      setResultCalls(resultData);
      setGeneratedCalls(
        resultData.reduce<Record<number, boolean>>((acc, item) => {
          acc[item.id] = item.status === "results_published";
          return acc;
        }, {})
      );
    } finally {
      setIsResultsLoading(false);
    }
  }

  async function handleGenerateResults(callId: number) {
    setGeneratingCallId(callId);
    setError(null);
    try {
      await downloadResultsFile(callId, "pdf");
      setGeneratedCalls((prev) => ({ ...prev, [callId]: true }));
    } catch {
      setError("Erreur lors de la génération du fichier de résultats");
    } finally {
      setGeneratingCallId(null);
    }
  }

  async function handlePublishResults(callId: number) {
    setPublishingCallId(callId);
    setError(null);
    try {
      await publishResultsAsNews(callId);
      await fetchResultsWorkflowData();
    } catch {
      setError("Erreur lors de la publication des résultats");
    } finally {
      setPublishingCallId(null);
    }
  }

  // Calculate stats display
  const statCards = stats ? [
    {
      title: "Total Appels",
      value: stats.calls.total,
      icon: <FileText className="w-6 h-6 text-primary-500" />,
      trend: `${stats.calls.published} publiés`,
    },
    {
      title: "Appels Actifs",
      value: stats.calls.published,
      icon: <TrendingUp className="w-6 h-6 text-green-500" />,
      trend: stats.calls.under_review > 0 ? `${stats.calls.under_review} en examen` : undefined,
    },
    {
      title: "Candidatures Reçues",
      value: stats.applications.total,
      icon: <ClipboardList className="w-6 h-6 text-blue-500" />,
      trend: `${stats.applications.pending + stats.applications.submitted} en attente`,
    },
    {
      title: "Entreprises Approuvées",
      value: stats.applications.approved,
      icon: <Building2 className="w-6 h-6 text-emerald-500" />,
      trend: analytics ? `${analytics.approval_rate.toFixed(0)}% taux d'approbation` : undefined,
      trendUp: true,
    },
  ] : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded w-64 animate-pulse" />
            <div className="h-4 bg-muted rounded w-48 animate-pulse" />
          </div>
          <div className="h-12 bg-muted rounded w-40 animate-pulse" />
        </div>
        
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        
        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-muted rounded-2xl animate-pulse" />
          <div className="h-80 bg-muted rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-display text-2xl text-foreground">
            Tableau de Bord Coordinateur
          </h1>
          <p className="text-muted-foreground">
            Bienvenue, {user?.first_name || "Coordinateur"}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Link
            href="/coordinator/courses"
            className="btn-secondary inline-flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <BookOpen className="w-4 h-4" />
            Creer / Modifier Formation
          </Link>
          <Link
            href="/coordinator/calls/new"
            className="btn-primary inline-flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            Nouvel Appel
          </Link>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={fetchData}
            className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <Link
          href="/coordinator/calls/new"
          className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
        >
          <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30">
            <Plus className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Créer un appel</p>
            <p className="text-sm text-muted-foreground">
              Nouvel appel à candidatures
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>

        <Link
          href="/coordinator/courses"
          className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
        >
          <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
            <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Creer / modifier une formation</p>
            <p className="text-sm text-muted-foreground">
              Mettre a jour les informations + publier sur /courses
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>

        <Link
          href="/coordinator/applications"
          className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
        >
          <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
            <ClipboardList className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Examiner candidatures</p>
            <p className="text-sm text-muted-foreground">
              {stats?.applications.under_review || 0} en attente d'examen
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>

        <Link
          href="/coordinator/results"
          className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
        >
          <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Générer & publier résultats</p>
            <p className="text-sm text-muted-foreground">
              Fichier PDF + actualité publique
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>

        <Link
          href="/coordinator/cohorts"
          className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
        >
          <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <CalendarClock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Cohorts</p>
            <p className="text-sm text-muted-foreground">
              Creer un cohort et assigner des professeurs
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>
      </div>

      {/* Step 6/7 Results Workflow */}
      <div className="card-elevated p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Génération & publication des résultats</h2>
          <Link
            href="/coordinator/results"
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            Ouvrir la page dédiée
          </Link>
        </div>

        {isResultsLoading ? (
          <div className="h-24 bg-muted rounded-xl animate-pulse" />
        ) : resultCalls.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun appel éligible pour la génération/publication des résultats.</p>
        ) : (
          <div className="space-y-3">
            {resultCalls.map((call) => {
              const isPublished = call.status === "results_published";
              const canPublish = !isPublished && generatedCalls[call.id] && call.approved_companies > 0;
              const isGeneratingThis = generatingCallId === call.id;
              return (
                <div key={call.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">{call.reference_number}</p>
                      <p className="font-medium text-foreground">{call.title}</p>
                      <p className="text-xs text-muted-foreground">Entreprises admises: {call.approved_companies}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleGenerateResults(call.id)}
                        disabled={Boolean(isGeneratingThis) || publishingCallId === call.id || call.approved_companies === 0}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {isGeneratingThis ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        PDF
                      </button>
                      <button
                        onClick={() => handlePublishResults(call.id)}
                        disabled={!canPublish || publishingCallId === call.id || Boolean(isGeneratingThis)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {publishingCallId === call.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        {isPublished ? "Déjà publié" : "Publier résultats"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Reviews */}
        <div className="card-elevated p-3.5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-500" />
              En attente d'examen
            </h2>
            <Link
              href="/coordinator/applications"
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              Voir tout
            </Link>
          </div>

          {pendingItems.length === 0 ? (
            <div className="py-5 text-center text-muted-foreground text-sm">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>Aucun élément en attente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingItems.slice(0, 3).map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.type === 'application' 
                    ? `/coordinator/applications/${item.id}` 
                    : `/coordinator/submissions/${item.id}`
                  }
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className={`p-2 rounded-lg ${
                    item.type === 'application' 
                      ? 'bg-blue-100 dark:bg-blue-900/30' 
                      : 'bg-purple-100 dark:bg-purple-900/30'
                  }`}>
                    {item.type === 'application' ? (
                      <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.type === 'application' ? 'Candidature entreprise' : 'Soumission employé'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.submitted_at 
                        ? new Date(item.submitted_at).toLocaleDateString('fr-FR')
                        : 'Date inconnue'
                      }
                    </p>
                  </div>
                  <StatusBadge status={item.status} size="sm" />
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card-elevated p-3.5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-500" />
              Activité récente
            </h2>
            <Link
              href="/coordinator/activity"
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              Voir tout
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <div className="py-5 text-center text-muted-foreground text-sm">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucune activité récente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.slice(0, 3).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium">
                      {formatActivityLabel(activity.action, activity.entity_type)}
                    </p>
                    {activity.entity_name && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate font-medium">
                        {activity.entity_name}
                      </p>
                    )}
                    {activity.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {activity.notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.user_name && <span className="mr-1">· {activity.user_name}</span>}
                      {new Date(activity.created_at).toLocaleString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Analytics Summary */}
      {analytics && (
        <div className="card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-500" />
              Statistiques (30 derniers jours)
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{analytics.total_calls}</p>
              <p className="text-sm text-muted-foreground">Appels créés</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{analytics.total_applications}</p>
              <p className="text-sm text-muted-foreground">Candidatures</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-500">
                {analytics.approval_rate.toFixed(0)}%
              </p>
              <p className="text-sm text-muted-foreground">Taux d'approbation</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">
                {Object.keys(analytics.calls_by_department).length}
              </p>
              <p className="text-sm text-muted-foreground">Départements actifs</p>
            </div>
          </div>

          {/* Applications by Status */}
          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Candidatures par statut</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(analytics.applications_by_status).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <StatusBadge status={status} size="sm" />
                  <span className="text-sm font-medium text-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
