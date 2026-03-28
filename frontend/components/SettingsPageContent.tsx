"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Key,
  Save,
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield,
  UserCircle,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";

interface UserProfile {
  id: number;
  email: string;
  username: string;
  fullname: string;
  phone: string | null;
  is_verified: boolean;
  role: string;
}

interface EmailChangeResponse {
  message: string;
  email_change_step: "verify_old_email" | "verify_new_email" | "completed";
  pending_email?: string;
  new_email?: string;
}

interface ProfileUpdateData {
  fullname?: string;
  username?: string;
  phone?: string;
  email?: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  staff: "Staff",
  professor: "Professeur",
  employee: "Employé",
  company: "Entreprise",
};

export function SettingsPageContent() {
  const { user, checkAuth, logout, updateUser } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [fullname, setFullname] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Email change modal states
  const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
  const [emailChangeStep, setEmailChangeStep] = useState<"verify_old" | "verify_new" | null>(null);
  const [pendingEmail, setPendingEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState(["", "", "", "", "", ""]);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [emailChangeError, setEmailChangeError] = useState("");
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password change modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordStep, setPasswordStep] = useState<"verify_code" | "new_password" | null>(null);
  const [passwordCode, setPasswordCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isVerifyingPasswordCode, setIsVerifyingPasswordCode] = useState(false);
  const [isSendingPasswordCode, setIsSendingPasswordCode] = useState(false);
  const [passwordModalError, setPasswordModalError] = useState("");
  const passwordCodeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password form states
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  // Messages
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<UserProfile>("/auth/me", true);
      setProfile(data);
      setFullname(data.fullname || "");
      setUsername(data.username || "");
      setPhone(data.phone || "");
      setEmail(data.email || "");
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      setErrorMessage("Impossible de charger le profil");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    const updateData: ProfileUpdateData = {};

    if (fullname !== profile?.fullname) updateData.fullname = fullname;
    if (username !== profile?.username) updateData.username = username;
    if (phone !== (profile?.phone || "")) updateData.phone = phone || undefined;
    if (email !== profile?.email) updateData.email = email;

    if (Object.keys(updateData).length === 0) {
      setIsSaving(false);
      setSuccessMessage("Aucune modification détectée");
      return;
    }

    try {
      const response = await apiClient.request<UserProfile | EmailChangeResponse>(
        "/auth/me",
        { method: "PATCH", body: JSON.stringify(updateData) },
        true
      );

      if ("email_change_step" in response && response.email_change_step === "verify_old_email") {
        setPendingEmail(response.pending_email || email);
        setEmailChangeStep("verify_old");
        setShowEmailChangeModal(true);
        setVerificationCode(["", "", "", "", "", ""]);
        setEmailChangeError("");
        setEmail(profile?.email || "");
        if (Object.keys(updateData).length > 1) await fetchProfile();
      } else {
        const userResponse = response as UserProfile;
        setProfile(userResponse);
        setFullname(userResponse.fullname || "");
        setUsername(userResponse.username || "");
        setPhone(userResponse.phone || "");
        setEmail(userResponse.email || "");
        setSuccessMessage("Profil mis à jour avec succès");
        // Update AuthContext immediately so header name refreshes without re-login
        updateUser({
          first_name: userResponse.fullname?.split(" ")[0] || user?.first_name,
          last_name: userResponse.fullname?.split(" ").slice(1).join(" ") || user?.last_name,
          username: userResponse.username || user?.username,
        });
      }
    } catch (err: unknown) {
      const error = err as { detail?: string; message?: string };
      setErrorMessage(error.detail || error.message || "Erreur lors de la mise à jour");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newCode = [...verificationCode];
      digits.forEach((digit, i) => {
        if (index + i < 6) newCode[index + i] = digit;
      });
      setVerificationCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      codeInputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...verificationCode];
      newCode[index] = value.replace(/\D/g, "");
      setVerificationCode(newCode);
      if (value && index < 5) codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOldEmail = async () => {
    const code = verificationCode.join("");
    if (code.length !== 6) {
      setEmailChangeError("Veuillez entrer le code à 6 chiffres");
      return;
    }
    setIsVerifyingCode(true);
    setEmailChangeError("");
    try {
      const response = await apiClient.post<EmailChangeResponse>("/auth/me/verify-old-email", { code }, true);
      if (response.email_change_step === "verify_new_email") {
        setEmailChangeStep("verify_new");
        setVerificationCode(["", "", "", "", "", ""]);
        setPendingEmail(response.pending_email || pendingEmail);
      }
    } catch (err: unknown) {
      const error = err as { detail?: string; message?: string };
      setEmailChangeError(error.detail || error.message || "Code invalide");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleVerifyNewEmail = async () => {
    const code = verificationCode.join("");
    if (code.length !== 6) {
      setEmailChangeError("Veuillez entrer le code à 6 chiffres");
      return;
    }
    setIsVerifyingCode(true);
    setEmailChangeError("");
    try {
      const response = await apiClient.post<EmailChangeResponse>("/auth/me/verify-new-email", { code }, true);
      if (response.email_change_step === "completed") {
        setShowEmailChangeModal(false);
        setEmailChangeStep(null);
        await logout();
        router.push("/login?message=email_changed");
      }
    } catch (err: unknown) {
      const error = err as { detail?: string; message?: string };
      setEmailChangeError(error.detail || error.message || "Code invalide");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const closeEmailChangeModal = () => {
    setShowEmailChangeModal(false);
    setEmailChangeStep(null);
    setVerificationCode(["", "", "", "", "", ""]);
    setEmailChangeError("");
    setPendingEmail("");
  };

  const handlePasswordCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newCode = [...passwordCode];
      digits.forEach((digit, i) => {
        if (index + i < 6) newCode[index + i] = digit;
      });
      setPasswordCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      passwordCodeInputRefs.current[nextIndex]?.focus();
      return;
    }
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...passwordCode];
    newCode[index] = value;
    setPasswordCode(newCode);
    if (value && index < 5) passwordCodeInputRefs.current[index + 1]?.focus();
  };

  const handlePasswordCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !passwordCode[index] && index > 0) {
      passwordCodeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleSendPasswordCode = async () => {
    if (!profile?.email) {
      setPasswordModalError("Email non disponible");
      return;
    }
    setIsSendingPasswordCode(true);
    setPasswordModalError("");
    try {
      await apiClient.post("/auth/reset_password", { email: profile.email, client: "mobile" });
      setPasswordStep("verify_code");
    } catch (err: unknown) {
      const error = err as { detail?: string; message?: string };
      setPasswordModalError(error.detail || error.message || "Erreur lors de l'envoi du code");
    } finally {
      setIsSendingPasswordCode(false);
    }
  };

  const handleVerifyPasswordCode = async () => {
    const code = passwordCode.join("");
    if (code.length !== 6) {
      setPasswordModalError("Veuillez entrer le code à 6 chiffres");
      return;
    }
    setIsVerifyingPasswordCode(true);
    setPasswordModalError("");
    try {
      await apiClient.post("/auth/verify_reset_code", { email: profile?.email, code });
      setPasswordStep("new_password");
    } catch (err: unknown) {
      const error = err as { detail?: string; message?: string };
      setPasswordModalError(error.detail || error.message || "Code invalide");
    } finally {
      setIsVerifyingPasswordCode(false);
    }
  };

  const handleConfirmNewPassword = async () => {
    if (newPassword.length < 6) {
      setPasswordModalError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordModalError("Les mots de passe ne correspondent pas");
      return;
    }
    setIsVerifyingPasswordCode(true);
    setPasswordModalError("");
    try {
      await apiClient.post("/auth/reset_password_code", {
        email: profile?.email,
        code: passwordCode.join(""),
        new_password: newPassword,
      });
      closePasswordModal();
      setSuccessMessage("Mot de passe modifié avec succès!");
    } catch (err: unknown) {
      const error = err as { detail?: string; message?: string };
      setPasswordModalError(error.detail || error.message || "Erreur lors du changement de mot de passe");
    } finally {
      setIsVerifyingPasswordCode(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordStep(null);
    setPasswordCode(["", "", "", "", "", ""]);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordModalError("");
  };

  const openPasswordModal = () => {
    setShowPasswordModal(true);
    handleSendPasswordCode();
  };

  const clearMessages = () => {
    setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
      setPasswordError("");
      setPasswordSuccess("");
    }, 5000);
  };

  useEffect(() => {
    if (successMessage || errorMessage || passwordError || passwordSuccess) {
      clearMessages();
    }
  }, [successMessage, errorMessage, passwordError, passwordSuccess]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pt-14 lg:pt-0">
      {/* Header */}
      <div className="mb-8">
        <h1 className="heading-display text-2xl lg:text-3xl text-foreground mb-2">
          Paramètres
        </h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles et vos préférences de sécurité
        </p>
      </div>

      {/* Global Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700 dark:text-green-400">{successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{errorMessage}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Profile Information Section */}
        <div className="card-elevated overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="icon-box w-10 h-10">
                <UserCircle className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Informations du Profil
                </h2>
                <p className="text-sm text-muted-foreground">
                  Mettez à jour vos informations personnelles
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Full Name */}
            <div>
              <label htmlFor="fullname" className="block text-sm font-medium text-foreground mb-2">
                Nom Complet
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </span>
                <input
                  type="text"
                  id="fullname"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  className="form-input pl-12 leading-5"
                  placeholder="Votre nom complet"
                  minLength={4}
                  maxLength={20}
                  required
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Entre 4 et 20 caractères</p>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
                Nom d&apos;utilisateur
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 w-12 flex items-center justify-center text-muted-foreground font-semibold">
                  @
                </span>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input pl-14 leading-5"
                  placeholder="username"
                  maxLength={10}
                  required
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Maximum 10 caractères</p>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Adresse Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                </span>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input pl-12 leading-5"
                  placeholder="votre@email.com"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Un email de vérification sera envoyé en cas de changement
              </p>
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                Téléphone <span className="text-muted-foreground font-normal">(optionnel)</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                </span>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input pl-12 leading-5"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </div>

            {/* Account Status */}
            <div className="lg:col-span-2 flex items-center gap-3 p-4 bg-muted rounded-xl">
              <div className={`w-3 h-3 rounded-full ${profile?.is_verified ? "bg-emerald-500" : "bg-amber-500"}`} />
              <div>
                <p className="text-sm font-medium text-foreground">Statut du compte</p>
                <p className="text-xs text-muted-foreground">
                  {profile?.is_verified ? "Email vérifié" : "Email non vérifié - Vérifiez votre boîte mail"}
                </p>
              </div>
              <div className="ml-auto">
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300">
                  {ROLE_LABELS[profile?.role || ""] || profile?.role || "Utilisateur"}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="lg:col-span-2 flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary inline-flex items-center gap-2 px-6 py-3"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Enregistrer les modifications
              </button>
            </div>
          </form>
        </div>

        {/* Security Section */}
        <div className="card-elevated overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="icon-box w-10 h-10 bg-amber-100 dark:bg-amber-500/20 border-amber-200">
                <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Sécurité</h2>
                <p className="text-sm text-muted-foreground">
                  Gérez votre mot de passe et la sécurité de votre compte
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {passwordSuccess && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <p className="text-green-700 dark:text-green-400">{passwordSuccess}</p>
              </div>
            )}
            {passwordError && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 dark:text-red-400">{passwordError}</p>
              </div>
            )}

            <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Mot de passe</p>
                  <p className="text-xs text-muted-foreground">Cliquez pour modifier votre mot de passe</p>
                </div>
              </div>
              <button
                onClick={openPasswordModal}
                disabled={isSendingPasswordCode}
                className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSendingPasswordCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Modifier"}
              </button>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-muted rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Connecté en tant que{" "}
            <span className="font-medium text-foreground">{user?.email}</span>
          </p>
        </div>
      </div>

      {/* Email Change Verification Modal */}
      {showEmailChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeEmailChangeModal} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <button
              onClick={closeEmailChangeModal}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-primary flex items-center justify-center">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {emailChangeStep === "verify_old"
                  ? "Vérification de votre email actuel"
                  : "Confirmation du nouvel email"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {emailChangeStep === "verify_old" ? (
                  <>
                    Un code à 6 chiffres a été envoyé à <br />
                    <span className="font-medium text-foreground">{profile?.email}</span>
                  </>
                ) : (
                  <>
                    Un code à 6 chiffres a été envoyé à <br />
                    <span className="font-medium text-foreground">{pendingEmail}</span>
                  </>
                )}
              </p>
            </div>

            {emailChangeError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">{emailChangeError}</p>
              </div>
            )}

            <div className="flex justify-center gap-2 mb-6">
              {verificationCode.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { codeInputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold bg-muted border-2 border-border rounded-xl text-foreground focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                />
              ))}
            </div>

            <div className="flex justify-center gap-2 mb-6">
              <div className={`w-3 h-3 rounded-full ${emailChangeStep === "verify_old" ? "bg-primary-500" : "bg-green-500"}`} />
              <div className={`w-3 h-3 rounded-full ${emailChangeStep === "verify_new" ? "bg-primary-500" : "bg-muted-foreground/30"}`} />
            </div>

            <button
              onClick={emailChangeStep === "verify_old" ? handleVerifyOldEmail : handleVerifyNewEmail}
              disabled={isVerifyingCode || verificationCode.join("").length !== 6}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {isVerifyingCode ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : emailChangeStep === "verify_old" ? (
                "Vérifier et continuer"
              ) : (
                "Confirmer le changement"
              )}
            </button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              {emailChangeStep === "verify_old"
                ? "Étape 1 sur 2 : Vérification de l'email actuel"
                : "Étape 2 sur 2 : Confirmation du nouvel email"}
            </p>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closePasswordModal} />
          <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <button
              onClick={closePasswordModal}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Key className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {passwordStep === "verify_code"
                  ? "Vérification du code"
                  : passwordStep === "new_password"
                  ? "Nouveau mot de passe"
                  : "Envoi du code..."}
              </h3>
              <p className="text-sm text-muted-foreground">
                {passwordStep === "verify_code" ? (
                  <>
                    Un code à 6 chiffres a été envoyé à <br />
                    <span className="font-medium text-foreground">{profile?.email}</span>
                  </>
                ) : passwordStep === "new_password" ? (
                  "Entrez votre nouveau mot de passe"
                ) : (
                  "Veuillez patienter..."
                )}
              </p>
            </div>

            {passwordModalError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">{passwordModalError}</p>
              </div>
            )}

            {!passwordStep && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              </div>
            )}

            {passwordStep === "verify_code" && (
              <>
                <div className="flex justify-center gap-2 mb-6">
                  {passwordCode.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => { passwordCodeInputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handlePasswordCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handlePasswordCodeKeyDown(index, e)}
                      className="w-12 h-14 text-center text-2xl font-bold bg-muted border-2 border-border rounded-xl text-foreground focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    />
                  ))}
                </div>
                <div className="flex justify-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                </div>
                <button
                  onClick={handleVerifyPasswordCode}
                  disabled={isVerifyingPasswordCode || passwordCode.join("").length !== 6}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isVerifyingPasswordCode ? <Loader2 className="w-5 h-5 animate-spin" /> : "Vérifier le code"}
                </button>
                <p className="text-xs text-muted-foreground text-center mt-4">Étape 1 sur 2 : Vérification du code</p>
              </>
            )}

            {passwordStep === "new_password" && (
              <>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Nouveau mot de passe</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-muted border-2 border-border rounded-xl text-foreground placeholder-muted-foreground focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Confirmer le mot de passe</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-muted border-2 border-border rounded-xl text-foreground placeholder-muted-foreground focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="flex justify-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                </div>
                <button
                  onClick={handleConfirmNewPassword}
                  disabled={isVerifyingPasswordCode || !newPassword || !confirmPassword}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isVerifyingPasswordCode ? <Loader2 className="w-5 h-5 animate-spin" /> : "Changer le mot de passe"}
                </button>
                <p className="text-xs text-muted-foreground text-center mt-4">Étape 2 sur 2 : Nouveau mot de passe</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
