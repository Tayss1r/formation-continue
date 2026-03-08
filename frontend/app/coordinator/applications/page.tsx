"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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
import { getMyCalls } from "@/lib/coordinator";
import { getCallApplications } from "@/lib/applications";
import { StatusBadge, SearchInput, FilterSelect, Pagination, TableSkeleton, EmptyState } from "@/components/coordinator/CoordinatorUI";
import type { CoordinatorCall } from "@/types/coordinator";
import type { Application } from "@/types/application";

const statusOptions = [
  { value: 'pending', label: 'En attente' },
  { value: 'submitted', label: 'Soumise' },
  { value: 'under_review', label: 'En examen' },
  { value: 'additional_info_requested', label: 'Info demandée' },
  { value: 'approved', label: 'Approuvée' },
  { value: 'rejected', label: 'Rejetée' },
];

interface ApplicationWithCallInfo extends Application {
  call_title?: string;
  call_reference?: string;
}

export default function AllApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationWithCallInfo[]>([]);
  const [filteredApps, setFilteredApps] = useState<ApplicationWithCallInfo[]>([]);
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

  useEffect(() => {
    fetchAllApplications();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, searchQuery, statusFilter]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = () => setActiveDropdown(null);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  async function fetchAllApplications() {
    setIsLoading(true);
    setError(null);
    try {
      // First get all calls
      const callsRes = await getMyCalls();
      
      // Fetch applications for all calls in parallel
      const appResults = await Promise.all(
        callsRes.calls.map(async (call) => {
          try {
            const appsRes = await getCallApplications(call.id);
            return appsRes.applications.map((app) => ({
              ...app,
              call_title: call.title,
              call_reference: call.reference_number,
            }));
          } catch (err) {
            console.error(`Error fetching apps for call ${call.id}:`, err);
            return [];
          }
        })
      );
      
      const allApps: ApplicationWithCallInfo[] = appResults.flat();
      
      // Sort by submission date (newest first)
      allApps.sort((a, b) => {
        const dateA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        const dateB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
        return dateB - dateA;
      });
      
      setApplications(allApps);
    } catch (err) {
      console.error("Error fetching applications:", err);
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
        (app) =>
          app.company?.name?.toLowerCase().includes(query) ||
          app.call_title?.toLowerCase().includes(query) ||
          app.call_reference?.toLowerCase().includes(query)
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

  // Stats
  const stats = {
    total: applications.length,
    submitted: applications.filter(a => a.status === 'submitted').length,
    under_review: applications.filter(a => a.status === 'under_review').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-64 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
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
      {/* Header */}
      <div>
        <h1 className="heading-display text-2xl text-foreground">
          Toutes les candidatures
        </h1>
        <p className="text-muted-foreground">
          Gérez toutes les candidatures reçues pour vos appels
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={fetchAllApplications}
            className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Total</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.submitted}</p>
          <p className="text-sm text-muted-foreground">Soumises</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.under_review}</p>
          <p className="text-sm text-muted-foreground">En examen</p>
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
            placeholder="Rechercher par entreprise ou appel..."
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
              ? "Aucune candidature n'a encore été soumise pour vos appels."
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
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Appel</th>
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
                        <div>
                          <p className="text-sm text-foreground truncate max-w-[200px]">
                            {app.call_title}
                          </p>
                          <p className="text-xs text-muted-foreground">{app.call_reference}</p>
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
                              <Link
                                href={`/coordinator/calls/${app.call_id}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                <FileText className="w-4 h-4" />
                                Voir l'appel
                              </Link>
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
              <Link
                key={app.id}
                href={`/coordinator/applications/${app.id}`}
                className="card-elevated p-4 block hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {app.company?.name || 'Entreprise inconnue'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {app.call_title}
                      </p>
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
                </div>
              </Link>
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
    </div>
  );
}
