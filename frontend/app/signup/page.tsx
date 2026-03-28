"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Lock,
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
  Users,
  Upload,
  ShieldAlert,
} from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import FormInput, { FormTextarea, FileUpload } from "@/components/ui/FormInput";
import { apiClient } from "@/lib/api";
import {
  validateEmployeeInvitation,
  registerEmployeeViaInvitation,
} from "@/lib/invitations";
import type { EmployeeInvitationInfo } from "@/types/invitation";

type UserRole = "company" | "professor" | "employee";

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
  // Document upload
  verificationDocument: File | null;
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
  verificationDocument: null,
};

// Staff role removed from public signup - staff accounts created by admin only
const roleOptions = [
  {
    value: "company" as UserRole,
    label: "Entreprise",
    description: "Inscrivez votre entreprise pour former vos employés",
    icon: Building2,
    color: "from-emerald-500 to-teal-500",
    requiresDocument: true,
    documentLabel: "Document d'enregistrement légal",
    documentHint: "Registre de commerce, SIRET, ou tout document officiel prouvant l'existence légale de votre entreprise",
  },
  {
    value: "professor" as UserRole,
    label: "Professeur",
    description: "Rejoignez notre équipe de formateurs",
    icon: GraduationCap,
    color: "from-primary-500 to-primary-600",
    requiresDocument: true,
    documentLabel: "Diplôme ou certification",
    documentHint: "Diplôme universitaire, certification professionnelle, ou contrat de travail académique",
  },
  {
    value: "employee" as UserRole,
    label: "Employé",
    description: "Inscrivez-vous pour participer aux formations de votre entreprise",
    icon: Users,
    color: "from-primary-400 to-primary-600",
    requiresDocument: false,
    documentLabel: "",
    documentHint: "",
  },
];

