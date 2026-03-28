"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  FileText,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";

import { deleteMyApplication, getMyApplications } from "@/lib/applications";
import type { Application } from "@/types/application";
import { APPLICATION_STATUS_LABELS } from "@/types/application";

function getStatusClasses(status: string) {
  if (["pending", "submitted", "under_review"].includes(status)) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
  }
  if (status === "rejected") {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  }
  if (["additional_info_required", "additional_info_requested"].includes(status)) {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  }
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

export default function CompanyApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    async function loadApplications() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getMyApplications();
        setApplications(response.applications || []);
      } catch (err) {
        console.error("Error loading company applications:", err);
        setError("Impossible de charger les candidatures");
      } finally {
        setIsLoading(false);
      }
    }

    void loadApplications();
  }, []);

  const filteredApplications = useMemo(() => {
    let next = [...applications];

    if (statusFilter !== "all") {
      next = next.filter((app) => app.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      next = next.filter((app) => {
        const title = app.call?.title?.toLowerCase() || "";
        const reference = app.call?.reference_number?.toLowerCase() || "";
        const department = app.call?.department?.toLowerCase() || "";
        return title.includes(query) || reference.includes(query) || department.includes(query);
      });
    }

    return next;
  }, [applications, searchQuery, statusFilter]);

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

  const statusOptions = [
    { value: "all", label: "Tous les statuts" },
    { value: "pending", label: "En attente" },
    { value: "submitted", label: "Soumise" },
    { value: "under_review", label: "En cours d'examen" },
    { value: "additional_info_required", label: "Infos requises" },
    { value: "approved", label: "Approuvée" },
    { value: "rejected", label: "Rejetée" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-display text-2xl text-foreground">Mes candidatures</h1>
          <p className="text-muted-foreground">Suivez toutes vos candidatures et leur statut.</p>
        </div>
        <Link href="/dashboard" className="btn-secondary w-full sm:w-auto text-center">
          Retour dashboard
        </Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre, reference ou departement"
            className="form-input h-11 pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-input h-11"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[280px]">
          <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center bg-card">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-foreground font-medium">Aucune candidature trouvee</p>
          <p className="text-sm text-muted-foreground mt-1">
            Essayez un autre filtre ou deposez une nouvelle candidature depuis les appels ouverts.
          </p>
          <Link href="/" className="mt-4 inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 hover:underline">
            Voir les appels
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {filteredApplications.map((app) => {
              const statusLabel = APPLICATION_STATUS_LABELS[app.status as keyof typeof APPLICATION_STATUS_LABELS] || app.status;
              return (
                <div key={app.id} className="p-4 sm:p-5 hover:bg-muted/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {app.call?.title || `Candidature #${app.id}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {app.call?.reference_number ? `Reference: ${app.call.reference_number}` : `Appel #${app.call_id}`}
                        {app.call?.department ? ` - ${app.call.department}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {app.submitted_at
                          ? `Soumise le ${new Date(app.submitted_at).toLocaleDateString("fr-FR")}`
                          : "Date de soumission indisponible"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusClasses(app.status)}`}>
                        {statusLabel}
                      </span>

                      {app.status !== "approved" && (
                        <button
                          onClick={() => handleDeleteApplication(app.id)}
                          disabled={deletingId === app.id}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                          title="Supprimer la candidature"
                        >
                          {deletingId === app.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
