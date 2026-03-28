"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, CheckCircle, Download, FileText, Loader2, Send } from "lucide-react";
import { getMySubmission, submitForReview, uploadSubmissionDocument } from "@/lib/submissions";
import { UPLOADS_BASE_URL } from "@/lib/config";
import type { Submission, SubmissionDocument } from "@/types/submission";

export default function EmployeeSubmissionDetailPage() {
  const params = useParams();
  const submissionId = Number(params.id);

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
  const [confirmUploadDocType, setConfirmUploadDocType] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);

  async function fetchSubmission() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMySubmission(submissionId);
      setSubmission(data);
    } catch (err: any) {
      setError(err?.message || "Erreur lors du chargement de la soumission");
    } finally {
      setIsLoading(false);
    }
  }

  function getSubmissionStatusLabel(status: string) {
    switch (status) {
      case "pending":
        return "En préparation";
      case "submitted":
        return "Soumise";
      case "under_review":
        return "En cours de révision";
      case "approved":
        return "Approuvée";
      case "rejected":
        return "Rejetée";
      default:
        return status;
    }
  }

  function getDocumentStatusLabel(status: string) {
    switch (status) {
      case "approved":
        return "Approuvé";
      case "rejected":
        return "Rejeté";
      case "revision_required":
        return "Révision demandée";
      default:
        return "En attente";
    }
  }

  const requiredDocs = useMemo(() => {
    return submission?.application?.call?.employee_required_documents || [];
  }, [submission]);

  function findUploadedByType(type: string): SubmissionDocument | undefined {
    return submission?.documents?.find((d) => d.document_type === type);
  }

  function canEditDocument(type: string): boolean {
    if (!isEditable) {
      return false;
    }
    if (submission?.status !== "under_review") {
      return true;
    }

    const existing = findUploadedByType(type);
    return Boolean(existing && existing.review_status === "revision_required");
  }

  async function handleUpload(docType: string, file: File | null) {
    if (!file) return;
    setUploadingType(docType);
    setError(null);
    setSuccessMessage(null);
    try {
      await uploadSubmissionDocument(submissionId, docType, file);
      await fetchSubmission();
      setSuccessMessage("Document mis à jour avec succès.");
      setSelectedFiles((prev) => ({ ...prev, [docType]: null }));
    } catch (err: any) {
      setError(err?.message || "Erreur lors du téléversement");
    } finally {
      setUploadingType(null);
    }
  }

  async function handleSubmitForReview() {
    setIsSubmittingReview(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await submitForReview(submissionId);
      await fetchSubmission();
      setSuccessMessage("Soumission envoyée au coordinateur.");
    } catch (err: any) {
      setError(err?.message || "Impossible d'envoyer la soumission");
    } finally {
      setIsSubmittingReview(false);
    }
  }

  if (isLoading) {
    return <div className="h-56 rounded-2xl bg-muted animate-pulse" />;
  }

  if (!submission) {
    return (
      <div className="card-elevated p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className="text-muted-foreground">Soumission introuvable.</p>
      </div>
    );
  }

  const isEditable = ["pending", "submitted", "under_review"].includes(submission.status);
  const revisionRequestedCount = submission.documents.filter((doc) => doc.review_status === "revision_required").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="heading-display text-2xl text-foreground">Documents de ma soumission</h1>
          <p className="text-muted-foreground">{submission.application?.call?.title || `Soumission #${submission.id}`}</p>
        </div>
        <Link href="/employee/submissions" className="btn-secondary">Retour</Link>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-700 dark:text-green-400">{successMessage}</p>
        </div>
      )}

      <div className="card-elevated p-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Statut actuel</p>
        <span className="text-sm font-medium text-foreground">{getSubmissionStatusLabel(submission.status)}</span>
      </div>

      <div className="p-4 rounded-xl border border-border bg-muted/30">
        <p className="text-sm text-muted-foreground">
          Après validation des entreprises et des employés, le coordinateur publie les résultats en actualité avec un fichier de résultats téléchargeable.
        </p>
      </div>

      {revisionRequestedCount > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <p className="text-amber-800 dark:text-amber-300 text-sm font-medium">
            {revisionRequestedCount} document(s) à corriger. Téléversez une nouvelle version puis re-soumettez.
          </p>
        </div>
      )}

      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Documents requis</h2>

        {requiredDocs.length === 0 ? (
          <p className="text-muted-foreground">Aucun document requis pour cet appel.</p>
        ) : (
          <div className="space-y-4">
            {requiredDocs.map((doc) => {
              const existing = findUploadedByType(doc.type);
              return (
                <div key={doc.type} className="rounded-xl border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{doc.label || doc.type}</p>
                      <p className="text-xs text-muted-foreground">Type: {doc.type}</p>
                    </div>
                    {existing ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        <CheckCircle className="w-3 h-3" /> Téléversé
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Manquant</span>
                    )}
                  </div>

                  {existing && (
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                      <div>
                        <p className="text-sm text-foreground">{existing.original_filename}</p>
                        <p className="text-xs text-muted-foreground">Statut: {getDocumentStatusLabel(existing.review_status)}</p>
                        {existing.review_status === "revision_required" && existing.review_notes && (
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                            Révision demandée: {existing.review_notes}
                          </p>
                        )}
                      </div>
                      <a
                        href={`${UPLOADS_BASE_URL}/${existing.file_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-muted"
                      >
                        <Download className="w-4 h-4 text-muted-foreground" />
                      </a>
                    </div>
                  )}

                  {canEditDocument(doc.type) && (
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-muted-foreground">Téléverser / remplacer :</label>
                      <input
                        type="file"
                        onChange={(e) => {
                          const selectedFile = e.target.files?.[0] || null;
                          setSelectedFiles((prev) => ({ ...prev, [doc.type]: selectedFile }));
                          setError(null);
                          setSuccessMessage(null);
                          e.target.value = "";
                        }}
                        disabled={uploadingType === doc.type}
                        className="text-sm"
                      />
                      {selectedFiles[doc.type] && (
                        <button
                          type="button"
                          onClick={() => setConfirmUploadDocType(doc.type)}
                          disabled={uploadingType === doc.type}
                          className="btn-primary px-3 py-2 text-xs"
                        >
                          Téléverser
                        </button>
                      )}
                      {uploadingType === doc.type && <Loader2 className="w-4 h-4 animate-spin text-primary-500" />}
                    </div>
                  )}

                  {isEditable && !canEditDocument(doc.type) && submission.status === "under_review" && (
                    <p className="text-xs text-muted-foreground">
                      Correction déjà envoyée pour ce document.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isEditable && (
        <div className="card-elevated p-6 flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Envoyer au coordinateur</p>
            <p className="text-sm text-muted-foreground">Statut actuel: {getSubmissionStatusLabel(submission.status)}</p>
          </div>
          <button
            onClick={handleSubmitForReview}
            disabled={!submission.can_submit || isSubmittingReview}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmittingReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Soumettre
          </button>
        </div>
      )}

      {confirmUploadDocType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => uploadingType ? null : setConfirmUploadDocType(null)}
          />
          <div className="relative bg-card rounded-2xl shadow-elevated border border-border max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-foreground mb-2">Confirmer le téléversement</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Voulez-vous téléverser ce document corrigé ?
            </p>
            <div className="text-xs text-muted-foreground mb-6">
              Fichier: {selectedFiles[confirmUploadDocType]?.name}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmUploadDocType(null)}
                disabled={Boolean(uploadingType)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Non
              </button>
              <button
                type="button"
                onClick={async () => {
                  const file = selectedFiles[confirmUploadDocType] || null;
                  await handleUpload(confirmUploadDocType, file);
                  setConfirmUploadDocType(null);
                }}
                disabled={Boolean(uploadingType)}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
              >
                Oui
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
