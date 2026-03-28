"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  FileText,
  Users,
  Calendar,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { getMyCalls } from "@/lib/coordinator";
import { deleteCall, publishCall, closeCall, startCallReview, publishCallResults } from "@/lib/calls";
import { StatusBadge, SearchInput, FilterSelect, Pagination, TableSkeleton, EmptyState, ConfirmDialog } from "@/components/coordinator/CoordinatorUI";
import type { CoordinatorCall } from "@/types/coordinator";
import type { CallStatus } from "@/types/call";
import { DEPARTMENT_DISPLAY_NAMES } from "@/types/call";

const statusOptions = [
  { value: 'draft', label: 'Brouillon' },
  { value: 'published', label: 'Publié' },
  { value: 'closed', label: 'Fermé' },
  { value: 'under_review', label: 'En examen' },
  { value: 'results_published', label: 'Résultats publiés' },
];

export default function CallsManagementPage() {
  const router = useRouter();
  const [calls, setCalls] = useState<CoordinatorCall[]>([]);
  const [filteredCalls, setFilteredCalls] = useState<CoordinatorCall[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Action states
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'primary' | 'warning';
    callId: number;
    actionType: 'delete' | 'publish' | 'close' | 'start_review' | 'publish_results';
    action: () => Promise<void>;
  } | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    fetchCalls();
  }, []);

  useEffect(() => {
    filterCalls();
  }, [calls, searchQuery, statusFilter]);

  async function fetchCalls() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getMyCalls();
      setCalls(response.calls);
    } catch (err) {
      console.error("Error fetching calls:", err);
      setError("Erreur lors du chargement des appels");
    } finally {
      setIsLoading(false);
    }
  }

  function filterCalls() {
    let filtered = [...calls];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (call) =>
          call.title.toLowerCase().includes(query) ||
          call.reference_number.toLowerCase().includes(query) ||
          call.department.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter) {
      filtered = filtered.filter((call) => call.status === statusFilter);
    }
    
    setFilteredCalls(filtered);
    setCurrentPage(1);
  }

  // Paginated calls
  const totalPages = Math.ceil(filteredCalls.length / itemsPerPage);
  const paginatedCalls = filteredCalls.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Action handlers
  async function handleDelete(callId: number) {
    setConfirmDialog({
      isOpen: true,
      title: "Supprimer l'appel",
      message: "Êtes-vous sûr de vouloir supprimer cet appel ? Cette action est irréversible.",
      variant: 'danger',
      callId,
      actionType: 'delete',
      action: async () => {
        await deleteCall(callId);
        setCalls(calls.filter((c) => c.id !== callId));
      },
    });
  }

  async function handlePublish(callId: number) {
    setConfirmDialog({
      isOpen: true,
      title: "Publier l'appel",
      message: "L'appel sera visible publiquement et les entreprises pourront soumettre leurs candidatures.",
      variant: 'primary',
      callId,
      actionType: 'publish',
      action: async () => {
        await publishCall(callId);
        await fetchCalls();
      },
    });
  }

  async function handleClose(callId: number) {
    setConfirmDialog({
      isOpen: true,
      title: "Fermer les candidatures",
      message: "Les entreprises ne pourront plus soumettre de candidatures pour cet appel.",
      variant: 'warning',
      callId,
      actionType: 'close',
      action: async () => {
        await closeCall(callId);
        await fetchCalls();
      },
    });
  }

  async function handlePublishResults(callId: number) {
    setConfirmDialog({
      isOpen: true,
      title: "Publier les résultats",
      message: "Les résultats seront publiés et visibles sur la page d'accueil.",
      variant: 'primary',
      callId,
      actionType: 'publish_results',
      action: async () => {
        await publishCallResults(callId);
        await fetchCalls();
      },
    });
  }

  async function handleStartReview(callId: number) {
    setConfirmDialog({
      isOpen: true,
      title: "Démarrer l'examen",
      message: "L'appel passera en mode examen. Vous pourrez ensuite examiner les candidatures et publier les résultats.",
      variant: 'primary',
      callId,
      actionType: 'start_review',
      action: async () => {
        await startCallReview(callId);
        await fetchCalls();
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
      setError("Une erreur s'est produite lors de l'action");
    } finally {
      setIsActionLoading(false);
    }
  }

  // Render inline action buttons based on call status
  function renderActions(call: CoordinatorCall) {
    const isMutatingThisCall = isActionLoading && confirmDialog?.callId === call.id;

    return (
      <div className="flex items-center justify-end gap-1">
        <Link
          href={`/coordinator/calls/${call.id}`}
          title="Voir"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Eye className="w-4 h-4" />
        </Link>

        {call.status === 'draft' && (
          <>
            <Link
              href={`/coordinator/calls/${call.id}/edit`}
              title="Modifier"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <Edit className="w-4 h-4" />
            </Link>
            <button
              title="Publier"
              onClick={() => handlePublish(call.id)}
              disabled={isActionLoading}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            >
              {isMutatingThisCall && confirmDialog?.actionType === 'publish' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
            <button
              title="Supprimer"
              onClick={() => handleDelete(call.id)}
              disabled={isActionLoading}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              {isMutatingThisCall && confirmDialog?.actionType === 'delete' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </>
        )}

        {call.status === 'published' && (
          <>
            <Link
              href={`/coordinator/calls/${call.id}/applications`}
              title="Candidatures"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <Users className="w-4 h-4" />
            </Link>
            <button
              title="Fermer les candidatures"
              onClick={() => handleClose(call.id)}
              disabled={isActionLoading}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              {isMutatingThisCall && confirmDialog?.actionType === 'close' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
            </button>
          </>
        )}

        {call.status === 'closed' && (
          <>
            <Link
              href={`/coordinator/calls/${call.id}/applications`}
              title="Candidatures"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <Users className="w-4 h-4" />
            </Link>
          </>
        )}

        {call.status === 'under_review' && (
          <>
            <Link
              href={`/coordinator/calls/${call.id}/applications`}
              title="Candidatures"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <Users className="w-4 h-4" />
            </Link>
            <button
              title="Publier les résultats"
              onClick={() => handlePublishResults(call.id)}
              disabled={isActionLoading}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            >
              {isMutatingThisCall && confirmDialog?.actionType === 'publish_results' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
            </button>
          </>
        )}

        {call.status === 'results_published' && (
          <Link
            href={`/coordinator/calls/${call.id}/applications`}
            title="Candidatures"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Users className="w-4 h-4" />
          </Link>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-muted rounded w-64 animate-pulse" />
          <div className="h-12 bg-muted rounded w-40 animate-pulse" />
        </div>
        <div className="flex gap-4">
          <div className="h-12 bg-muted rounded flex-1 animate-pulse" />
          <div className="h-12 bg-muted rounded w-48 animate-pulse" />
        </div>
        <TableSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="heading-display text-2xl text-foreground">
            Appels à Candidatures
          </h1>
          <p className="text-muted-foreground">
            {calls.length} appel{calls.length !== 1 ? 's' : ''} au total
          </p>
        </div>
        <Link
          href="/coordinator/calls/new"
          className="btn-primary inline-flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Nouvel Appel
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={fetchCalls}
            className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher par titre, référence..."
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

      {/* Calls Table */}
      {filteredCalls.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8 text-muted-foreground" />}
          title={calls.length === 0 ? "Aucun appel créé" : "Aucun résultat"}
          description={
            calls.length === 0
              ? "Créez votre premier appel à candidatures pour commencer."
              : "Aucun appel ne correspond à vos critères de recherche."
          }
          action={
            calls.length === 0
              ? { label: "Créer un appel", onClick: () => router.push("/coordinator/calls/new") }
              : undefined
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
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Titre</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Département</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Statut</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date limite</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">Candidatures</th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCalls.map((call) => (
                    <tr key={call.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div>
                          <Link
                            href={`/coordinator/calls/${call.id}`}
                            className="font-medium text-foreground hover:text-primary-600 dark:hover:text-primary-400"
                          >
                            {call.title}
                          </Link>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {call.reference_number}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-foreground">
                        {DEPARTMENT_DISPLAY_NAMES[call.department as keyof typeof DEPARTMENT_DISPLAY_NAMES] || call.department}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={call.status} type="call" />
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {call.application_deadline
                          ? new Date(call.application_deadline).toLocaleDateString('fr-FR')
                          : '-'
                        }
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-sm font-medium text-primary-600 dark:text-primary-400">
                          {call.application_count}
                        </span>
                      </td>
                      <td className="p-4">
                        {renderActions(call)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {paginatedCalls.map((call) => (
              <div key={call.id} className="card-elevated p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/coordinator/calls/${call.id}`}
                      className="font-medium text-foreground hover:text-primary-600 dark:hover:text-primary-400 block truncate"
                    >
                      {call.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {call.reference_number}
                    </p>
                  </div>
                  <StatusBadge status={call.status} type="call" size="sm" />
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Département</p>
                    <p className="text-foreground font-medium">
                      {DEPARTMENT_DISPLAY_NAMES[call.department as keyof typeof DEPARTMENT_DISPLAY_NAMES] || call.department}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Date limite</p>
                    <p className="text-foreground font-medium">
                      {call.application_deadline
                        ? new Date(call.application_deadline).toLocaleDateString('fr-FR')
                        : '-'
                      }
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{call.application_count} candidature(s)</span>
                  </div>
                  <Link
                    href={`/coordinator/calls/${call.id}`}
                    className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline"
                  >
                    Voir détails
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
