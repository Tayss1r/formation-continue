"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  validateEnrollmentCode,
  enrollWithCode,
  EnrollmentCodeInfo,
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

export default function EnrollPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const [code, setCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [codeInfo, setCodeInfo] = useState<EnrollmentCodeInfo | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login?redirect=/employee/enroll");
    }
  }, [user, isLoading, router]);

  const handleValidateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCodeInfo(null);
    setSuccess("");

    if (!code.trim()) {
      setError("Veuillez saisir un code");
      return;
    }

    setValidating(true);
    try {
      const info = await validateEnrollmentCode(code.trim().toUpperCase());
      setCodeInfo(info);
      if (!info.valid) {
        setError(info.message);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setValidating(false);
    }
  };

  const handleEnroll = async () => {
    setError("");
    setSuccess("");
    setEnrolling(true);

    try {
      await enrollWithCode(code.trim().toUpperCase());
      setSuccess("Inscription réussie ! Vous allez être redirigé vers votre tableau de bord.");
      setTimeout(() => {
        router.push("/employee/dashboard");
      }, 2000);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setEnrolling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Inscription à une formation
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Saisissez le code d&apos;inscription fourni par votre entreprise
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-700 dark:text-green-400">{success}</p>
          </div>
        )}

        {/* Code Input Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <form onSubmit={handleValidateCode} className="space-y-4">
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Code d&apos;inscription
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setCodeInfo(null);
                  setError("");
                }}
                placeholder="Ex: ABC123XY"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-xl tracking-widest font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={12}
              />
            </div>

            <button
              type="submit"
              disabled={validating || !code.trim()}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
            >
              {validating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Vérification...
                </>
              ) : (
                "Vérifier le code"
              )}
            </button>
          </form>

          {/* Code Info Display */}
          {codeInfo && codeInfo.valid && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Détails de la formation
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Formation</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {codeInfo.session_info?.course_title}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Entreprise</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {codeInfo.company_name}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Dates</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {codeInfo.session_info?.start_date
                      ? new Date(codeInfo.session_info.start_date).toLocaleDateString("fr-FR")
                      : "N/A"}{" "}
                    -{" "}
                    {codeInfo.session_info?.end_date
                      ? new Date(codeInfo.session_info.end_date).toLocaleDateString("fr-FR")
                      : "N/A"}
                  </span>
                </div>
                
                {codeInfo.session_info?.schedule && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Horaires</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {codeInfo.session_info.schedule}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Places restantes</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {codeInfo.remaining_spots}
                  </span>
                </div>
              </div>

              <button
                onClick={handleEnroll}
                disabled={enrolling || (codeInfo.remaining_spots ?? 0) <= 0}
                className="mt-6 w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
              >
                {enrolling ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Inscription en cours...
                  </>
                ) : (
                  "Confirmer mon inscription"
                )}
              </button>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Vous n&apos;avez pas de code ? Contactez le responsable formation de votre entreprise.
          </p>
          <a
            href="/employee/dashboard"
            className="mt-2 inline-block text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Voir mes inscriptions →
          </a>
        </div>
      </div>
    </div>
  );
}
