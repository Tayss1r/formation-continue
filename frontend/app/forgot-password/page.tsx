"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft, KeyRound, Lock } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import FormInput from "@/components/ui/FormInput";
import { apiClient } from "@/lib/api";

type Step = "email" | "code" | "reset" | "success";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await apiClient.post("/auth/reset_password", { email, client: "mobile" });
      setMessage("Un code de vérification a été envoyé à votre adresse email.");
      setStep("code");
    } catch (err: unknown) {
      const error = err as { message?: string; detail?: { message?: string } };
      setError(error.detail?.message || error.message || "Une erreur s'est produite. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await apiClient.post("/auth/verify_reset_code", { email, code });
      setMessage("");
      setStep("reset");
    } catch (err: unknown) {
      const error = err as { message?: string; detail?: { message?: string } };
      setError(error.detail?.message || error.message || "Code invalide. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post("/auth/reset_password_code", {
        email,
        code,
        new_password: newPassword,
      });
      setStep("success");
    } catch (err: unknown) {
      const error = err as { message?: string; detail?: { message?: string } };
      setError(error.detail?.message || error.message || "Une erreur s'est produite. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (step) {
      case "email":
        return "Mot de passe oublié";
      case "code":
        return "Vérification";
      case "reset":
        return "Nouveau mot de passe";
      case "success":
        return "Succès !";
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case "email":
        return "Entrez votre email pour recevoir un code de réinitialisation";
      case "code":
        return "Entrez le code à 6 chiffres envoyé à votre email";
      case "reset":
        return "Choisissez un nouveau mot de passe sécurisé";
      case "success":
        return "Votre mot de passe a été réinitialisé avec succès";
    }
  };

  return (
    <AuthLayout title={getTitle()} subtitle={getSubtitle()}>
      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {message && step !== "success" && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-green-600 dark:text-green-400 text-sm">{message}</p>
        </div>
      )}

      {/* Step 1: Email */}
      {step === "email" && (
        <form onSubmit={handleRequestCode} className="space-y-5">
          <FormInput
            id="email"
            type="email"
            label="Email"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            required
          />

          <button
            type="submit"
            disabled={isLoading || !email}
            className="btn-primary w-full h-12 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              "Envoyer le code"
            )}
          </button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary-600 transition-colors mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la connexion
          </Link>
        </form>
      )}

      {/* Step 2: Verify Code */}
      {step === "code" && (
        <form onSubmit={handleVerifyCode} className="space-y-5">
          <FormInput
            id="code"
            type="text"
            label="Code de vérification"
            icon={KeyRound}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            maxLength={6}
            required
          />
          <p className="text-sm text-muted-foreground">
            Un code à 6 chiffres a été envoyé à <strong>{email}</strong>
          </p>

          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="btn-primary w-full h-12 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Vérification...
              </>
            ) : (
              "Vérifier le code"
            )}
          </button>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError("");
                setMessage("");
              }}
              className="text-sm text-muted-foreground hover:text-primary-600 transition-colors"
            >
              Changer d'email
            </button>
            <button
              type="button"
              onClick={handleRequestCode}
              disabled={isLoading}
              className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
            >
              Renvoyer le code
            </button>
          </div>
        </form>
      )}

      {/* Step 3: New Password */}
      {step === "reset" && (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <FormInput
            id="newPassword"
            label="Nouveau mot de passe"
            icon={Lock}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            showPasswordToggle
            required
            hint="Minimum 8 caractères"
          />

          <FormInput
            id="confirmPassword"
            label="Confirmer le mot de passe"
            icon={Lock}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            showPasswordToggle
            required
          />

          <button
            type="submit"
            disabled={isLoading || !newPassword || !confirmPassword}
            className="btn-primary w-full h-12 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Réinitialisation...
              </>
            ) : (
              "Réinitialiser le mot de passe"
            )}
          </button>
        </form>
      )}

      {/* Step 4: Success */}
      {step === "success" && (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-foreground">
              Votre mot de passe a été réinitialisé avec succès.
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
          </div>
          <Link
            href="/login"
            className="btn-primary inline-flex items-center justify-center gap-2 w-full h-12"
          >
            Se connecter
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
