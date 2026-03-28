"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Eye,
  Building2,
  FileText,
  Calendar,
  AlertCircle,
  Users,
  User,
} from "lucide-react";
import { getMyCalls } from "@/lib/coordinator";
import { getCallApplications } from "@/lib/applications";
import { getApplicationSubmissions, getSubmissionDetails } from "@/lib/submissions";
import { StatusBadge, SearchInput, FilterSelect, Pagination, TableSkeleton, EmptyState } from "@/components/coordinator/CoordinatorUI";
import type { CoordinatorCall } from "@/types/coordinator";
import type { Application } from "@/types/application";
import type { Submission } from "@/types/submission";

const statusOptions = [
  { value: 'pending', label: 'En attente' },
  { value: 'submitted', label: 'Soumise' },
  { value: 'approved', label: 'Approuvée' },
  { value: 'rejected', label: 'Rejetée' },
];

interface SubmissionWithContext extends Submission {
  company_name?: string;
  call_title?: string;
}

export default function EmployeeSubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubmissionWithContext[]>([]);
  const [filteredSubs, setFilteredSubs] = useState<SubmissionWithContext[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  

  useEffect(() => {
    fetchAllSubmissions();
  }, []);

  useEffect(() => {
    filterSubmissions();
  }, [submissions, searchQuery, statusFilter]);

  async function fetchAllSubmissions() {
    setIsLoading(true);
    setError(null);
    try {
      // Get all calls
      const callsRes = await getMyCalls();
      const activeCalls = callsRes.calls.filter((call) => call.status !== "closed");
      
      // Fetch approved applications for all calls in parallel
      const appResults = await Promise.all(
        activeCalls.map(async (call) => {
          try {
            const appsRes = await getCallApplications(call.id, 'approved');
            return { call, applications: appsRes.applications };
          } catch (err) {
            console.error(`Error fetching apps for call ${call.id}:`, err);
            return { call, applications: [] as Application[] };
          }
        })
      );
      
      // Fetch submissions for all applications in parallel
      const subResults = await Promise.all(
        appResults.flatMap(({ call, applications }) =>
          applications.map(async (app) => {
            try {
              const subsRes = await getApplicationSubmissions(app.id);
              const enriched = await Promise.all(
                subsRes.submissions.map(async (sub) => {
                  let documents = sub.documents || [];
                  try {
                    const details = await getSubmissionDetails(sub.id);
                    documents = details.documents || documents;
                  } catch {
                    // Keep fallback list payload when details are unavailable
                  }

                  return {
                    ...sub,
                    documents,
                    company_name: app.company?.name,
                    call_title: call.title,
                  };
                })
              );

              return enriched;
            } catch (err) {
              console.error(`Error fetching submissions for app ${app.id}:`, err);
              return [];
            }
          })
        )
      );
      
      const allSubmissions: SubmissionWithContext[] = subResults.flat();
      
      // Sort by creation date (newest first)
      allSubmissions.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });
      
      setSubmissions(allSubmissions);
    } catch (err) {
      console.error("Error fetching submissions:", err);
      setError("Erreur lors du chargement des soumissions");
    } finally {
      setIsLoading(false);
    }
  }

  function filterSubmissions() {
    let filtered = [...submissions];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (sub) =>
          sub.employee?.fullname?.toLowerCase().includes(query) ||
          sub.company_name?.toLowerCase().includes(query) ||
          sub.call_title?.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter) {
      filtered = filtered.filter((sub) => sub.status === statusFilter);
    }
    
    setFilteredSubs(filtered);
    setCurrentPage(1);
  }

  // Paginated submissions
  const totalPages = Math.ceil(filteredSubs.length / itemsPerPage);
  const paginatedSubs = filteredSubs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = {
    total: submissions.length,
    submitted: submissions.filter(s => s.status === 'submitted').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length,
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
          Soumissions des Employés
        </h1>
        <p className="text-muted-foreground">
          Examinez les documents soumis par les employés des entreprises approuvées
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={fetchAllSubmissions}
            className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Réessayer
          </button>
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
            placeholder="Rechercher par employé, entreprise..."
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

      {/* Submissions Table */}
      {filteredSubs.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-muted-foreground" />}
          title={submissions.length === 0 ? "Aucune soumission" : "Aucun résultat"}
          description={
            submissions.length === 0
              ? "Aucun employé n'a encore soumis de documents."
              : "Aucune soumission ne correspond à vos critères de recherche."
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
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Employé</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Entreprise</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Statut</th>
                    <th className="text-center p-4 text-sm font-medium text-muted-foreground">Documents</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Soumis le</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedSubs.map((sub) => (
                    <tr key={sub.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <Link
                              href={`/coordinator/submissions/${sub.id}`}
                              className="font-medium text-foreground hover:text-primary-600 dark:hover:text-primary-400"
                            >
                              {sub.employee?.fullname || 'Employé inconnu'}
                            </Link>
                            {sub.employee?.position && (
                              <p className="text-xs text-muted-foreground">{sub.employee.position}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            {sub.company_name || 'Entreprise inconnue'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={sub.status} type="submission" />
                      </td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <FileText className="w-4 h-4" />
                          {sub.documents?.length || 0}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {sub.created_at
                          ? new Date(sub.created_at).toLocaleDateString('fr-FR')
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {paginatedSubs.map((sub) => (
              <Link
                key={sub.id}
                href={`/coordinator/submissions/${sub.id}`}
                className="card-elevated p-4 block hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {sub.employee?.fullname || 'Employé inconnu'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sub.company_name}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={sub.status} type="submission" size="sm" />
                </div>
                
                <div className="mt-4 flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {sub.documents?.length || 0} doc(s)
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {sub.created_at
                        ? new Date(sub.created_at).toLocaleDateString('fr-FR')
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
