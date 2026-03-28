"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Eye,
  Trash2,
  Send,
  XCircle,
  CheckCircle,
  FileText,
  Calendar,
  Building2,
  Users,
  Clock,
  AlertCircle,
  MoreVertical,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { getCallDetails, publishCall, closeCall, startCallReview, publishCallResults, deleteCall } from "@/lib/calls";
import { getCallApplications } from "@/lib/applications";
import { StatusBadge, ConfirmDialog, CardSkeleton } from "@/components/coordinator/CoordinatorUI";
import type { Call, RequiredDocumentSpec } from "@/types/call";
import { DEPARTMENT_DISPLAY_NAMES } from "@/types/call";
import type { Application } from "@/types/application";

export default function CallDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const callId = Number(params.id);
  
  const [call, setCall] = useState<Call | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState(false);
  
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'primary' | 'warning';
    actionType: 'publish' | 'close' | 'publish_results' | 'start_review' | 'delete';
    action: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    if (callId) {
      fetchData();
    }
  }, [callId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = () => setActiveDropdown(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  async function fetchData() {
    setIsLoading(true);
    setError(null);
    try {
      const [callData, applicationsData] = await Promise.all([
        getCallDetails(callId),
        getCallApplications(callId).catch(() => ({ applications: [], total: 0 })),
      ]);
      setCall(callData);
      setApplications(applicationsData.applications);
    } catch (err) {
      console.error("Error fetching call:", err);
      setError("Erreur lors du chargement de l'appel");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePublish() {
    setConfirmDialog({
      isOpen: true,
      title: "Publier l'appel",
      message: "L'appel sera visible publiquement et les entreprises pourront soumettre leurs candidatures.",
      variant: 'primary',
      actionType: 'publish',
      action: async () => {
        await publishCall(callId);
        await fetchData();
      },
    });
  }

  async function handleClose() {
    setConfirmDialog({
      isOpen: true,
      title: "Fermer les candidatures",
      message: "Les entreprises ne pourront plus soumettre de candidatures pour cet appel.",
      variant: 'warning',
      actionType: 'close',
      action: async () => {
        await closeCall(callId);
        await fetchData();
      },
    });
  }

  async function handlePublishResults() {
    setConfirmDialog({
      isOpen: true,
      title: "Publier les résultats",
      message: "Les résultats seront publiés et visibles sur la page d'accueil.",
      variant: 'primary',
      actionType: 'publish_results',
      action: async () => {
        await publishCallResults(callId);
        await fetchData();
      },
    });
  }

  async function handleStartReview() {
    setConfirmDialog({
      isOpen: true,
      title: "Démarrer l'examen",
      message: "L'appel passera en mode examen. Vous pourrez ensuite examiner les candidatures et publier les résultats.",
      variant: 'primary',
      actionType: 'start_review',
      action: async () => {
        await startCallReview(callId);
        await fetchData();
      },
    });
  }

  async function handleDelete() {
    setConfirmDialog({
      isOpen: true,
      title: "Supprimer l'appel",
      message: "Êtes-vous sûr de vouloir supprimer cet appel ? Cette action est irréversible.",
      variant: 'danger',
      actionType: 'delete',
      action: async () => {
        await deleteCall(callId);
        router.push("/coordinator/calls");
      },
    });
  }

  async function executeAction() {
    if (!confirmDialog) return;
    
    setIsActionLoading(true);
    try {
      await confirmDialog.action();
      setConfirmDialog(null);
    } catch (err) {
      console.error("Action failed:", err);
      setActionError("Une erreur s'est produite lors de l'action");
    } finally {
      setIsActionLoading(false);
    }
  }

  // Calculate statistics
  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    submitted: applications.filter(a => a.status === 'submitted').length,
    under_review: applications.filter(a => a.status === 'under_review').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-8 bg-muted rounded w-96 animate-pulse" />
            <div className="h-4 bg-muted rounded w-48 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-muted rounded-2xl animate-pulse" />
            <div className="h-48 bg-muted rounded-2xl animate-pulse" />
          </div>
          <div className="space-y-6">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/coordinator/calls"
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <h1 className="heading-display text-2xl text-foreground">Détails de l'appel</h1>
        </div>
        
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {error || "Appel non trouvé"}
          </h2>
          <p className="text-muted-foreground mb-4">
            L'appel demandé n'existe pas ou a été supprimé.
          </p>
          <Link
            href="/coordinator/calls"
            className="btn-primary inline-flex items-center gap-2"
          >
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Error */}
      {actionError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{actionError}</p>
          <button onClick={() => setActionError(null)} className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium">Fermer</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Link
          href="/coordinator/calls"
          className="p-2 hover:bg-muted rounded-lg transition-colors self-start"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              {call.reference_number}
            </span>
            <StatusBadge status={call.status} type="call" />
          </div>
          <h1 className="heading-display text-2xl text-foreground">
            {call.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {DEPARTMENT_DISPLAY_NAMES[call.department] || call.department}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 relative">
          {call.status === 'draft' && (
            <>
              <Link
                href={`/coordinator/calls/${call.id}/edit`}
                aria-disabled={isActionLoading}
                onClick={(e) => {
                  if (isActionLoading) {
                    e.preventDefault();
                  }
                }}
                className="px-4 py-2 rounded-lg font-medium text-foreground bg-muted hover:bg-muted/80 transition-colors inline-flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Modifier
              </Link>
              <button
                onClick={handlePublish}
                disabled={isActionLoading}
                className="btn-primary inline-flex items-center gap-2"
              >
                {isActionLoading && confirmDialog?.actionType === 'publish' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Publier
              </button>
            </>
          )}
          
          {call.status === 'published' && (
            <button
              onClick={handleClose}
              disabled={isActionLoading}
              className="px-4 py-2 rounded-lg font-medium text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 transition-colors inline-flex items-center gap-2"
            >
              {isActionLoading && confirmDialog?.actionType === 'close' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Fermer
            </button>
          )}
          
          {call.status === 'closed' && (
            <button
              onClick={handleStartReview}
              disabled={isActionLoading}
              className="btn-primary inline-flex items-center gap-2"
            >
              {isActionLoading && confirmDialog?.actionType === 'start_review' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              Démarrer examen
            </button>
          )}
          
          {call.status === 'under_review' && (
            <button
              onClick={handlePublishResults}
              disabled={isActionLoading}
              className="btn-primary inline-flex items-center gap-2"
            >
              {isActionLoading && confirmDialog?.actionType === 'publish_results' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Publier résultats
            </button>
          )}

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveDropdown(!activeDropdown);
              }}
              disabled={isActionLoading}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-muted-foreground" />
            </button>
            
            {activeDropdown && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-20">
                <Link
                  href={`/coordinator/calls/${call.id}/applications`}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <Users className="w-4 h-4" />
                  Voir candidatures
                </Link>
                {call.status === 'draft' && (
                  <button
                    onClick={() => {
                      setActiveDropdown(false);
                      handleDelete();
                    }}
                    disabled={isActionLoading}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left transition-colors"
                  >
                    {isActionLoading && confirmDialog?.actionType === 'delete' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Supprimer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-500" />
              Description
            </h2>
            {call.description ? (
              <p className="text-foreground whitespace-pre-wrap">{call.description}</p>
            ) : (
              <p className="text-muted-foreground italic">Aucune description</p>
            )}
          </div>

          {/* Eligibility */}
          {call.eligibility_criteria && (
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Critères d'éligibilité
              </h2>
              <p className="text-foreground whitespace-pre-wrap">{call.eligibility_criteria}</p>
            </div>
          )}

          {/* Required Documents */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-500" />
              Documents entreprise requis
            </h2>
            {call.required_documents && call.required_documents.length > 0 ? (
              <div className="space-y-3">
                {call.required_documents.map((doc: RequiredDocumentSpec, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <FileText className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">
                        {doc.label}
                        {doc.required && <span className="text-red-500 ml-1">*</span>}
                      </p>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Type: {doc.type} | Max: {doc.max_size_mb || 10}MB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic">Aucun document requis</p>
            )}
          </div>

          {/* Employee Documents */}
          {call.employee_required_documents && call.employee_required_documents.length > 0 && (
            <div className="card-elevated p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-500" />
                Documents employé requis
              </h2>
              <div className="space-y-3">
                {call.employee_required_documents.map((doc: RequiredDocumentSpec, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">
                        {doc.label}
                        {doc.required && <span className="text-red-500 ml-1">*</span>}
                      </p>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              Dates
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Date de début</p>
                <p className="font-medium text-foreground">
                  {new Date(call.application_start_date).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date limite</p>
                <p className="font-medium text-foreground">
                  {new Date(call.application_deadline).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              {call.results_publication_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Publication résultats</p>
                  <p className="font-medium text-foreground">
                    {new Date(call.results_publication_date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Applications Stats */}
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-500" />
                Candidatures
              </h2>
              <Link
                href={`/coordinator/calls/${call.id}/applications`}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                Voir <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="text-center mb-4">
              <p className="text-4xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>

            <div className="space-y-2">
              {stats.submitted > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Soumises</span>
                  <StatusBadge status="submitted" size="sm" />
                  <span className="font-medium">{stats.submitted}</span>
                </div>
              )}
              {stats.under_review > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">En examen</span>
                  <StatusBadge status="under_review" size="sm" />
                  <span className="font-medium">{stats.under_review}</span>
                </div>
              )}
              {stats.approved > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Approuvées</span>
                  <StatusBadge status="approved" size="sm" />
                  <span className="font-medium">{stats.approved}</span>
                </div>
              )}
              {stats.rejected > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rejetées</span>
                  <StatusBadge status="rejected" size="sm" />
                  <span className="font-medium">{stats.rejected}</span>
                </div>
              )}
            </div>
          </div>

          {/* Meta Info */}
          <div className="card-elevated p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Informations</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Créé le</span>
                <span className="text-foreground">
                  {new Date(call.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              {call.published_at && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Publié le</span>
                  <span className="text-foreground">
                    {new Date(call.published_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Dernière mise à jour</span>
                <span className="text-foreground">
                  {new Date(call.updated_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
              {call.created_by && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Créé par</span>
                  <span className="text-foreground">{call.created_by.fullname}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          onConfirm={executeAction}
          onCancel={() => setConfirmDialog(null)}
          isLoading={isActionLoading}
        />
      )}
    </div>
  );
}
