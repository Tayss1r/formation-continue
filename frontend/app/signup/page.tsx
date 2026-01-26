"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  User,
  Building2,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  Check,
  Phone,
  Briefcase,
  FileText,
  BookOpen,
} from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import { apiClient } from "@/lib/api";

type UserRole = "company" | "professor";

interface SignupData {
  role: UserRole;
  email: string;
  password: string;
  confirmPassword: string;
  fullname: string;
  phone: string;
  username: string;
  // Company fields
  company_name: string;
  industry_sector: string;
  billing_info: string;
  // Professor fields
  specialization: string;
}

const initialData: SignupData = {
  role: "company",
  email: "",
  password: "",
  confirmPassword: "",
  fullname: "",
  phone: "",
  username: "",
  company_name: "",
  industry_sector: "",
  billing_info: "",
  specialization: "",
};

// Staff role removed from public signup - staff accounts created by admin only
const roleOptions = [
  {
    value: "company" as UserRole,
    label: "Entreprise",
    description: "Inscrivez votre entreprise pour former vos employés",
    icon: Building2,
    color: "from-emerald-500 to-teal-500",
  },
  {
    value: "professor" as UserRole,
    label: "Professeur",
    description: "Rejoignez notre équipe de formateurs",
    icon: GraduationCap,
    color: "from-purple-500 to-pink-500",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<SignupData>(initialData);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof SignupData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    setError("");
  };

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!data.email) errors.email = "L'email est requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = "Format d'email invalide";
    }

    if (!data.password) errors.password = "Le mot de passe est requis";
    else if (data.password.length < 8) {
      errors.password = "Le mot de passe doit contenir au moins 8 caractères";
    }

    if (data.password !== data.confirmPassword) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas";
    }

    if (!data.fullname) errors.fullname = "Le nom complet est requis";
    else if (data.fullname.length < 2) {
      errors.fullname = "Le nom doit contenir au moins 2 caractères";
    }

    // Role-specific validation
    if (data.role === "professor") {
      if (!data.username) errors.username = "Le nom d'utilisateur est requis";
      else if (data.username.length < 3) {
        errors.username = "Le nom d'utilisateur doit contenir au moins 3 caractères";
      }
    }

    if (data.role === "company") {
      if (!data.company_name) errors.company_name = "Le nom de l'entreprise est requis";
      if (!data.industry_sector) errors.industry_sector = "Le secteur d'activité est requis";
      if (!data.billing_info) errors.billing_info = "Les informations de facturation sont requises";
    }

    if (data.role === "professor") {
      if (!data.specialization) errors.specialization = "La spécialisation est requise";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setIsLoading(true);
    setError("");

    try {
      const payload: Record<string, unknown> = {
        role: data.role,
        email: data.email,
        password: data.password,
        fullname: data.fullname,
        phone: data.phone || undefined,
      };

      if (data.role === "professor") {
        payload.username = data.username;
      }

      if (data.role === "company") {
        payload.company_name = data.company_name;
        payload.industry_sector = data.industry_sector;
        payload.billing_info = data.billing_info;
      }

      if (data.role === "professor") {
        payload.specialization = data.specialization;
      }

      await apiClient.post("/auth/signup", payload);

      // Redirect to verification page
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (err: unknown) {
      const error = err as { message?: string; detail?: { message?: string } };
      setError(error.detail?.message || error.message || "Erreur lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };

  const goToStep2 = () => {
    if (data.role) {
      setStep(2);
    }
  };

  const goBack = () => {
    if (step === 2) {
      setStep(1);
      setFieldErrors({});
      setError("");
    }
  };

  return (
    <AuthLayout
      title={step === 1 ? "Créer un compte" : `Inscription ${roleOptions.find((r) => r.value === data.role)?.label}`}
      subtitle={step === 1 ? "Choisissez votre type de compte" : "Remplissez vos informations"}
    >
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
            step >= 1
              ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white"
              : "bg-slate-200 dark:bg-slate-700 text-slate-500"
          }`}
        >
          {step > 1 ? <Check className="w-4 h-4" /> : "1"}
        </div>
        <div
          className={`w-16 h-1 rounded-full transition-all ${
            step >= 2 ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-slate-200 dark:bg-slate-700"
          }`}
        />
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
            step >= 2
              ? "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white"
              : "bg-slate-200 dark:bg-slate-700 text-slate-500"
          }`}
        >
          2
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Step 1: Role Selection */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {roleOptions.map((role) => (
            <button
              key={role.value}
              onClick={() => updateField("role", role.value)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-center gap-4 group ${
                data.role === role.value
                  ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center flex-shrink-0`}
              >
                <role.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">{role.label}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{role.description}</p>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  data.role === role.value
                    ? "border-purple-500 bg-purple-500"
                    : "border-slate-300 dark:border-slate-600"
                }`}
              >
                {data.role === role.value && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>
          ))}

          <button
            onClick={goToStep2}
            disabled={!data.role}
            className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
          >
            Continuer
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Step 2: Form Fields */}
      {step === 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-4 animate-in fade-in duration-300"
        >
          {/* Back Button */}
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 text-sm transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au choix du rôle
          </button>

          {/* Common Fields */}
          <div className="grid grid-cols-1 gap-4">
            {/* Username (Staff & Professor) */}
            {(data.role === "staff" || data.role === "professor") && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nom d&apos;utilisateur *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={data.username}
                    onChange={(e) => updateField("username", e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border ${
                      fieldErrors.username ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                    } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all`}
                    placeholder="johndoe"
                  />
                </div>
                {fieldErrors.username && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.username}</p>
                )}
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {data.role === "company" ? "Nom du contact *" : "Nom complet *"}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={data.fullname}
                  onChange={(e) => updateField("fullname", e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border ${
                    fieldErrors.fullname ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                  } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all`}
                  placeholder="Jean Dupont"
                />
              </div>
              {fieldErrors.fullname && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.fullname}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={data.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border ${
                    fieldErrors.email ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                  } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all`}
                  placeholder="jean@example.com"
                />
              </div>
              {fieldErrors.email && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* Phone (Optional) */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Téléphone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  value={data.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </div>

            {/* Company-specific fields */}
            {data.role === "company" && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nom de l&apos;entreprise *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={data.company_name}
                      onChange={(e) => updateField("company_name", e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border ${
                        fieldErrors.company_name ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                      } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all`}
                      placeholder="Acme Corp"
                    />
                  </div>
                  {fieldErrors.company_name && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.company_name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Secteur d&apos;activité *
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={data.industry_sector}
                      onChange={(e) => updateField("industry_sector", e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border ${
                        fieldErrors.industry_sector ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                      } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all`}
                      placeholder="Technologies, Finance, Santé..."
                    />
                  </div>
                  {fieldErrors.industry_sector && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.industry_sector}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Informations de facturation *
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <textarea
                      value={data.billing_info}
                      onChange={(e) => updateField("billing_info", e.target.value)}
                      rows={3}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border ${
                        fieldErrors.billing_info ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                      } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none`}
                      placeholder="Adresse, SIRET, TVA..."
                    />
                  </div>
                  {fieldErrors.billing_info && (
                    <p className="text-red-500 text-xs mt-1">{fieldErrors.billing_info}</p>
                  )}
                </div>
              </>
            )}

            {/* Professor-specific fields */}
            {data.role === "professor" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Spécialisation *
                </label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={data.specialization}
                    onChange={(e) => updateField("specialization", e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border ${
                      fieldErrors.specialization ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                    } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all`}
                    placeholder="Intelligence Artificielle, Finance, Marketing..."
                  />
                </div>
                {fieldErrors.specialization && (
                  <p className="text-red-500 text-xs mt-1">{fieldErrors.specialization}</p>
                )}
              </div>
            )}

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Mot de passe *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={data.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  className={`w-full pl-10 pr-12 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border ${
                    fieldErrors.password ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                  } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Confirmer le mot de passe *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={data.confirmPassword}
                  onChange={(e) => updateField("confirmPassword", e.target.value)}
                  className={`w-full pl-10 pr-12 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border ${
                    fieldErrors.confirmPassword ? "border-red-500" : "border-slate-200 dark:border-slate-700"
                  } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Création du compte...
              </>
            ) : (
              <>
                Créer mon compte
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
            Déjà inscrit ?
          </span>
        </div>
      </div>

      {/* Login Link */}
      <Link
        href="/login"
        className="block w-full py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-center hover:border-purple-500 hover:text-purple-500 dark:hover:border-purple-500 dark:hover:text-purple-400 transition-all"
      >
        Se connecter
      </Link>
    </AuthLayout>
  );
}
