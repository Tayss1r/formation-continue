"use client";

import { useState, useRef, useEffect, FormEvent, KeyboardEvent, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Mail, Loader2, RefreshCw, ArrowLeft, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import AuthLayout from "@/components/auth/AuthLayout";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "";

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError("");

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);

    if (/^\d+$/.test(pastedData)) {
      const newCode = [...code];
      pastedData.split("").forEach((char, index) => {
        if (index < 6) newCode[index] = char;
      });
      setCode(newCode);

      // Focus the last filled input or the next empty one
      const nextIndex = Math.min(pastedData.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");

    if (fullCode.length !== 6) {
      setError("Veuillez entrer le code complet à 6 chiffres");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await apiClient.post("/auth/verify-email-code", {
        email,
        code: fullCode,
      });

      setSuccess(true);

      setTimeout(() => {
        router.push("/login?verified=success");
      }, 2000);
    } catch (err: unknown) {
      const error = err as { message?: string; error_code?: string };
      if (error.error_code === "invalid_verification_code") {
        setError("Code invalide ou expiré. Veuillez réessayer.");
      } else {
        setError(error.message || "Erreur lors de la vérification. Veuillez réessayer.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    setError("");

    try {
      await apiClient.post("/auth/send-verification-code", { email });

      // Set cooldown
      setResendCooldown(60);
    } catch (err) {
      console.error("Resend error:", err);
      setError("Impossible de renvoyer le code. Veuillez réessayer.");
    } finally {
      setIsResending(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Email vérifié!" subtitle="Votre compte est maintenant activé">
        <div className="text-center py-8">
          <div className="w-20 h-20 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            Félicitations !
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Votre email a été vérifié avec succès. Redirection vers la page de connexion...
          </p>
          <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Vérifiez votre email" subtitle="Un code de vérification a été envoyé">
      {/* Back button */}
      <button
        onClick={() => router.push("/signup")}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour
      </button>

      {/* Email display */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-purple-500" />
        </div>
        <p className="text-slate-500 dark:text-slate-400">
          Code envoyé à
        </p>
        <p className="text-purple-500 font-medium">
          {email || "votre adresse email"}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Code inputs */}
        <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`w-12 h-14 text-center text-xl font-bold rounded-xl bg-slate-50 dark:bg-slate-900/50 border ${
                error
                  ? "border-red-500"
                  : "border-slate-200 dark:border-slate-700"
              } text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm text-red-500 text-center mb-4">{error}</p>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading || code.join("").length !== 6}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Vérification...
            </>
          ) : (
            "Vérifier mon email"
          )}
        </button>

        {/* Resend code */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            Vous n&apos;avez pas reçu le code ?
          </p>
          <button
            type="button"
            onClick={handleResendCode}
            disabled={isResending || resendCooldown > 0}
            className="inline-flex items-center gap-2 text-sm text-purple-500 hover:text-purple-400 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isResending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Envoi...
              </>
            ) : resendCooldown > 0 ? (
              <>
                <RefreshCw className="w-4 h-4" />
                Renvoyer dans {resendCooldown}s
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Renvoyer le code
              </>
            )}
          </button>
        </div>
      </form>

      {/* Help text */}
      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
        Vérifiez votre dossier spam si vous ne voyez pas l&apos;email.
      </p>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-[#020817] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
