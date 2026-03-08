"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Building2,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Mail,
  Phone,
  Briefcase,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { 
  getSubmissionDetails, 
  reviewSubmissionDocument,
  approveSubmission, 
  rejectSubmission 
} from "@/lib/submissions";
import { StatusBadge, ConfirmDialog } from "@/components/coordinator/CoordinatorUI";
import { UPLOADS_BASE_URL } from "@/lib/config";
import type { Submission } from "@/types/submission";

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = parseInt(params.id as string, 10);
  
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Document review
  const [reviewingDoc, setReviewingDoc] = useState<{
    id: number;
    action: 'approve' | 'reject' | 'revision';
    notes: string;
  } | null>(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  
  // Final decision
  const [finalDecision, setFinalDecision] = useState<{
    type: 'approve' | 'reject';
    notes: string;
  } | null>(null);
  const [isDecisionLoading, setIsDecisionLoading] = useState(false);

  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);

  async function fetchSubmission() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSubmissionDetails(submissionId);
      setSubmission(data);
    } catch (err) {
      console.error("Error fetching submission:", err);
      setError("Erreur lors du chargement de la soumission");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDocumentReview() {
    if (!reviewingDoc) return;
    
    setIsReviewLoading(true);
    try {
      await reviewSubmissionDocument(submissionId, reviewingDoc.id, {
        status: reviewingDoc.action === 'approve' ? 'approved' : reviewingDoc.action === 'reject' ? 'rejected' : 'requires_resubmission',
        rejection_reason: reviewingDoc.notes || undefined,
      });
      await fetchSubmission();
      setReviewingDoc(null);
    } catch (err) {
      console.error("Error reviewing document:", err);
      setError("Erreur lors de la révision du document");
    } finally {
      setIsReviewLoading(false);
    }
  }

  async function handleFinalDecision() {
    if (!finalDecision) return;
    
    setIsDecisionLoading(true);
    try {
      if (finalDecision.type === 'approve') {
        await approveSubmission(submissionId, { notes: finalDecision.notes || undefined });
      } else {
        await rejectSubmission(submissionId, { notes: finalDecision.notes || undefined });
      }
      await fetchSubmission();
      setFinalDecision(null);
    } catch (err) {
      console.error("Error submitting decision:", err);
      setError("Erreur lors de la soumission de la décision");
    } finally {
      setIsDecisionLoading(false);
    }
  }

  function getDocumentStatusColor(status: string) {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'rejected': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'requires_resubmission': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30';
      default: return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
    }
  }

  function getDocumentStatusLabel(status: string) {
    switch (status) {
      case 'approved': return 'Approuvé';
      case 'rejected': return 'Rejeté';
      case 'requires_resubmission': return 'Révision demandée';
      default: return 'En attente';
    }
  }

  function getDocumentUrl(filePath: string) {
    return `${UPLOADS_BASE_URL}/${filePath}`;
  }

  // Calculate document review stats
  const docStats = submission?.documents ? {
    total: submission.documents.length,
    approved: submission.documents.filter(d => d.review_status === 'approved').length,
    rejected: submission.documents.filter(d => d.review_status === 'rejected').length,
    pending: submission.documents.filter(d => !['approved', 'rejected'].includes(d.review_status)).length,
  } : { total: 0, approved: 0, rejected: 0, pending: 0 };

  const allDocsReviewed = docStats.pending === 0 && docStats.total > 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-muted rounded w-48 animate-pulse" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="h-48 bg-muted rounded-xl animate-pulse" />
            <div className="h-64 bg-muted rounded-xl animate-pulse mt-6" />
          </div>
          <div>
            <div className="h-64 bg-muted rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="space-y-6">
        <Link
          href="/coordinator/submissions"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux soumissions
        </Link>
        
        <div className="card-elevated p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {error || "Soumission introuvable"}
          </h2>
          <button
            onClick={fetchSubmission}
            className="btn-primary mt-4"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/coordinator/submissions"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux soumissions
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="heading-display text-2xl text-foreground">
                {submission.employee?.fullname}
              </h1>
              <p className="text-muted-foreground">Soumission #{submission.id}</p>
            </div>
          </div>
        </div>
        <StatusBadge status={submission.status} type="submission" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Employee Info */}
          <div className="card-elevated p-6">
            <h2 className="font-semibold text-lg text-foreground mb-4">
              Informations de l'Employé
            </h2>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="icon-box">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nom complet</p>
                  <p className="font-medium text-foreground">
                    {submission.employee?.fullname}
                  </p>
                </div>
              </div>
              
              {submission.employee?.email && (
                <div className="flex items-center gap-3">
                  <div className="icon-box">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a 
                      href={`mailto:${submission.employee?.email}`}
                      className="font-medium text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {submission.employee?.email}
                    </a>
                  </div>
                </div>
              )}
              

              
              {submission.employee?.position && (
                <div className="flex items-center gap-3">
                  <div className="icon-box">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Poste</p>
                    <p className="font-medium text-foreground">
                      {submission.employee?.position}
                    </p>
                  </div>
                </div>
              )}
              
              {submission.application?.company && (
                <div className="flex items-center gap-3">
                  <div className="icon-box">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Entreprise</p>
                    <p className="font-medium text-foreground">
                      {submission.application.company.name}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <div className="icon-box">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date de soumission</p>
                  <p className="font-medium text-foreground">
                    {submission.created_at
                      ? new Date(submission.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '-'
                    }
                  </p>
                </div>
              </div>
            </div>
            
            {submission.review_notes && (
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="font-medium text-foreground mb-2">Notes du coordinateur</h3>
                <p className="text-muted-foreground whitespace-pre-line">
                  {submission.review_notes}
                </p>
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg text-foreground">
                Documents Soumis
              </h2>
              <span className="text-sm text-muted-foreground">
                {docStats.approved}/{docStats.total} approuvés
              </span>
            </div>
            
            {submission.documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun document soumis</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submission.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 bg-muted/30 rounded-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg ${getDocumentStatusColor(doc.review_status)}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {doc.original_filename}
                          </p>
                          <p className="text-xs text-muted-foreground">{doc.document_label}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getDocumentStatusColor(doc.review_status)}`}>
                              {getDocumentStatusLabel(doc.review_status)}
                            </span>
                            {doc.uploaded_at && (
                              <span className="text-xs text-muted-foreground">
                                Uploadé le {new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </div>
                          {doc.review_notes && (
                            <p className="text-sm text-muted-foreground mt-2 italic">
                              Note: {doc.review_notes}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {doc.file_path && (
                          <a
                            href={getDocumentUrl(doc.file_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                            title="Télécharger"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                        {submission.status === 'submitted' && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setReviewingDoc({
                                id: doc.id,
                                action: 'approve',
                                notes: '',
                              })}
                              className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                              title="Approuver"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setReviewingDoc({
                                id: doc.id,
                                action: 'reject',
                                notes: '',
                              })}
                              className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Rejeter"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setReviewingDoc({
                                id: doc.id,
                                action: 'revision',
                                notes: '',
                              })}
                              className="p-2 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                              title="Demander révision"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Actions */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold text-foreground mb-4">Statut et Actions</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Statut actuel</p>
                <StatusBadge status={submission.status} type="submission" />
              </div>
              
              {submission.status === 'submitted' && (
                <>
                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-3">
                      {allDocsReviewed 
                        ? "Tous les documents ont été examinés. Vous pouvez prendre une décision finale."
                        : "Examinez tous les documents avant de prendre une décision finale."
                      }
                    </p>
                    
                    <div className="space-y-3">
                      <button
                        onClick={() => setFinalDecision({ type: 'approve', notes: '' })}
                        className="w-full btn-primary flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approuver
                      </button>
                      <button
                        onClick={() => setFinalDecision({ type: 'reject', notes: '' })}
                        className="w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Rejeter
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Document Stats */}
          <div className="card-elevated p-6">
            <h3 className="font-semibold text-foreground mb-4">Révision des Documents</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-medium text-foreground">{docStats.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Approuvés</span>
                <span className="font-medium text-green-600">{docStats.approved}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rejetés</span>
                <span className="font-medium text-red-600">{docStats.rejected}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">En attente</span>
                <span className="font-medium text-blue-600">{docStats.pending}</span>
              </div>
              
              <div className="pt-3 border-t border-border">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all" 
                    style={{ width: `${docStats.total > 0 ? (docStats.approved / docStats.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {docStats.total > 0 ? Math.round((docStats.approved / docStats.total) * 100) : 0}% approuvés
                </p>
              </div>
            </div>
          </div>

          {/* Call Info */}
          {submission.application?.call && (
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-foreground mb-4">Appel à Candidatures</h3>
              
              <Link
                href={`/coordinator/calls/${submission.application.call.id}`}
                className="block p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group"
              >
                <p className="font-medium text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex items-center gap-2">
                  {submission.application.call.title}
                  <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Document Review Dialog */}
      {reviewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isReviewLoading && setReviewingDoc(null)}
          />
          <div className="relative bg-card rounded-2xl shadow-elevated border border-border max-w-md w-full p-6 animate-fade-up">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {reviewingDoc.action === 'approve' && 'Approuver le document'}
              {reviewingDoc.action === 'reject' && 'Rejeter le document'}
              {reviewingDoc.action === 'revision' && 'Demander une révision'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {reviewingDoc.action === 'approve' && 'Ce document sera marqué comme approuvé.'}
              {reviewingDoc.action === 'reject' && 'Ce document sera marqué comme rejeté.'}
              {reviewingDoc.action === 'revision' && 'L\'employé sera notifié de réviser ce document.'}
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Notes {reviewingDoc.action === 'revision' ? '(requis)' : '(optionnel)'}
              </label>
              <textarea
                value={reviewingDoc.notes}
                onChange={(e) => setReviewingDoc({ ...reviewingDoc, notes: e.target.value })}
                placeholder={
                  reviewingDoc.action === 'revision'
                    ? "Expliquez ce qui doit être corrigé..."
                    : "Ajouter des notes..."
                }
                rows={4}
                className="form-input form-textarea w-full"
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setReviewingDoc(null)}
                disabled={isReviewLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDocumentReview}
                disabled={isReviewLoading || (reviewingDoc.action === 'revision' && !reviewingDoc.notes.trim())}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  reviewingDoc.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : reviewingDoc.action === 'reject'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {isReviewLoading && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Final Decision Dialog */}
      {finalDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isDecisionLoading && setFinalDecision(null)}
          />
          <div className="relative bg-card rounded-2xl shadow-elevated border border-border max-w-md w-full p-6 animate-fade-up">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {finalDecision.type === 'approve' && 'Approuver la soumission'}
              {finalDecision.type === 'reject' && 'Rejeter la soumission'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {finalDecision.type === 'approve' 
                ? "L'employé sera notifié de l'approbation de sa candidature."
                : "L'employé sera notifié du rejet de sa candidature."
              }
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Notes (optionnel)
              </label>
              <textarea
                value={finalDecision.notes}
                onChange={(e) => setFinalDecision({ ...finalDecision, notes: e.target.value })}
                placeholder="Ajouter des notes pour cette décision..."
                rows={4}
                className="form-input form-textarea w-full"
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setFinalDecision(null)}
                disabled={isDecisionLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleFinalDecision}
                disabled={isDecisionLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  finalDecision.type === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isDecisionLoading && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {finalDecision.type === 'approve' ? 'Approuver' : 'Rejeter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
