"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  FileText,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageSquare,
  Calendar,
  AlertCircle,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { getApplicationDetails, approveApplication, rejectApplication, requestAdditionalInfo, reviewApplicationDocument } from "@/lib/applications";
import { StatusBadge, ConfirmDialog } from "@/components/coordinator/CoordinatorUI";
import type { ApplicationWithCall, ApplicationDocument } from "@/types/application";
import { UPLOADS_BASE_URL } from "@/lib/config";
import { DEPARTMENT_DISPLAY_NAMES, type Department } from "@/types/call";

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = Number(params.id);
  
  const [application, setApplication] = useState<ApplicationWithCall | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  
  // Action dialogs
  const [actionDialog, setActionDialog] = useState<{
    type: 'approve' | 'reject' | 'request_info';
    notes: string;
  } | null>(null);
  
  const [documentDialog, setDocumentDialog] = useState<{
    document: ApplicationDocument;
    action: 'approve' | 'reject' | 'revision';
    reason: string;
  } | null>(null);

  useEffect(() => {
    if (applicationId) {
      fetchApplication();
    }
  }, [applicationId]);

  async function fetchApplication() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getApplicationDetails(applicationId);
      setApplication(data);
    } catch (err) {
      console.error("Error fetching application:", err);
      setError("Erreur lors du chargement de la candidature");
    } finally {
      setIsLoading(false);
    }
  }

  // Application actions
  async function handleApprove() {
    if (!actionDialog) return;
    
    setIsActionLoading(true);
    try {
      await approveApplication(applicationId, {
        decision: 'approved',
        notes: actionDialog.notes,
      });
      fetchApplication();
      setActionDialog(null);
    } catch (err) {
      console.error("Error approving:", err);
      setError("Erreur lors de l'approbation");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleReject() {
    if (!actionDialog) return;
    
    setIsActionLoading(true);
    try {
      await rejectApplication(applicationId, {
        decision: 'rejected',
        notes: actionDialog.notes,
      });
      fetchApplication();
      setActionDialog(null);
    } catch (err) {
      console.error("Error rejecting:", err);
      setError("Erreur lors du rejet");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleRequestInfo() {
    if (!actionDialog) return;
    
    setIsActionLoading(true);
    try {
      await requestAdditionalInfo(applicationId, {
        message: actionDialog.notes,
      });
      fetchApplication();
      setActionDialog(null);
    } catch (err) {
      console.error("Error requesting info:", err);
      setError("Erreur lors de la demande d'informations");
    } finally {
      setIsActionLoading(false);
    }
  }

  // Document actions
  async function handleDocumentReview() {
    if (!documentDialog || !application) return;
    
    setIsActionLoading(true);
    try {
      const statusMap = {
        approve: 'approved' as const,
        reject: 'rejected' as const,
        revision: 'requires_resubmission' as const,
      };
      
      await reviewApplicationDocument(applicationId, documentDialog.document.id, {
        status: statusMap[documentDialog.action],
        rejection_reason: documentDialog.action !== 'approve' ? documentDialog.reason : undefined,
      });
      fetchApplication();
      setDocumentDialog(null);
    } catch (err) {
      console.error("Error reviewing document:", err);
      setError("Erreur lors de l'examen du document");
    } finally {
      setIsActionLoading(false);
    }
  }

  // Download document
  function getDocumentUrl(doc: ApplicationDocument) {
    return `${UPLOADS_BASE_URL}/${doc.file_path}`;
  }

  // Loading state
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-muted rounded-2xl animate-pulse" />
          </div>
          <div className="h-80 bg-muted rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !application) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/coordinator/applications"
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <h1 className="heading-display text-2xl text-foreground">Détails de la candidature</h1>
        </div>
        
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Erreur</h2>
          <p className="text-muted-foreground mb-4">{error || "Candidature non trouvée"}</p>
          <Link
            href="/coordinator/applications"
            className="btn-primary inline-flex items-center gap-2"
          >
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  const canTakeAction = ['submitted', 'under_review'].includes(application.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Link
          href={application.call ? `/coordinator/calls/${application.call.id}/applications` : "/coordinator/applications"}
          className="p-2 hover:bg-muted rounded-lg transition-colors self-start"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={application.status} />
          </div>
          <h1 className="heading-display text-2xl text-foreground">
            {application.company?.name || "Entreprise inconnue"}
          </h1>
          {application.call && (
            <Link
              href={`/coordinator/calls/${application.call.id}`}
              className="text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400 flex items-center gap-1 mt-1"
            >
              {application.call.title}
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>

        {/* Action Buttons */}
        {canTakeAction && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActionDialog({ type: 'request_info', notes: '' })}
              className="px-4 py-2 rounded-lg font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 transition-colors inline-flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Demander infos
            </button>
            <button
              onClick={() => setActionDialog({ type: 'reject', notes: '' })}
              className="px-4 py-2 rounded-lg font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 transition-colors inline-flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Rejeter
            </button>
            <button
              onClick={() => setActionDialog({ type: 'approve', notes: '' })}
              className="px-4 py-2 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700 transition-colors inline-flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Approuver
            </button>
          </div>
        )}
      </div>

      {/* Action Error */}
      {error && !isLoading && application && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Motivation Letter */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-500" />
              Lettre de motivation
            </h2>
            {application.motivation_letter ? (
              <p className="text-foreground whitespace-pre-wrap">{application.motivation_letter}</p>
            ) : (
              <p className="text-muted-foreground italic">Aucune lettre de motivation fournie</p>
            )}
          </div>

          {/* Additional Notes */}
          {application.additional_notes && (
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Notes additionnelles
              </h2>
              <p className="text-foreground whitespace-pre-wrap">{application.additional_notes}</p>
            </div>
          )}

          {/* Documents */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-500" />
              Documents soumis ({application.documents?.length || 0})
            </h2>
            
            {!application.documents || application.documents.length === 0 ? (
              <div className="text-center py-8 bg-muted/50 rounded-xl">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">Aucun document soumis</p>
              </div>
            ) : (
              <div className="space-y-3">
                {application.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl border border-border"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {doc.original_filename}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Type: {doc.document_type}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={doc.review_status} type="document" size="sm" />
                        {doc.rejection_reason && (
                          <span className="text-xs text-red-500">
                            {doc.rejection_reason}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={getDocumentUrl(doc)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Voir"
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </a>
                      <a
                        href={getDocumentUrl(doc)}
                        download
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                        title="Télécharger"
                      >
                        <Download className="w-4 h-4 text-muted-foreground" />
                      </a>
                      
                      {canTakeAction && doc.review_status === 'pending' && (
                        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-border">
                          <button
                            onClick={() => setDocumentDialog({ document: doc, action: 'approve', reason: '' })}
                            className="p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Approuver"
                          >
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </button>
                          <button
                            onClick={() => setDocumentDialog({ document: doc, action: 'reject', reason: '' })}
                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Rejeter"
                          >
                            <XCircle className="w-4 h-4 text-red-500" />
                          </button>
                          <button
                            onClick={() => setDocumentDialog({ document: doc, action: 'revision', reason: '' })}
                            className="p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                            title="Demander révision"
                          >
                            <RefreshCw className="w-4 h-4 text-orange-500" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Decision History */}
          {application.coordinator_decision && (
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Décision du coordinateur
              </h2>
              <div className="p-4 bg-muted/50 rounded-xl">
                <p className="font-medium text-foreground mb-2">
                  {application.coordinator_decision === 'approved' ? 'Approuvée' : 
                   application.coordinator_decision === 'rejected' ? 'Rejetée' : 
                   application.coordinator_decision}
                </p>
                {application.decision_notes && (
                  <p className="text-muted-foreground">{application.decision_notes}</p>
                )}
                {application.reviewed_at && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(application.reviewed_at).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Company Info */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-500" />
              Entreprise
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Nom</p>
                <p className="font-medium text-foreground">{application.company?.name || '-'}</p>
              </div>
              {application.company?.industry_sector && (
                <div>
                  <p className="text-sm text-muted-foreground">Secteur</p>
                  <p className="font-medium text-foreground">{application.company.industry_sector}</p>
                </div>
              )}
              {application.company?.trade_register_number && (
                <div>
                  <p className="text-sm text-muted-foreground">Registre de commerce</p>
                  <p className="font-medium text-foreground">{application.company.trade_register_number}</p>
                </div>
              )}
            </div>
          </div>

          {/* Call Info */}
          {application.call && (
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-500" />
                Appel
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Référence</p>
                  <p className="font-medium text-foreground">{application.call.reference_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Département</p>
                  <p className="font-medium text-foreground">{DEPARTMENT_DISPLAY_NAMES[application.call.department as Department] || application.call.department}</p>
                </div>
                <Link
                  href={`/coordinator/calls/${application.call.id}`}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                >
                  Voir l'appel <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              Historique
            </h2>
            <div className="space-y-3 text-sm">
              {application.submitted_at && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Soumise le</span>
                  <span className="font-medium text-foreground ml-auto">
                    {new Date(application.submitted_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
              {application.reviewed_at && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">Examinée le</span>
                  <span className="font-medium text-foreground ml-auto">
                    {new Date(application.reviewed_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Document Stats */}
          <div className="card-elevated p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Statut des documents</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Approuvés</span>
                <span className="font-medium text-green-600">
                  {application.documents?.filter(d => d.review_status === 'approved').length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">En attente</span>
                <span className="font-medium text-yellow-600">
                  {application.documents?.filter(d => d.review_status === 'pending').length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rejetés</span>
                <span className="font-medium text-red-600">
                  {application.documents?.filter(d => d.review_status === 'rejected').length || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Dialog */}
      {actionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isActionLoading && setActionDialog(null)}
          />
          <div className="relative bg-card rounded-2xl shadow-elevated border border-border max-w-md w-full p-6 animate-fade-up">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {actionDialog.type === 'approve' && 'Approuver la candidature'}
              {actionDialog.type === 'reject' && 'Rejeter la candidature'}
              {actionDialog.type === 'request_info' && 'Demander des informations'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {actionDialog.type === 'approve' && 'L\'entreprise sera notifiée de l\'approbation et pourra inscrire ses employés.'}
              {actionDialog.type === 'reject' && 'L\'entreprise sera notifiée du rejet de sa candidature.'}
              {actionDialog.type === 'request_info' && 'Un message sera envoyé à l\'entreprise pour demander des informations.'}
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                {actionDialog.type === 'request_info' ? 'Message *' : 'Notes (optionnel)'}
              </label>
              <textarea
                value={actionDialog.notes}
                onChange={(e) => setActionDialog({ ...actionDialog, notes: e.target.value })}
                placeholder={
                  actionDialog.type === 'request_info'
                    ? 'Décrivez les informations supplémentaires requises...'
                    : 'Ajouter des notes pour cette décision...'
                }
                rows={4}
                className="form-input form-textarea w-full"
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setActionDialog(null)}
                disabled={isActionLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (actionDialog.type === 'approve') handleApprove();
                  else if (actionDialog.type === 'reject') handleReject();
                  else handleRequestInfo();
                }}
                disabled={isActionLoading || (actionDialog.type === 'request_info' && !actionDialog.notes.trim())}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  actionDialog.type === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : actionDialog.type === 'reject'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
              >
                {isActionLoading && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {actionDialog.type === 'approve' && 'Approuver'}
                {actionDialog.type === 'reject' && 'Rejeter'}
                {actionDialog.type === 'request_info' && 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Review Dialog */}
      {documentDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isActionLoading && setDocumentDialog(null)}
          />
          <div className="relative bg-card rounded-2xl shadow-elevated border border-border max-w-md w-full p-6 animate-fade-up">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {documentDialog.action === 'approve' && 'Approuver le document'}
              {documentDialog.action === 'reject' && 'Rejeter le document'}
              {documentDialog.action === 'revision' && 'Demander une révision'}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Document: {documentDialog.document.original_filename}
            </p>
            
            {documentDialog.action !== 'approve' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Raison *
                </label>
                <textarea
                  value={documentDialog.reason}
                  onChange={(e) => setDocumentDialog({ ...documentDialog, reason: e.target.value })}
                  placeholder="Expliquez la raison du rejet ou de la révision..."
                  rows={3}
                  className="form-input form-textarea w-full"
                />
              </div>
            )}
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDocumentDialog(null)}
                disabled={isActionLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDocumentReview}
                disabled={isActionLoading || (documentDialog.action !== 'approve' && !documentDialog.reason.trim())}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 ${
                  documentDialog.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : documentDialog.action === 'reject'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
              >
                {isActionLoading && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
