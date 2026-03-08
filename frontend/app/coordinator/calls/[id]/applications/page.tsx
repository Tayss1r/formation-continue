"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  MessageSquare,
  MoreVertical,
  Building2,
  FileText,
  Calendar,
  AlertCircle,
  Users,
} from "lucide-react";
import { getCallDetails } from "@/lib/calls";
import { getCallApplications, approveApplication, rejectApplication, requestAdditionalInfo } from "@/lib/applications";
import { StatusBadge, SearchInput, FilterSelect, Pagination, TableSkeleton, EmptyState, ConfirmDialog } from "@/components/coordinator/CoordinatorUI";
import type { Call } from "@/types/call";
import type { Application } from "@/types/application";
import { APPLICATION_STATUS_LABELS } from "@/types/application";

const statusOptions = [
  { value: 'pending', label: 'En attente' },
  { value: 'submitted', label: 'Soumise' },
  { value: 'under_review', label: 'En examen' },
  { value: 'additional_info_requested', label: 'Info demandée' },
  { value: 'approved', label: 'Approuvée' },
  { value: 'rejected', label: 'Rejetée' },
];

export default function CallApplicationsPage() {
  const params = useParams();
  const router = useRouter();
  const callId = Number(params.id);
  
  const [call, setCall] = useState<Call | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApps, setFilteredApps] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Action states
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: 'approve' | 'reject' | 'request_info';
    applicationId: number;
    notes: string;
  } | null>(null);

  useEffect(() => {
    if (callId) {
      fetchData();
    }
  }, [callId]);

  useEffect(() => {
    filterApplications();
  }, [applications, searchQuery, statusFilter]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = () => setActiveDropdown(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  async function fetchData() {
    setIsLoading(true);
    setError(null);
    try {
      const [callData, appsData] = await Promise.all([
        getCallDetails(callId),
        getCallApplications(callId),
      ]);
      setCall(callData);
      setApplications(appsData.applications);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Erreur lors du chargement des candidatures");
    } finally {
      setIsLoading(false);
    }
  }

  function filterApplications() {
    let filtered = [...applications];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (app) => app.company?.name?.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter) {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }
    
    setFilteredApps(filtered);
    setCurrentPage(1);
  }

  // Paginated applications
  const totalPages = Math.ceil(filteredApps.length / itemsPerPage);
  const paginatedApps = filteredApps.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Action handlers
  async function handleApprove() {
    if (!actionDialog) return;
    
    setIsActionLoading(true);
    try {
      await approveApplication(actionDialog.applicationId, {
        decision: 'approved',
        notes: actionDialog.notes,
      });
      fetchData();
      setActionDialog(null);
    } catch (err) {
      console.error("Error approving:", err);
      setActionError("Erreur lors de l'approbation");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleReject() {
    if (!actionDialog) return;
    
    setIsActionLoading(true);
    try {
      await rejectApplication(actionDialog.applicationId, {
        decision: 'rejected',
        notes: actionDialog.notes,
      });
      fetchData();
      setActionDialog(null);
    } catch (err) {
      console.error("Error rejecting:", err);
      setActionError("Erreur lors du rejet");
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleRequestInfo() {
    if (!actionDialog) return;
    
    setIsActionLoading(true);
    try {
      await requestAdditionalInfo(actionDialog.applicationId, {
        message: actionDialog.notes,
      });
      fetchData();
      setActionDialog(null);
    } catch (err) {
      console.error("Error requesting info:", err);
      setActionError("Erreur lors de la demande d'informations");
    } finally {
      setIsActionLoading(false);
    }
  }

  // Stats
  const stats = {
    total: applications.length,
    submitted: applications.filter(a => a.status === 'submitted').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
          <div className="space-y-2 flex-1">
            <div className="h-6 bg-muted rounded w-64 animate-pulse" />
            <div className="h-4 bg-muted rounded w-48 animate-pulse" />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="h-12 bg-muted rounded flex-1 animate-pulse" />
          <div className="h-12 bg-muted rounded w-48 animate-pulse" />
        </div>
        <TableSkeleton rows={5} />
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
          <h1 className="heading-display text-2xl text-foreground">Candidatures</h1>
        </div>
        
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Erreur</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Link
          href={`/coordinator/calls/${callId}`}
          className="p-2 hover:bg-muted rounded-lg transition-colors self-start"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-primary-600 dark:text-primary-400">
              {call.reference_number}
            </span>
            <StatusBadge status={call.status} type="call" size="sm" />
          </div>
          <h1 className="heading-display text-2xl text-foreground">
            Candidatures
          </h1>
          <p className="text-muted-foreground">{call.title}</p>
        </div>
      </div>

      {/* Action Error */}
      {actionError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{actionError}</p>
          <button onClick={() => setActionError(null)} className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium">Fermer</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.submitted}</p>
          <p className="text-sm text-muted-foreground">Soumises</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          <p className="text-sm text-muted-foreground">Approuvées</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
          <p className="text-sm text-muted-foreground">Rejetées</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher par nom d'entreprise..."
          />
        </div>
        <div className="w-full sm:w-48">
          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            placeholder="Tous les statuts"
          />
        </div>
      </div>

      {/* Applications Table */}
      {filteredApps.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-muted-foreground" />}
          title={applications.length === 0 ? "Aucune candidature" : "Aucun résultat"}
          description={
            applications.length === 0
              ? "Aucune entreprise n'a encore soumis de candidature pour cet appel."
              : "Aucune candidature ne correspond à vos critères de recherche."
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block card-elevated overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Entreprise</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Statut</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">Documents</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Soumis le</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedApps.map((app) => (
                    <tr key={app.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <Link
                              href={`/coordinator/applications/${app.id}`}
                              className="font-medium text-foreground hover:text-primary-600 dark:hover:text-primary-400"
                            >
                              {app.company?.name || 'Entreprise inconnue'}
                            </Link>
                            {app.company?.industry_sector && (
                              <p className="text-xs text-muted-foreground">{app.company.industry_sector}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <FileText className="w-4 h-4" />
                          {app.documents?.length || 0}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {app.submitted_at
                          ? new Date(app.submitted_at).toLocaleDateString('fr-FR')
                          : '-'
                        }
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown === app.id ? null : app.id);
                            }}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
                          </button>
                          
                          {activeDropdown === app.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-20">
                              <Link
                                href={`/coordinator/applications/${app.id}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                Voir détails
                              </Link>
                              {['submitted', 'under_review'].includes(app.status) && (
                                <>
                                  <button
                                    onClick={() => {
                                      setActiveDropdown(null);
                                      setActionDialog({ type: 'approve', applicationId: app.id, notes: '' });
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 w-full text-left transition-colors"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    Approuver
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveDropdown(null);
                                      setActionDialog({ type: 'reject', applicationId: app.id, notes: '' });
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left transition-colors"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Rejeter
                                  </button>
                                  <button
                                    onClick={() => {
                                      setActiveDropdown(null);
                                      setActionDialog({ type: 'request_info', applicationId: app.id, notes: '' });
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 w-full text-left transition-colors"
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                    Demander infos
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {paginatedApps.map((app) => (
              <div key={app.id} className="card-elevated p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {app.company?.name || 'Entreprise inconnue'}
                      </p>
                      {app.company?.industry_sector && (
                        <p className="text-xs text-muted-foreground">{app.company.industry_sector}</p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={app.status} size="sm" />
                </div>
                
                <div className="mt-4 flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {app.documents?.length || 0} doc(s)
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {app.submitted_at
                        ? new Date(app.submitted_at).toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </span>
                  </div>
                  <Link
                    href={`/coordinator/applications/${app.id}`}
                    className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
                  >
                    Voir
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}

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
              {actionDialog.type === 'approve' && 'L\'entreprise sera notifiée de l\'approbation.'}
              {actionDialog.type === 'reject' && 'L\'entreprise sera notifiée du rejet.'}
              {actionDialog.type === 'request_info' && 'Un message sera envoyé à l\'entreprise.'}
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
    </div>
  );
}
