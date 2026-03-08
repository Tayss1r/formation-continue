"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Building2,
  FileText,
  CheckCircle,
  AlertCircle,
  Send,
  Loader2,
  Upload,
} from "lucide-react";
import { Header } from "@/components/Header";
import { getPublicCallDetails } from "@/lib/calls";
import { createApplication, getMyApplications, updateMyApplication, uploadApplicationDocument } from "@/lib/applications";
import { useAuth } from "@/contexts/AuthContext";
import type { CallPublic } from "@/types/call";
import type { Application } from "@/types/application";
import { DEPARTMENT_DISPLAY_NAMES } from "@/types/call";

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const [call, setCall] = useState<CallPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [employeeCount, setEmployeeCount] = useState<string>("1");
  const [motivationLetter, setMotivationLetter] = useState<string>("");
  const [selectedDocuments, setSelectedDocuments] = useState<Record<string, File | null>>({});
  const [hasAlreadyApplied, setHasAlreadyApplied] = useState(false);
  const [existingApplication, setExistingApplication] = useState<Application | null>(null);
  const [checkingApplication, setCheckingApplication] = useState(true);
  const [applicationCheckFailed, setApplicationCheckFailed] = useState(false);

  const callId = params.id as string;

  const requiredDocs = (call?.required_documents || []).filter((doc) => doc.required !== false);

  useEffect(() => {
    async function fetchCall() {
      try {
        const data = await getPublicCallDetails(parseInt(callId));
        setCall(data);
      } catch (err) {
        console.error("Error fetching call:", err);
        setError("Impossible de charger les détails de l'appel");
      } finally {
        setLoading(false);
      }
    }

    if (callId) {
      fetchCall();
    }
  }, [callId]);

  useEffect(() => {
    async function checkExistingApplication() {
      if (!isAuthenticated || user?.role !== "company" || !call) {
        setHasAlreadyApplied(false);
        setApplicationCheckFailed(false);
        setCheckingApplication(false);
        return;
      }

      setCheckingApplication(true);
      setApplicationCheckFailed(false);
      try {
        const myApps = await getMyApplications();
        const existingApp = myApps.applications.find((app) => app.call_id === call.id) || null;
        const alreadyApplied = !!existingApp;
        setHasAlreadyApplied(alreadyApplied);
        setExistingApplication(existingApp);

        if (existingApp) {
          setEmployeeCount(existingApp.proposed_employee_count ? String(existingApp.proposed_employee_count) : "1");
          setMotivationLetter(existingApp.motivation_letter || "");
        }

        if (alreadyApplied) {
          setShowApplyForm(false);
          setApplyError(null);
        }
      } catch (err) {
        console.error("Error checking existing applications:", err);
        setApplicationCheckFailed(true);
      } finally {
        setCheckingApplication(false);
      }
    }

    checkExistingApplication();
  }, [isAuthenticated, user?.role, call]);

  async function handleApply() {
    if (!call) return;

    const count = parseInt(employeeCount, 10);
    if (!count || count < 1) {
      setApplyError("Veuillez indiquer un nombre d'employés valide (minimum 1)");
      return;
    }

    const selectedDocTypes = Object.entries(selectedDocuments)
      .filter(([, file]) => !!file)
      .map(([docType]) => docType);
    const existingDocTypes = new Set(
      (existingApplication?.documents || []).map((doc) => doc.document_type)
    );

    if (!existingApplication) {
      if (selectedDocTypes.length !== requiredDocs.length) {
        setApplyError(`Veuillez téléverser exactement ${requiredDocs.length} document(s) requis.`);
        return;
      }
    } else {
      const coveredRequiredDocs = requiredDocs.filter(
        (doc) => existingDocTypes.has(doc.type) || selectedDocTypes.includes(doc.type)
      );
      if (coveredRequiredDocs.length !== requiredDocs.length) {
        setApplyError(`Tous les documents requis (${requiredDocs.length}) doivent être fournis.`);
        return;
      }
    }

    setApplying(true);
    setApplyError(null);

    try {
      const isEditing = !!existingApplication;
      const actionResponse = isEditing
        ? await updateMyApplication(existingApplication.id, {
            proposed_employee_count: count,
            motivation_letter: motivationLetter.trim() || undefined,
          })
        : await createApplication({
            call_id: call.id,
            proposed_employee_count: count,
            motivation_letter: motivationLetter.trim() || undefined,
          });

      for (const doc of requiredDocs) {
        const file = selectedDocuments[doc.type];
        if (file) {
          await uploadApplicationDocument(
            actionResponse.application.id,
            doc.type,
            file
          );
        }
      }

      setApplySuccess(true);
      // Redirect to company applications page after a short delay
      setTimeout(() => {
        router.push("/dashboard?tab=applications");
      }, 2000);
    } catch (err: unknown) {
      console.error("Error applying:", err);
      let errorMessage = "Erreur lors de la soumission de la candidature";
      if (err && typeof err === "object" && "message" in err) {
        errorMessage = String((err as { message: string }).message);
      }
      setApplyError(errorMessage);
    } finally {
      setApplying(false);
    }
  }

  const isCompany = user?.role === "company";
  if (loading || authLoading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <div className="pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !call) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <div className="pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              {error || "Appel non trouvé"}
            </h1>
            <Link
              href="/"
              className="inline-flex items-center text-primary-600 dark:text-primary-400 hover:underline mt-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux appels
          </Link>

          {/* Main card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="p-6 sm:p-8 border-b border-slate-200 dark:border-slate-700">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300">
                  {DEPARTMENT_DISPLAY_NAMES[call.department] || call.department}
                </span>
                {call.is_open ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                    <CheckCircle className="w-4 h-4" />
                    Ouvert
                  </span>
                ) : call.is_upcoming ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                    <Calendar className="w-4 h-4" />
                    Bientôt disponible
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                    <Clock className="w-4 h-4" />
                    Fermé
                  </span>
                )}
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {call.title}
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
                Référence: {call.reference_number}
              </p>
            </div>

            {/* Content */}
            <div className="p-6 sm:p-8 space-y-8">
              {/* Dates */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Date de début</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {new Date(call.application_start_date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                  <Clock className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Date limite</p>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {new Date(call.application_deadline).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    {call.days_remaining !== undefined && call.days_remaining > 0 && (
                      <p className={`text-sm mt-1 ${
                        call.days_remaining <= 3 
                          ? "text-red-500" 
                          : call.days_remaining <= 7 
                            ? "text-amber-500" 
                            : "text-slate-500 dark:text-slate-400"
                      }`}>
                        {call.days_remaining} jour{call.days_remaining > 1 ? "s" : ""} restant{call.days_remaining > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {call.description && (
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                    Description
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                    {call.description}
                  </p>
                </div>
              )}

              {/* Eligibility */}
              {call.eligibility_criteria && (
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                    Critères d'éligibilité
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                    {call.eligibility_criteria}
                  </p>
                </div>
              )}

              {/* Required Documents */}
              {call.required_documents && call.required_documents.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    Documents requis
                  </h2>
                  <ul className="space-y-2">
                    {call.required_documents.map((doc, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                      >
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {doc.label}
                            {doc.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </p>
                          {doc.description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {doc.description}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Apply Section */}
            <div className="p-6 sm:p-8 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
              {applySuccess ? (
                <div className="flex items-center justify-center gap-3 p-4 bg-green-100 dark:bg-green-900/50 rounded-xl text-green-800 dark:text-green-300">
                  <CheckCircle className="w-6 h-6" />
                  <div>
                    <p className="font-medium">Candidature soumise avec succès!</p>
                    <p className="text-sm">Redirection vers votre tableau de bord...</p>
                  </div>
                </div>
              ) : !isAuthenticated ? (
                <div className="text-center">
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    Connectez-vous en tant qu'entreprise pour soumettre votre candidature
                  </p>
                  <Link
                    href={`/login?redirect=/calls/${call.id}`}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Building2 className="w-5 h-5" />
                    Se connecter
                  </Link>
                </div>
              ) : !isCompany ? (
                <div className="text-center p-4 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
                  <p className="text-amber-800 dark:text-amber-300">
                    Seules les entreprises peuvent soumettre des candidatures.
                  </p>
                </div>
              ) : call.is_upcoming ? (
                <div className="text-center p-4 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                  <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                  <p className="text-blue-800 dark:text-blue-300 font-medium">
                    Cet appel ouvrira bientôt
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    Ouverture le {new Date(call.application_start_date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ) : !call.is_open ? (
                <div className="text-center p-4 bg-slate-200 dark:bg-slate-700 rounded-xl">
                  <p className="text-slate-600 dark:text-slate-400">
                    Cet appel n'est plus ouvert aux candidatures.
                  </p>
                </div>
              ) : checkingApplication ? (
                <div className="text-center p-4 bg-slate-100 dark:bg-slate-700 rounded-xl">
                  <p className="text-slate-600 dark:text-slate-400">
                    Vérification de votre candidature en cours...
                  </p>
                </div>
              ) : applicationCheckFailed ? (
                <div className="text-center p-4 bg-red-100 dark:bg-red-900/50 rounded-xl space-y-2">
                  <p className="text-red-800 dark:text-red-300 font-medium">
                    Impossible de vérifier vos candidatures pour le moment.
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    Veuillez réessayer dans quelques instants.
                  </p>
                </div>
              ) : hasAlreadyApplied ? (
                existingApplication && ["approved", "rejected"].includes(existingApplication.status) ? (
                  <div className="text-center p-4 bg-amber-100 dark:bg-amber-900/50 rounded-xl space-y-2">
                    <p className="text-amber-800 dark:text-amber-300 font-medium">
                      Votre candidature est déjà {existingApplication.status === "approved" ? "approuvée" : "rejetée"} et ne peut plus être modifiée.
                    </p>
                    <Link
                      href="/dashboard?tab=applications"
                      className="inline-flex items-center text-amber-700 dark:text-amber-300 hover:underline text-sm"
                    >
                      Voir mes candidatures
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {!showApplyForm ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            Vous avez déjà une candidature en cours
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            Modifiez vos informations puis enregistrez les changements
                          </p>
                        </div>
                        <button
                          onClick={() => setShowApplyForm(true)}
                          className="btn-primary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                        >
                          <Send className="w-5 h-5" />
                          Modifier ma candidature
                        </button>
                      </div>
                    ) : null}
                    {showApplyForm && (
                      <div className="space-y-5">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                          Modifier la candidature
                        </h3>

                        {applyError && (
                          <div className="flex items-center gap-3 p-4 bg-red-100 dark:bg-red-900/50 rounded-xl text-red-800 dark:text-red-300">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p className="text-sm">{applyError}</p>
                          </div>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Nombre d'employés à former
                            <span className="text-red-500 ml-1">*</span>
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={employeeCount}
                            onChange={(e) => setEmployeeCount(e.target.value)}
                            className="w-full sm:w-40 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="ex: 5"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Lettre de motivation
                            <span className="text-slate-400 ml-1 font-normal">(optionnelle)</span>
                          </label>
                          <textarea
                            rows={4}
                            value={motivationLetter}
                            onChange={(e) => setMotivationLetter(e.target.value)}
                            maxLength={5000}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                            placeholder="Décrivez pourquoi votre entreprise souhaite participer à cette formation..."
                          />
                        </div>

                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Documents requis ({requiredDocs.length})
                          </label>
                          {requiredDocs.map((doc) => {
                            const existingDoc = existingApplication?.documents?.find((d) => d.document_type === doc.type);
                            const selectedFile = selectedDocuments[doc.type];
                            return (
                              <div key={doc.type} className="p-3 rounded-xl border border-slate-200 dark:border-slate-600">
                                <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">{doc.label}</p>
                                {existingDoc && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                    Déjà soumis: {existingDoc.original_filename}
                                  </p>
                                )}
                                <input
                                  type="file"
                                  onChange={(e) =>
                                    setSelectedDocuments((prev) => ({
                                      ...prev,
                                      [doc.type]: e.target.files?.[0] || null,
                                    }))
                                  }
                                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                />
                                {selectedFile && (
                                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 inline-flex items-center gap-1">
                                    <Upload className="w-3.5 h-3.5" />
                                    {selectedFile.name}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <button
                            onClick={handleApply}
                            disabled={applying}
                            className="btn-primary inline-flex items-center gap-2 justify-center disabled:opacity-50"
                          >
                            {applying ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Enregistrement...
                              </>
                            ) : (
                              <>
                                <Send className="w-5 h-5" />
                                Enregistrer les modifications
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => { setShowApplyForm(false); setApplyError(null); }}
                            disabled={applying}
                            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="space-y-6">
                  {!showApplyForm ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          Prêt à postuler?
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Ajoutez le document requis puis confirmez votre candidature
                        </p>
                      </div>
                      <button
                        onClick={() => setShowApplyForm(true)}
                        className="btn-primary inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                      >
                        <Send className="w-5 h-5" />
                        Soumettre ma candidature
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                        Détails de la candidature
                      </h3>

                      {applyError && (
                        <div className="flex items-center gap-3 p-4 bg-red-100 dark:bg-red-900/50 rounded-xl text-red-800 dark:text-red-300">
                          <AlertCircle className="w-5 h-5 flex-shrink-0" />
                          <p className="text-sm">{applyError}</p>
                        </div>
                      )}

                      {/* Employee count */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Nombre d'employés à former
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={employeeCount}
                          onChange={(e) => setEmployeeCount(e.target.value)}
                          className="w-full sm:w-40 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="ex: 5"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Nombre d'employés que vous souhaitez inscrire à la formation
                        </p>
                      </div>

                      {/* Motivation letter */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Lettre de motivation
                          <span className="text-slate-400 ml-1 font-normal">(optionnelle)</span>
                        </label>
                        <textarea
                          rows={4}
                          value={motivationLetter}
                          onChange={(e) => setMotivationLetter(e.target.value)}
                          maxLength={5000}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                          placeholder="Décrivez pourquoi votre entreprise souhaite participer à cette formation..."
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-right">
                          {motivationLetter.length}/5000
                        </p>
                      </div>

                      {/* Required documents upload */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                          Documents requis ({requiredDocs.length})
                          <span className="text-red-500 ml-1">*</span>
                        </label>
                        {requiredDocs.map((doc) => {
                          const selectedFile = selectedDocuments[doc.type];
                          return (
                            <div key={doc.type} className="p-3 rounded-xl border border-slate-200 dark:border-slate-600">
                              <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">{doc.label}</p>
                              <input
                                type="file"
                                onChange={(e) =>
                                  setSelectedDocuments((prev) => ({
                                    ...prev,
                                    [doc.type]: e.target.files?.[0] || null,
                                  }))
                                }
                                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                              />
                              {selectedFile && (
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1 inline-flex items-center gap-1">
                                  <Upload className="w-3.5 h-3.5" />
                                  {selectedFile.name}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <button
                          onClick={handleApply}
                          disabled={applying}
                          className="btn-primary inline-flex items-center gap-2 justify-center disabled:opacity-50"
                        >
                          {applying ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Soumission...
                            </>
                          ) : (
                            <>
                              <Send className="w-5 h-5" />
                              Confirmer la candidature
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => { setShowApplyForm(false); setApplyError(null); }}
                          disabled={applying}
                          className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
