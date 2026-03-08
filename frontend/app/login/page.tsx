"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthLayout from "@/components/auth/AuthLayout";
import FormInput from "@/components/ui/FormInput";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const user = await login(email, password);
      
      // Role-based redirect
      if (user?.role === "staff" || user?.role === "admin") {
        router.push("/staff");
      } else if (user?.role === "coordinator") {
        router.push("/coordinator");
      } else if (user?.role === "company") {
        router.push("/courses");
      } else if (user?.role === "professor") {
        router.push("/professor");
      } else if (user?.role === "employee") {
        router.push("/employee/dashboard");
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      const error = err as { message?: string; error_code?: string };
      if (error.error_code === "account_not_verified") {
        setError("Votre compte n'est pas encore vérifié. Veuillez vérifier votre email.");
      } else if (error.error_code === "account_pending") {
        router.push(`/pending-approval?email=${encodeURIComponent(email)}`);
        return;
      } else if (error.error_code === "account_rejected") {
        setError("Votre demande de compte a été rejetée. Contactez-nous pour plus d'informations.");
      } else if (error.error_code === "account_blocked") {
        setError("Votre compte a été bloqué. Contactez l'administration.");
      } else {
        setError(error.message || "Email ou mot de passe incorrect");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Connexion" 
      subtitle="Connectez-vous à votre espace"
    >
      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-red-600 dark:text-red-400 text-sm">
            {error}
            {error.includes("vérifié") && (
              <Link 
                href={`/verify-email?email=${encodeURIComponent(email)}`}
                className="block mt-2 text-red-700 dark:text-red-300 underline hover:no-underline"
              >
                Renvoyer le code de vérification
              </Link>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
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

        {/* Password */}
        <FormInput
          id="password"
          label="Mot de passe"
          icon={Lock}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          showPasswordToggle
          required
        />

        {/* Forgot Password */}
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full h-12 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Connexion en cours...
            </>
          ) : (
            "Se connecter"
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-background text-muted-foreground">
            Pas encore de compte ?
          </span>
        </div>
      </div>

      {/* Sign Up Link */}
      <Link
        href="/signup"
        className="btn-secondary block w-full h-12 flex items-center justify-center text-center"
      >
        Créer un compte
      </Link>
    </AuthLayout>
  );
}
