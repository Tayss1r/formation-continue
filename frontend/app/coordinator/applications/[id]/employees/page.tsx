"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  UserCheck,
  UserX,
  Mail,
  FileText,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  AlertCircle,
  Send,
  Loader2,
} from "lucide-react";
import {
  getApplicationEmployees,
  approveEmployeeSubmission,
  rejectEmployeeSubmission,
  downloadResultsFile,
  publishResultsAsNews,
} from "@/lib/invitations";
import type {
  ApplicationEmployeesData,
  EmployeeSubmissionInfo,
} from "@/types/invitation";
import { UPLOADS_BASE_URL } from "@/lib/config";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    pending: { label: "En attente", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    submitted: { label: "Soumise", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    approved: { label: "Approuvé", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    rejected: { label: "Rejeté", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    under_review: { label: "En cours", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  };
  const item = map[status] || { label: status, color: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${item.color}`}>
      {status === "approved" && <CheckCircle className="w-3 h-3" />}
      {status === "rejected" && <XCircle className="w-3 h-3" />}
      {status === "pending" && <Clock className="w-3 h-3" />}
      {item.label}
    </span>
  );
}

export default function ApplicationEmployeesPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = Number(params.id);

  const [data, setData] = useState<ApplicationEmployeesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [isGeneratingResults, setIsGeneratingResults] = useState(false);
  const [isPublishingResults, setIsPublishingResults] = useState(false);
  const [hasGeneratedResults, setHasGeneratedResults] = useState(false);

  // Action dialog
  const [actionDialog, setActionDialog] = useState<{
    type: "approve" | "reject";
    submissionId: number;
    employeeName: string;
    notes: string;
  } | null>(null);

  useEffect(() => {
    if (applicationId) fetchData();
  }, [applicationId]);

  async function fetchData() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getApplicationEmployees(applicationId);
      setData(result);
      setHasGeneratedResults(result.call_status === "results_published");
    } catch (err: any) {
      console.error("Error:", err);
      setError("Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAction() {
    if (!actionDialog) return;

    const confirmed = window.confirm(
      actionDialog.type === "approve"
        ? `Approuver l'employé ${actionDialog.employeeName} ?`
        : `Rejeter l'employé ${actionDialog.employeeName} ?`
    );
    if (!confirmed) return;

    setActionLoading(actionDialog.submissionId);
    try {
      if (actionDialog.type === "approve") {
        await approveEmployeeSubmission(actionDialog.submissionId, actionDialog.notes || undefined);
      } else {
        await rejectEmployeeSubmission(actionDialog.submissionId, actionDialog.notes || undefined);
      }
      setActionDialog(null);
      await fetchData();
    } catch (err) {
      console.error("Action error:", err);
      setError("Erreur lors de l'action");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDownloadDoc(filePath: string, filename: string) {
    try {
      const response = await fetch(`${UPLOADS_BASE_URL}/${filePath}`);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    }
  }

  async function handleGenerateResults() {
    if (!data?.call_id) return;
    setIsGeneratingResults(true);
    setError(null);
    try {
      await downloadResultsFile(data.call_id, "pdf");
      setHasGeneratedResults(true);
    } catch (err) {
      console.error("Generate results error:", err);
      setError("Erreur lors de la génération du fichier de résultats");
    } finally {
      setIsGeneratingResults(false);
    }
  }

  async function handlePublishResults() {
    if (!data?.call_id) return;
    const confirmed = window.confirm("Publier les résultats de cet appel en actualité publique ?");
    if (!confirmed) return;

    setIsPublishingResults(true);
    setError(null);
    try {
      await publishResultsAsNews(data.call_id);
      await fetchData();
    } catch (err) {
      console.error("Publish results error:", err);
      setError("Erreur lors de la publication des résultats");
    } finally {
      setIsPublishingResults(false);
    }
  }

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-8 bg-muted rounded w-64 animate-pulse" />
            <div className="h-4 bg-muted rounded w-48 animate-pulse" />
          </div>
        </div>
        <div className="h-64 bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <Link
          href={`/coordinator/applications/${applicationId}`}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const approvedCount = data.submissions.filter(s => s.status === "approved").length;
  const pendingCount = data.submissions.filter(s => ["pending", "submitted"].includes(s.status)).length;
  const rejectedCount = data.submissions.filter(s => s.status === "rejected").length;
  const canGenerateResults = Boolean(data.call_id) && ["published", "closed", "under_review", "results_published"].includes(data.call_status || "");
  const canPublishResults = canGenerateResults && data.call_status !== "results_published" && hasGeneratedResults;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link
          href={`/coordinator/applications/${applicationId}`}
          className="p-2 hover:bg-muted rounded-lg transition-colors self-start"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div className="flex-1">
          <h1 className="heading-display text-2xl text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-500" />
            Employés – {data.company_name}
          </h1>
          <p className="text-muted-foreground">
            {data.call_title} ({data.call_reference})
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">Proposés</p>
          <p className="text-2xl font-bold text-foreground">{data.proposed_employee_count}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">Invités</p>
          <p className="text-2xl font-bold text-blue-600">{data.invited_count}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">Inscrits</p>
          <p className="text-2xl font-bold text-emerald-600">{data.registered_count}</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <p className="text-sm text-muted-foreground">Approuvés</p>
          <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
        </div>
      </div>

      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-2">Workflow des résultats</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Étape 6: générez le fichier des résultats (PDF). Étape 7: publiez les résultats en actualité.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleGenerateResults}
            disabled={!canGenerateResults || isPublishingResults || isGeneratingResults}
            className="px-3 py-2 rounded-lg text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          >
            {isGeneratingResults ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Générer PDF
          </button>
          <button
            onClick={handlePublishResults}
            disabled={!canPublishResults || isPublishingResults || isGeneratingResults}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            {isPublishingResults ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publier résultats
          </button>
          <Link href="/coordinator/results" className="btn-secondary inline-flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Page résultats
          </Link>
        </div>
        {!hasGeneratedResults && canGenerateResults && data.call_status !== "results_published" && (
          <p className="text-xs text-muted-foreground mt-2">
            Publication disponible après génération d&apos;un fichier de résultats.
          </p>
        )}
      </div>

      {/* Invited Employees List */}
      {data.employee_invitations.length > 0 && (
        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-500" />
            Invitations envoyées ({data.employee_invitations.length})
          </h2>
          <div className="space-y-2">
            {data.employee_invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3"
              >
                <div>
                  <p className="font-medium text-foreground">{inv.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {inv.email}
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    inv.is_used
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}
                >
                  {inv.is_used ? "✓ Inscrit" : "⏳ En attente"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employee Submissions */}
      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-500" />
          Soumissions des employés ({data.submissions.length})
        </h2>

        {data.submissions.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-xl">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">
              Aucune soumission pour le moment. Les employés doivent d&apos;abord
              s&apos;inscrire et soumettre leurs documents.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.submissions.map((sub) => (
              <SubmissionCard
                key={sub.id}
                submission={sub}
                requiredDocs={data.employee_required_documents}
                onApprove={() =>
                  setActionDialog({
                    type: "approve",
                    submissionId: sub.id,
                    employeeName: sub.employee?.fullname || "Employé",
                    notes: "",
                  })
                }
                onReject={() =>
                  setActionDialog({
                    type: "reject",
                    submissionId: sub.id,
                    employeeName: sub.employee?.fullname || "Employé",
                    notes: "",
                  })
                }
                onDownload={handleDownloadDoc}
                isLoading={actionLoading !== null}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action Dialog */}
      {actionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !actionLoading && setActionDialog(null)}
          />
          <div className="relative bg-card rounded-2xl shadow-xl border border-border max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {actionDialog.type === "approve"
                ? "Approuver l'employé"
                : "Rejeter l'employé"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {actionDialog.type === "approve"
                ? `Approuver la soumission de ${actionDialog.employeeName} ?`
                : `Rejeter la soumission de ${actionDialog.employeeName} ?`}
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Notes (optionnel)
              </label>
              <textarea
                value={actionDialog.notes}
                onChange={(e) =>
                  setActionDialog({ ...actionDialog, notes: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Ajouter des notes..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setActionDialog(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAction}
                disabled={!!actionLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2 ${
                  actionDialog.type === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionLoading && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {actionDialog.type === "approve" ? "Approuver" : "Rejeter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Submission Card Component ---
function SubmissionCard({
  submission,
  requiredDocs,
  onApprove,
  onReject,
  onDownload,
  isLoading,
}: {
  submission: EmployeeSubmissionInfo;
  requiredDocs: { type: string; label: string; required: boolean }[];
  onApprove: () => void;
  onReject: () => void;
  onDownload: (path: string, name: string) => void;
  isLoading: boolean;
}) {
  const canAct = ["pending", "submitted"].includes(submission.status);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-muted/30 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {submission.employee?.fullname || "Employé inconnu"}
            </p>
            <p className="text-xs text-muted-foreground">
              {submission.employee?.email}
            </p>
          </div>
        </div>
        <StatusBadge status={submission.status} />
      </div>

      {/* Documents */}
      <div className="p-5">
        <p className="text-sm font-medium text-muted-foreground mb-3">
          Documents ({submission.documents.length}/{requiredDocs.length})
        </p>

        {submission.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Aucun document soumis
          </p>
        ) : (
          <div className="space-y-2">
            {submission.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 bg-muted/30 rounded-lg px-4 py-2.5"
              >
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {doc.document_label || doc.document_type}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {doc.original_filename}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={doc.review_status} />
                  <a
                    href={`${UPLOADS_BASE_URL}/${doc.file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-muted rounded transition-colors"
                    title="Voir"
                  >
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                  <button
                    onClick={() => onDownload(doc.file_path, doc.original_filename)}
                    className="p-1.5 hover:bg-muted rounded transition-colors"
                    title="Télécharger"
                  >
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Review Notes */}
        {submission.review_notes && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
            <strong>Notes :</strong> {submission.review_notes}
          </div>
        )}

        {/* Actions */}
        {canAct && (
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border">
            <button
              onClick={onReject}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              Rejeter
            </button>
            <button
              onClick={onApprove}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Approuver
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
