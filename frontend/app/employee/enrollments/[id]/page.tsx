"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMyEnrollments,
  uploadDocument,
  getEnrollmentDocuments,
  MyEnrollment,
  EnrolleeDocument,
} from "@/lib/enrollment";

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    if ("message" in err && typeof (err as { message: unknown }).message === "string") {
      return (err as { message: string }).message;
    }
    if ("detail" in err && typeof (err as { detail: unknown }).detail === "string") {
      return (err as { detail: string }).detail;
    }
  }
  return "Une erreur est survenue";
}

export default function EnrollmentDetailPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const enrollmentId = parseInt(params.id as string, 10);

  const [enrollment, setEnrollment] = useState<MyEnrollment | null>(null);
  const [documents, setDocuments] = useState<EnrolleeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [documentType, setDocumentType] = useState("cin");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Load enrollments to find this one
      const enrollments = await getMyEnrollments();
      const found = enrollments.find((e) => e.id === enrollmentId);
      if (!found) {
        setError("Inscription non trouvée");
        setLoading(false);
        return;
      }
      setEnrollment(found);

      // Load documents
      const docs = await getEnrollmentDocuments(enrollmentId);
      setDocuments(docs);
    } catch (err) {
      console.error("Error loading data:", err);
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [enrollmentId]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(`/login?redirect=/employee/enrollments/${enrollmentId}`);
    }
  }, [user, isLoading, router, enrollmentId]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError("");
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Veuillez sélectionner un fichier");
      return;
    }

    setError("");
    setSuccess("");
    setUploading(true);

    try {
      await uploadDocument(enrollmentId, documentType, selectedFile);
      setSuccess("Document téléchargé avec succès");
      setSelectedFile(null);
      // Reload data
      await loadData();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "verified":
        return {
          label: "Vérifié",
          color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
        };
      case "rejected":
        return {
          label: "Rejeté",
          color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          ),
        };
      default:
        return {
          label: "En attente de vérification",
          color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
          icon: (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          ),
        };
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!enrollment) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Inscription non trouvée
          </h1>
          <Link href="/employee/dashboard" className="mt-4 text-blue-600 hover:text-blue-700">
            ← Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  const currentDocument = documents.length > 0 ? documents[0] : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <Link
          href="/employee/dashboard"
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 mb-6"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour au tableau de bord
        </Link>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-700 dark:text-green-400">{success}</p>
          </div>
        )}

        {/* Enrollment Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {enrollment.session.course_title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {enrollment.company_name}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Dates</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {enrollment.session.start_date
                  ? new Date(enrollment.session.start_date).toLocaleDateString("fr-FR")
                  : "N/A"}{" "}
                -{" "}
                {enrollment.session.end_date
                  ? new Date(enrollment.session.end_date).toLocaleDateString("fr-FR")
                  : "N/A"}
              </p>
            </div>
            {enrollment.session.schedule && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Horaires</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {enrollment.session.schedule}
                </p>
              </div>
            )}
            <div>
              <span className="text-gray-500 dark:text-gray-400">Inscrit le</span>
              <p className="font-medium text-gray-900 dark:text-white">
                {enrollment.enrolled_at
                  ? new Date(enrollment.enrolled_at).toLocaleDateString("fr-FR")
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Document Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Pièce d&apos;identité
          </h2>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Pour valider votre inscription, veuillez télécharger une copie de votre pièce d&apos;identité
            (CIN ou passeport). Ce document sera vérifié par notre équipe.
          </p>

          {/* Current Document Status */}
          {currentDocument && (
            <div className="mb-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {currentDocument.original_filename}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Type: {currentDocument.document_type === "cin" ? "CIN" : "Passeport"}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Soumis le: {new Date(currentDocument.uploaded_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${getStatusInfo(currentDocument.status).color}`}>
                  {getStatusInfo(currentDocument.status).icon}
                  {getStatusInfo(currentDocument.status).label}
                </div>
              </div>
              
              {currentDocument.status === "rejected" && currentDocument.rejection_reason && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    <strong>Motif du rejet:</strong> {currentDocument.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Upload Form - show if no document or rejected */}
          {(!currentDocument || currentDocument.status === "rejected") && (
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type de document
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="cin">Carte d&apos;identité nationale (CIN)</option>
                  <option value="passport">Passeport</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fichier
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
                  <div className="space-y-1 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                      <label className="relative cursor-pointer bg-white dark:bg-transparent rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                        <span>Sélectionner un fichier</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      PDF, PNG, JPG jusqu&apos;à 5MB
                    </p>
                    {selectedFile && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                        {selectedFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Téléchargement...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {currentDocument ? "Soumettre un nouveau document" : "Télécharger le document"}
                  </>
                )}
              </button>
            </form>
          )}

          {/* Verified Status Message */}
          {currentDocument && currentDocument.status === "verified" && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 text-green-600 dark:text-green-400">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Votre document a été vérifié</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Vous êtes prêt pour la formation !
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
