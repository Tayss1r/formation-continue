"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle, ChevronRight, Clock, FileText, Plus, Upload } from "lucide-react";
import { createSubmission, getAvailableSubmissions, getMySubmissions } from "@/lib/submissions";
import type { AvailableSubmission, Submission } from "@/types/submission";
import { SUBMISSION_STATUS_COLORS, SUBMISSION_STATUS_LABELS } from "@/types/submission";

export default function EmployeeSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [available, setAvailable] = useState<AvailableSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingFor, setCreatingFor] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    setError(null);
    try {
      const [submissionsData, availableData] = await Promise.all([
        getMySubmissions(),
        getAvailableSubmissions(),
      ]);
      setSubmissions(submissionsData.submissions || []);
      setAvailable(availableData.available || []);
    } catch (err: any) {
      setError(err?.message || "Erreur lors du chargement des soumissions");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateSubmission(applicationId: number) {
    setCreatingFor(applicationId);
    setError(null);
    try {
      const created = await createSubmission({ company_application_id: applicationId });
      window.location.href = `/employee/submissions/${created.submission.id}`;
    } catch (err: any) {
      setError(err?.message || "Impossible de créer la soumission");
    } finally {
      setCreatingFor(null);
    }
  }

  const assignedFormations = available;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-display text-2xl text-foreground">Mes Soumissions</h1>
        <p className="text-muted-foreground">Créez votre soumission puis téléversez les documents requis.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary-500" />
          Formations disponibles
        </h2>

        {isLoading ? (
          <div className="h-24 bg-muted rounded-xl animate-pulse" />
        ) : assignedFormations.length === 0 ? (
          <p className="text-muted-foreground">Aucune formation disponible pour votre profil.</p>
        ) : (
          <div className="space-y-3">
            {assignedFormations.map((item) => (
              <div key={item.application_id} className="flex items-center justify-between p-4 rounded-xl border border-border">
                <div>
                  <p className="font-medium text-foreground">{item.call_title}</p>
                  <p className="text-sm text-muted-foreground">{item.call_reference} • {item.department}</p>
                </div>
                {item.has_submitted && item.submission_id ? (
                  <Link
                    href={`/employee/submissions/${item.submission_id}`}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Continuer
                  </Link>
                ) : (
                  <button
                    onClick={() => handleCreateSubmission(item.application_id)}
                    disabled={creatingFor === item.application_id}
                    className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {creatingFor === item.application_id ? "Création..." : "Commencer"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-500" />
          Mes soumissions existantes
        </h2>

        {isLoading ? (
          <div className="h-24 bg-muted rounded-xl animate-pulse" />
        ) : submissions.length === 0 ? (
          <p className="text-muted-foreground">Aucune soumission créée pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => {
              const status = sub.status;
              const color = SUBMISSION_STATUS_COLORS[status] || "gray";
              const label = SUBMISSION_STATUS_LABELS[status] || status;
              return (
                <Link
                  key={sub.id}
                  href={`/employee/submissions/${sub.id}`}
                  className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/40 transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">{sub.application?.call?.title || `Soumission #${sub.id}`}</p>
                    <p className="text-sm text-muted-foreground">{sub.application?.call?.reference_number || "Référence indisponible"}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-${color}-100 text-${color}-700 dark:bg-${color}-500/20 dark:text-${color}-300`}>
                      {status === "approved" && <CheckCircle className="w-3 h-3" />}
                      {status === "pending" && <Clock className="w-3 h-3" />}
                      {label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