const professorSpecializationOptions = [
  "Génie civil",
  "Technologie de l'informatique",
  "Génie mécanique",
  "Génie électrique",
  "Sciences Économiques et Sciences de Gestion",
];

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get("token") || "";
  const isInvitationMode = !!invitationToken;

  const [step, setStep] = useState(isInvitationMode ? 2 : 1);
  const [data, setData] = useState<SignupData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isInvitationLoading, setIsInvitationLoading] = useState(isInvitationMode);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [invitationInfo, setInvitationInfo] = useState<EmployeeInvitationInfo | null>(null);

  const selectedRole = roleOptions.find((r) => r.value === data.role);

  useEffect(() => {
    if (!isInvitationMode) return;

    const loadInvitation = async () => {
      setIsInvitationLoading(true);
      setError("");
      try {
        const info = await validateEmployeeInvitation(invitationToken);
        if (info.is_used) {
          setError("Cette invitation a déjà été utilisée. Veuillez vous connecter.");
          return;
        }

        setInvitationInfo(info);
        setData((prev) => ({
          ...prev,
          role: "employee",
          fullname: info.employee_name || prev.fullname,
          email: info.employee_email || prev.email,
        }));
        setStep(2);
      } catch (err: any) {
        setError(err?.message || "Invitation invalide ou expirée");
      } finally {
        setIsInvitationLoading(false);
      }
    };

    loadInvitation();
  }, [isInvitationMode, invitationToken]);

  const updateField = (field: keyof SignupData, value: string | File | null) => {
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
      if (!data.specialization) errors.specialization = "La spécialisation est requise";
    }

    if (data.role === "company") {
      if (!data.company_name) errors.company_name = "Le nom de l'entreprise est requis";
      if (!data.industry_sector) errors.industry_sector = "Le secteur d'activité est requis";
      if (!data.billing_info) errors.billing_info = "Les informations de facturation sont requises";
    }

    // Document validation for company and professor
    if (selectedRole?.requiresDocument && !data.verificationDocument) {
      errors.verificationDocument = "Le document de vérification est obligatoire";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setIsLoading(true);
    setError("");

    try {
      if (isInvitationMode) {
        await registerEmployeeViaInvitation({
          token: invitationToken,
          fullname: data.fullname,
          email: data.email,
          password: data.password,
        });
        router.push(`/login?email=${encodeURIComponent(data.email)}`);
        return;
      }

      // Step 1: Create user account (JSON request)
      const signupData: Record<string, string> = {
        role: data.role,
        email: data.email,
        password: data.password,
        fullname: data.fullname,
      };

      if (data.phone) signupData.phone = data.phone;

      if (data.role === "professor") {
        signupData.username = data.username;
        signupData.specialization = data.specialization;
      }

      if (data.role === "company") {
        signupData.company_name = data.company_name;
        signupData.industry_sector = data.industry_sector;
        signupData.billing_info = data.billing_info;
      }

      await apiClient.post("/auth/signup", signupData);

      // Step 2: Upload verification document if required
      if (data.verificationDocument && selectedRole?.requiresDocument) {
        const formData = new FormData();
        formData.append("email", data.email);
        formData.append("document", data.verificationDocument);

        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/upload-verification-document`, {
          method: "POST",
          body: formData,
        });
      }

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
      title={isInvitationMode ? "Inscription Employé" : step === 1 ? "Créer un compte" : `Inscription ${selectedRole?.label}`}
      subtitle={step === 1 ? "Choisissez votre type de compte" : "Remplissez vos informations"}
    >
      {isInvitationLoading && (
        <div className="mb-6 p-4 rounded-xl border border-border bg-muted/40 text-sm text-muted-foreground">
          Vérification de votre invitation...
        </div>
      )}

      {isInvitationMode && invitationInfo && !isInvitationLoading && (
        <div className="mb-6 p-4 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 text-sm">
          <p className="text-primary-700 dark:text-primary-300">
            Invitation de <strong>{invitationInfo.company_name}</strong> pour l&apos;appel <strong>{invitationInfo.call_title}</strong> ({invitationInfo.call_reference}).
          </p>
          <p className="text-primary-700 dark:text-primary-300 mt-2">
            Après examen, les résultats d&apos;admission sont publiés dans les actualités avec un fichier téléchargeable.
          </p>
        </div>
      )}

      {/* Progress Steps */}
      {!isInvitationMode && (
      <div className="flex items-center justify-center gap-3 mb-6">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
            step >= 1
              ? "gradient-primary text-white"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {step > 1 ? <Check className="w-4 h-4" /> : "1"}
        </div>
        <div
          className={`w-16 h-1 rounded-full transition-all ${
            step >= 2 ? "gradient-primary" : "bg-muted"
          }`}
        />
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
            step >= 2
              ? "gradient-primary text-white"
              : "bg-muted text-muted-foreground"
          }`}
        >
          2
        </div>
      </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {isInvitationMode && !isInvitationLoading && !invitationInfo && (
        <Link
          href="/login"
          className="btn-secondary block w-full h-12 flex items-center justify-center text-center"
        >
          Se connecter
        </Link>
      )}

      {/* Step 1: Role Selection */}
      {!isInvitationMode && step === 1 && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {roleOptions.map((role) => (
            <button
              key={role.value}
              onClick={() => updateField("role", role.value)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-start gap-4 group ${
                data.role === role.value
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                  : "border-border hover:border-primary-300 dark:hover:border-primary-700"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center flex-shrink-0`}
              >
                <role.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{role.label}</h3>
                  {role.requiresDocument && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <ShieldAlert className="w-3 h-3" />
                      Vérification
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{role.description}</p>
                {role.requiresDocument && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Document requis pour validation
                  </p>
                )}
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 mt-1 ${
                  data.role === role.value
                    ? "border-primary-500 bg-primary-500"
                    : "border-muted-foreground/30"
                }`}
              >
                {data.role === role.value && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>
          ))}

          <button
            onClick={goToStep2}
            disabled={!data.role}
            className="btn-primary w-full h-12 mt-4 flex items-center justify-center gap-2"
          >
            Continuer
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Step 2: Form Fields */}
      {step === 2 && (!isInvitationMode || !!invitationInfo) && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-5 animate-in fade-in duration-300"
        >
          {/* Back Button */}
          {!isInvitationMode && (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au choix du rôle
            </button>
          )}

          {/* Verification Notice for Company/Professor */}
          {selectedRole?.requiresDocument && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Vérification requise
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    Votre compte sera en attente d&apos;approbation jusqu&apos;à ce que notre équipe vérifie vos documents. 
                    Vous recevrez un email une fois votre compte activé.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Employee info message */}
          {data.role === "employee" && !isInvitationMode && (
            <div className="p-4 bg-primary-50 dark:bg-primary-900/30 rounded-xl border border-primary-200 dark:border-primary-800">
              <p className="text-sm text-primary-700 dark:text-primary-300">
                <strong>Note :</strong> Après votre inscription, vous pourrez utiliser le code d&apos;inscription 
                fourni par votre entreprise pour vous inscrire aux formations.
              </p>
            </div>
          )}

          {/* Username (Professor only) */}
          {data.role === "professor" && (
            <FormInput
              id="username"
              label="Nom d'utilisateur *"
              icon={User}
              value={data.username}
              onChange={(e) => updateField("username", e.target.value)}
              placeholder="johndoe"
              error={fieldErrors.username}
            />
          )}

          {/* Full Name */}
          <FormInput
            id="fullname"
            label={data.role === "company" ? "Nom du contact *" : "Nom complet *"}
            icon={User}
            value={data.fullname}
            onChange={(e) => updateField("fullname", e.target.value)}
            placeholder="Jean Dupont"
            error={fieldErrors.fullname}
          />

          {/* Email */}
          <FormInput
            id="email"
            type="email"
            label="Email *"
            icon={Mail}
            value={data.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="jean@example.com"
            error={fieldErrors.email}
          />

          {/* Phone (Optional) */}
          <FormInput
            id="phone"
            type="tel"
            label="Téléphone"
            icon={Phone}
            value={data.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="+33 6 12 34 56 78"
          />

          {/* Company-specific fields */}
          {data.role === "company" && (
            <>
              <FormInput
                id="company_name"
                label="Nom de l'entreprise *"
                icon={Building2}
                value={data.company_name}
                onChange={(e) => updateField("company_name", e.target.value)}
                placeholder="Acme Corp"
                error={fieldErrors.company_name}
              />

              <FormInput
                id="industry_sector"
                label="Secteur d'activité *"
                icon={Briefcase}
                value={data.industry_sector}
                onChange={(e) => updateField("industry_sector", e.target.value)}
                placeholder="Technologies, Finance, Santé..."
                error={fieldErrors.industry_sector}
              />

              <FormTextarea
                id="billing_info"
                label="Informations de facturation *"
                icon={FileText}
                value={data.billing_info}
                onChange={(e) => updateField("billing_info", e.target.value)}
                placeholder="Adresse, SIRET, TVA..."
                error={fieldErrors.billing_info}
              />
            </>
          )}

          {/* Professor-specific fields */}
          {data.role === "professor" && (
            <div className="space-y-1.5">
              <label htmlFor="specialization" className="block text-sm font-medium text-foreground">
                Spécialisation *
              </label>
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none">
                  <BookOpen className="w-[18px] h-[18px] text-muted-foreground" />
                </div>
                <select
                  id="specialization"
                  value={data.specialization}
                  onChange={(e) => updateField("specialization", e.target.value)}
                  className={`
                    w-full h-12 pl-11 pr-4
                    bg-card border rounded-xl text-[15px] text-foreground
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                    ${fieldErrors.specialization
                      ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                      : "border-border hover:border-primary-300 dark:hover:border-primary-700"
                    }
                  `}
                >
                  <option value="">Sélectionner une spécialisation</option>
                  {professorSpecializationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              {fieldErrors.specialization && (
                <p className="text-sm text-red-500 mt-1">{fieldErrors.specialization}</p>
              )}
            </div>
          )}

          {/* Document Upload for Company and Professor */}
          {selectedRole?.requiresDocument && (
            <FileUpload
              label={selectedRole.documentLabel}
              icon={Upload}
              value={data.verificationDocument}
              onChange={(file) => updateField("verificationDocument", file)}
              hint={selectedRole.documentHint}
              error={fieldErrors.verificationDocument}
              required
              accept=".pdf,.jpg,.jpeg,.png"
            />
          )}

          {/* Password */}
          <FormInput
            id="password"
            label="Mot de passe *"
            icon={Lock}
            value={data.password}
            onChange={(e) => updateField("password", e.target.value)}
            placeholder="••••••••"
            showPasswordToggle
            error={fieldErrors.password}
            hint="Minimum 8 caractères"
          />

          {/* Confirm Password */}
          <FormInput
            id="confirmPassword"
            label="Confirmer le mot de passe *"
            icon={Lock}
            value={data.confirmPassword}
            onChange={(e) => updateField("confirmPassword", e.target.value)}
            placeholder="••••••••"
            showPasswordToggle
            error={fieldErrors.confirmPassword}
          />

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full h-12 mt-2 flex items-center justify-center gap-2"
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
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-background text-muted-foreground">
            Déjà inscrit ?
          </span>
        </div>
      </div>

      {/* Login Link */}
      <Link
        href="/login"
        className="btn-secondary block w-full h-12 flex items-center justify-center text-center"
      >
        Se connecter
      </Link>
    </AuthLayout>
  );
}
