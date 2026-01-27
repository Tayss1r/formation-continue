"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Eye,
  Loader2,
  AlertCircle,
  Download,
} from "lucide-react";
import {
  getSessionEnrollees,
  getSessionEnrollmentCodes,
  reviewDocument,
  SessionEnrollee,
  EnrollmentCode,
} from "@/lib/enrollment";
import { API_BASE_URL } from "@/lib/config";
import { getAccessToken } from "@/lib/api";

export default function SessionEnrolleesPage() {
  const params = useParams();
  const slotId = parseInt(params.slotId as string, 10);

  const [enrollees, setEnrollees] = useState<SessionEnrollee[]>([]);
  const [codes, setCodes] = useState<EnrollmentCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewingDocId, setReviewingDocId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [enrolleesData, codesData] = await Promise.all([
        getSessionEnrollees(slotId),
        getSessionEnrollmentCodes(slotId),
      ]);
      setEnrollees(enrolleesData);
      setCodes(codesData);
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }, [slotId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVerify = async (documentId: number) => {
    setReviewingDocId(documentId);
    try {
      await reviewDocument(documentId, "verified");
      await loadData();
    } catch (err) {
      console.error("Error verifying document:", err);
      setError("Erreur lors de la vérification");
    } finally {
      setReviewingDocId(null);
    }
  };

  const openRejectModal = (documentId: number) => {
    setSelectedDocId(documentId);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!selectedDocId) return;
    
    setReviewingDocId(selectedDocId);
    try {
      await reviewDocument(selectedDocId, "rejected", rejectReason || "Document non conforme");
      setShowRejectModal(false);
      await loadData();
    } catch (err) {
      console.error("Error rejecting document:", err);
      setError("Erreur lors du rejet");
    } finally {
      setReviewingDocId(null);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
            <CheckCircle className="w-3 h-3" />
            Vérifié
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            Rejeté
          </span>
        );
      case "pending_review":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">
            <Clock className="w-3 h-3" />
            En attente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400">
            <FileText className="w-3 h-3" />
            Non soumis
          </span>
        );
    }
  };

  const viewDocument = (filePath: string) => {
    const token = getAccessToken();
    // Construct URL with auth token
    window.open(`${API_BASE_URL.replace('/api/v1', '')}/uploads/${filePath}?token=${token}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/staff/availability"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Participants de la session
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Session #{slotId} - {enrollees.length} inscrit(s)
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Enrollment Codes Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Codes d&apos;inscription
        </h2>
        
        {codes.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Aucun code d&apos;inscription généré pour cette session.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Entreprise</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Code</th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Utilisations</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Expire le</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr key={code.id} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-3 px-3">{code.company_name}</td>
                    <td className="py-3 px-3">
                      <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono text-sm">
                        {code.code}
                      </code>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-medium ${code.remaining === 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {code.used_count}/{code.max_usage}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-600 dark:text-gray-400">
                      {code.expires_at ? new Date(code.expires_at).toLocaleDateString("fr-FR") : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enrollees Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Participants inscrits
        </h2>

        {enrollees.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              Aucun participant inscrit pour le moment.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {enrollees.map((enrollee) => (
              <div
                key={enrollee.enrollment_id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {enrollee.employee_name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {enrollee.employee_email}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      {enrollee.company_name} • Inscrit le{" "}
                      {new Date(enrollee.enrolled_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Document Status */}
                    {getStatusBadge(enrollee.document?.status)}

                    {/* Document Actions */}
                    {enrollee.document && (
                      <div className="flex items-center gap-2">
                        {/* View Document */}
                        <button
                          onClick={() => viewDocument(enrollee.document!.file_path)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Voir le document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Review Actions (only for pending) */}
                        {enrollee.document.status === "pending_review" && (
                          <>
                            <button
                              onClick={() => handleVerify(enrollee.document!.id)}
                              disabled={reviewingDocId === enrollee.document.id}
                              className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                              title="Valider"
                            >
                              {reviewingDocId === enrollee.document.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => openRejectModal(enrollee.document!.id)}
                              disabled={reviewingDocId === enrollee.document.id}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                              title="Rejeter"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Rejection reason display */}
                {enrollee.document?.status === "rejected" && enrollee.document.rejection_reason && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-400">
                    <strong>Motif:</strong> {enrollee.document.rejection_reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Rejeter le document
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Motif du rejet (optionnel)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ex: Document illisible, photo floue..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleReject}
                  disabled={reviewingDocId !== null}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {reviewingDocId !== null && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Confirmer le rejet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
