"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Clock,
  Eye,
  Send,
  AlertCircle,
  Building2,
  FileText,
  Calendar,
  Users,
  ArrowRight,
} from "lucide-react";
import { getMyCalls } from "@/lib/coordinator";
import { getCallApplications, getApplicationDetails } from "@/lib/applications";
import { publishCallResults } from "@/lib/calls";
import { StatusBadge, EmptyState, ConfirmDialog, CardSkeleton } from "@/components/coordinator/CoordinatorUI";
import type { CoordinatorCall } from "@/types/coordinator";
import type { Application } from "@/types/application";
import { DEPARTMENT_DISPLAY_NAMES, type Department } from "@/types/call";

interface CallWithApprovedCompanies {
  call: CoordinatorCall;
  approvedApplications: Application[];
}

export default function ResultsPublicationPage() {
  const [callsData, setCallsData] = useState<CallWithApprovedCompanies[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CoordinatorCall | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    setError(null);
    try {
      const callsRes = await getMyCalls();
      
      // Filter calls that can have results published
      const eligibleCalls = callsRes.calls.filter(
        (c) => c.status === 'closed' || c.status === 'under_review' || c.status === 'results_published'
      );

      // Get approved applications for each call in parallel
      const callsWithApproved: CallWithApprovedCompanies[] = await Promise.all(
        eligibleCalls.map(async (call) => {
          try {
            const appsRes = await getCallApplications(call.id, 'approved');
            return { call, approvedApplications: appsRes.applications };
          } catch (err) {
            console.error(`Error fetching apps for call ${call.id}:`, err);
            return { call, approvedApplications: [] };
          }
        })
      );

      setCallsData(callsWithApproved);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePublishResults() {
    if (!selectedCall) return;
    
    setIsPublishing(true);
    try {
      await publishCallResults(selectedCall.id);
      fetchData();
      setConfirmPublish(false);
      setSelectedCall(null);
      setShowPreview(false);
    } catch (err) {
      console.error("Error publishing results:", err);
      setError("Erreur lors de la publication des résultats");
    } finally {
      setIsPublishing(false);
    }
  }

  const pendingCalls = callsData.filter(d => d.call.status !== 'results_published');
  const publishedCalls = callsData.filter(d => d.call.status === 'results_published');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded w-64 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="heading-display text-2xl text-foreground">
          Publication des Résultats
        </h1>
        <p className="text-muted-foreground">
          Publiez les résultats des appels à candidatures
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={fetchData}
            className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Pending Publication */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-500" />
          En attente de publication
        </h2>

        {pendingCalls.length === 0 ? (
          <div className="card-elevated p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-foreground font-medium">Tous les résultats ont été publiés</p>
            <p className="text-sm text-muted-foreground mt-1">
              Aucun appel n'est en attente de publication
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingCalls.map(({ call, approvedApplications }) => (
              <div key={call.id} className="card-elevated p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                      {call.reference_number}
                    </p>
                    <h3 className="font-semibold text-foreground mt-1">
                      {call.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{DEPARTMENT_DISPLAY_NAMES[call.department as Department] || call.department}</p>
                  </div>
                  <StatusBadge status={call.status} type="call" size="sm" />
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {call.application_count} candidature(s)
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {approvedApplications.length} approuvée(s)
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedCall(call);
                      setShowPreview(true);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-muted hover:bg-muted/80 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Aperçu
                  </button>
                  <button
                    onClick={() => {
                      setSelectedCall(call);
                      setConfirmPublish(true);
                    }}
                    disabled={approvedApplications.length === 0}
                    className="flex-1 btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    Publier
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Published Results */}
      {publishedCalls.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Résultats publiés
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publishedCalls.map(({ call, approvedApplications }) => (
              <div key={call.id} className="card-elevated p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                      {call.reference_number}
                    </p>
                    <h3 className="font-semibold text-foreground mt-1">
                      {call.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{DEPARTMENT_DISPLAY_NAMES[call.department as Department] || call.department}</p>
                  </div>
                  <StatusBadge status={call.status} type="call" size="sm" />
                </div>

                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg mb-4">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    {approvedApplications.length} entreprise(s) admise(s)
                  </p>
                </div>

                <Link
                  href={`/coordinator/calls/${call.id}`}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                >
                  Voir les détails <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          />
          <div className="relative bg-card rounded-2xl shadow-elevated border border-border max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-semibold text-foreground">
                Aperçu des résultats
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <span className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wide">
                  {selectedCall.reference_number}
                </span>
                <h2 className="text-2xl font-bold text-foreground mt-1">
                  {selectedCall.title}
                </h2>
                <p className="text-muted-foreground">{DEPARTMENT_DISPLAY_NAMES[selectedCall.department as Department] || selectedCall.department}</p>
              </div>

              <div className="border-t border-border pt-6">
                <h4 className="font-semibold text-foreground mb-4">
                  Entreprises admises
                </h4>
                
                {callsData.find(d => d.call.id === selectedCall.id)?.approvedApplications.length === 0 ? (
                  <p className="text-muted-foreground italic">Aucune entreprise approuvée</p>
                ) : (
                  <div className="space-y-3">
                    {callsData
                      .find(d => d.call.id === selectedCall.id)
                      ?.approvedApplications.map((app) => (
                        <div
                          key={app.id}
                          className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {app.company?.name || 'Entreprise'}
                            </p>
                            {app.company?.industry_sector && (
                              <p className="text-sm text-muted-foreground">
                                {app.company.industry_sector}
                              </p>
                            )}
                          </div>
                          <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-card border-t border-border p-4 flex justify-end gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setConfirmPublish(true);
                }}
                disabled={callsData.find(d => d.call.id === selectedCall.id)?.approvedApplications.length === 0}
                className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Publier les résultats
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Publish Dialog */}
      <ConfirmDialog
        isOpen={confirmPublish}
        title="Publier les résultats"
        message={`Les résultats de l'appel "${selectedCall?.title}" seront publiés et visibles par tous sur la page d'accueil. Cette action est irréversible.`}
        variant="primary"
        confirmLabel="Publier"
        onConfirm={handlePublishResults}
        onCancel={() => {
          setConfirmPublish(false);
          setSelectedCall(null);
        }}
        isLoading={isPublishing}
      />
    </div>
  );
}

