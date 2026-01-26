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
  Building2,
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

export default function SettingsPage() {
  const { user, checkAuth, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

    // Only include changed fields
    if (fullname !== profile?.fullname) {
      updateData.fullname = fullname;
    }
    if (username !== profile?.username) {
      updateData.username = username;
    }
    if (phone !== (profile?.phone || "")) {
      updateData.phone = phone || undefined;
    }
    if (email !== profile?.email) {
      updateData.email = email;
    }

    // Nothing to update
    if (Object.keys(updateData).length === 0) {
      setIsSaving(false);
      setSuccessMessage("No changes detected");
      return;
    }

    try {
      const response = await apiClient.request<UserProfile | EmailChangeResponse>(
        "/auth/me",
        {
          method: "PATCH",
          body: JSON.stringify(updateData),
        },
        true
      );

      // Check if this is an email change response (two-step verification)
      if ('email_change_step' in response && response.email_change_step === 'verify_old_email') {
        // Open modal for code verification
        setPendingEmail(response.pending_email || email);
        setEmailChangeStep("verify_old");
        setShowEmailChangeModal(true);
        setVerificationCode(["", "", "", "", "", ""]);
        setEmailChangeError("");
        // Reset email field to original
        setEmail(profile?.email || "");
        
        // If other fields were also updated, refresh the profile
        if (Object.keys(updateData).length > 1) {
          await fetchProfile();
        }
      } else {
        // Normal profile update response
        const userResponse = response as UserProfile;
        setProfile(userResponse);
        setFullname(userResponse.fullname || "");
        setUsername(userResponse.username || "");
        setPhone(userResponse.phone || "");
        setEmail(userResponse.email || "");
        setSuccessMessage("Profile updated successfully");
        
        // Refresh auth context
        await checkAuth();
      }
    } catch (err: unknown) {
      console.error("Failed to update profile:", err);
      const error = err as { detail?: string; message?: string };
      setErrorMessage(
        error.detail || error.message || "Failed to update profile"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handle verification code input
  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newCode = [...verificationCode];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      setVerificationCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      codeInputRefs.current[nextIndex]?.focus();
    } else {
      const newCode = [...verificationCode];
      newCode[index] = value.replace(/\D/g, "");
      setVerificationCode(newCode);
      if (value && index < 5) {
        codeInputRefs.current[index + 1]?.focus();
      }
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
      setEmailChangeError("Please enter the 6-digit code");
      return;
    }

    setIsVerifyingCode(true);
    setEmailChangeError("");

    try {
      const response = await apiClient.post<EmailChangeResponse>(
        "/auth/me/verify-old-email",
        { code },
        true
      );

      if (response.email_change_step === "verify_new_email") {
        setEmailChangeStep("verify_new");
        setVerificationCode(["", "", "", "", "", ""]);
        setPendingEmail(response.pending_email || pendingEmail);
      }
    } catch (err: unknown) {
      const error = err as { detail?: string; message?: string };
      setEmailChangeError(error.detail || error.message || "Invalid code");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleVerifyNewEmail = async () => {
    const code = verificationCode.join("");
    if (code.length !== 6) {
      setEmailChangeError("Please enter the 6-digit code");
      return;
    }

    setIsVerifyingCode(true);
    setEmailChangeError("");

    try {
      const response = await apiClient.post<EmailChangeResponse>(
        "/auth/me/verify-new-email",
        { code },
        true
      );

      if (response.email_change_step === "completed") {
        setShowEmailChangeModal(false);
        setEmailChangeStep(null);
        // Email changed - need to logout and re-login with new email
        await logout();
        router.push("/login?message=email_changed");
      }
    } catch (err: unknown) {
      const error = err as { detail?: string; message?: string };
      setEmailChangeError(error.detail || error.message || "Invalid code");
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

  // Password change modal handlers
  const handlePasswordCodeChange = (index: number, value: string) => {
    // Handle paste
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newCode = [...passwordCode];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      setPasswordCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      passwordCodeInputRefs.current[nextIndex]?.focus();
      return;
    }

    // Single digit
    if (value && !/^\d$/.test(value)) return;
    
    const newCode = [...passwordCode];
    newCode[index] = value;
    setPasswordCode(newCode);

    if (value && index < 5) {
      passwordCodeInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePasswordCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !passwordCode[index] && index > 0) {
      passwordCodeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleSendPasswordCode = async () => {
    if (!profile?.email) {
      setPasswordModalError("Email not available");
      return;
    }

    setIsSendingPasswordCode(true);
    setPasswordModalError("");

    try {
      await apiClient.post("/auth/reset_password", { 
        email: profile.email,
        client: "mobile"  // Use mobile flow to get code instead of link
      });
      setPasswordStep("verify_code");
    } catch (err: unknown) {
      console.error("Failed to send password code:", err);
      const error = err as { detail?: string; message?: string };
      setPasswordModalError(
        error.detail || error.message || "Failed to send verification code"
      );
    } finally {
      setIsSendingPasswordCode(false);
    }
  };

  const handleVerifyPasswordCode = async () => {
    const code = passwordCode.join("");
    if (code.length !== 6) {
      setPasswordModalError("Please enter the 6-digit code");
      return;
    }

    setIsVerifyingPasswordCode(true);
    setPasswordModalError("");

    try {
      await apiClient.post("/auth/verify_reset_code", { 
        email: profile?.email,
        code 
      });
      setPasswordStep("new_password");
    } catch (err: unknown) {
      console.error("Failed to verify password code:", err);
      const error = err as { detail?: string; message?: string };
      setPasswordModalError(
        error.detail || error.message || "Invalid code"
      );
    } finally {
      setIsVerifyingPasswordCode(false);
    }
  };

  const handleConfirmNewPassword = async () => {
    if (newPassword.length < 6) {
      setPasswordModalError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordModalError("Passwords do not match");
      return;
    }

    setIsVerifyingPasswordCode(true);
    setPasswordModalError("");

    try {
      await apiClient.post("/auth/reset_password_code", { 
        email: profile?.email,
        code: passwordCode.join(""),
        new_password: newPassword
      });
      closePasswordModal();
      setSuccessMessage("Password changed successfully!");
    } catch (err: unknown) {
      console.error("Failed to reset password:", err);
      const error = err as { detail?: string; message?: string };
      setPasswordModalError(
        error.detail || error.message || "Failed to change password"
      );
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    openPasswordModal();
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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return {
          label: "Admin",
          className: "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300"
        };
      case "company":
        return {
          label: "Entreprise",
          className: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
        };
      case "staff":
        return {
          label: "Staff",
          className: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
        };
      default:
        return {
          label: role,
          className: "bg-slate-100 dark:bg-slate-500/20 text-slate-700 dark:text-slate-300"
        };
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </div>
    );
  }

  const roleBadge = getRoleBadge(profile?.role || "");

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Settings
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Manage your personal information and security preferences
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
        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Profile Information
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Update your personal details
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="p-6 space-y-6">
            {/* Full Name */}
            <div>
              <label
                htmlFor="fullname"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  id="fullname"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Your full name"
                  minLength={4}
                  maxLength={20}
                  required
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Between 4 and 20 characters
              </p>
            </div>

            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                Username
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                  @
                </span>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="username"
                  maxLength={10}
                  required
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Maximum 10 characters
              </p>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="your@email.com"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                A verification email will be sent if you change this
              </p>
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                Phone{" "}
                <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
            </div>

            {/* Account Status */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <div
                className={`w-3 h-3 rounded-full ${
                  profile?.is_verified ? "bg-green-500" : "bg-yellow-500"
                }`}
              />
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Account Status
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {profile?.is_verified
                    ? "Email verified"
                    : "Email not verified - Check your inbox"}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {profile?.role === "company" && (
                  <Building2 className="w-4 h-4 text-emerald-500" />
                )}
                <span
                  className={`px-3 py-1 text-xs font-medium rounded-full ${roleBadge.className}`}
                >
                  {roleBadge.label}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Save Changes
              </button>
            </div>
          </form>
        </div>

        {/* Security Section */}
        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Security
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Manage your password and account security
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Password Success Message */}
            {passwordSuccess && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <p className="text-green-700 dark:text-green-400">
                  {passwordSuccess}
                </p>
              </div>
            )}

            {/* Password Error Message */}
            {passwordError && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 dark:text-red-400">{passwordError}</p>
              </div>
            )}

            {!showPasswordSection ? (
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Password
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Click to change your password
                    </p>
                  </div>
                </div>
                <button
                  onClick={openPasswordModal}
                  disabled={isSendingPasswordCode}
                  className="px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSendingPasswordCode ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Change"
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Password
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Click to change your password
                    </p>
                  </div>
                </div>
                <button
                  onClick={openPasswordModal}
                  disabled={isSendingPasswordCode}
                  className="px-4 py-2 text-sm font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isSendingPasswordCode ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Change"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-xl p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Logged in as{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {user?.email}
            </span>
          </p>
        </div>
      </div>

      {/* Email Change Verification Modal */}
      {showEmailChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeEmailChangeModal}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <button
              onClick={closeEmailChangeModal}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {emailChangeStep === "verify_old" 
                  ? "Verify your current email" 
                  : "Confirm new email"
                }
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {emailChangeStep === "verify_old" ? (
                  <>
                    A 6-digit code has been sent to <br />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {profile?.email}
                    </span>
                  </>
                ) : (
                  <>
                    A 6-digit code has been sent to <br />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {pendingEmail}
                    </span>
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

            {/* Code Input */}
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
                  className="w-12 h-14 text-center text-2xl font-bold bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                />
              ))}
            </div>

            {/* Progress indicator */}
            <div className="flex justify-center gap-2 mb-6">
              <div className={`w-3 h-3 rounded-full ${emailChangeStep === "verify_old" ? "bg-purple-500" : "bg-green-500"}`} />
              <div className={`w-3 h-3 rounded-full ${emailChangeStep === "verify_new" ? "bg-purple-500" : "bg-slate-300 dark:bg-slate-600"}`} />
            </div>

            <button
              onClick={emailChangeStep === "verify_old" ? handleVerifyOldEmail : handleVerifyNewEmail}
              disabled={isVerifyingCode || verificationCode.join("").length !== 6}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isVerifyingCode ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {emailChangeStep === "verify_old" ? "Verify and continue" : "Confirm change"}
                </>
              )}
            </button>

            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
              {emailChangeStep === "verify_old" 
                ? "Step 1 of 2: Verify current email"
                : "Step 2 of 2: Confirm new email"
              }
            </p>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closePasswordModal}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <button
              onClick={closePasswordModal}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Key className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {passwordStep === "verify_code" 
                  ? "Verify Code" 
                  : passwordStep === "new_password"
                  ? "New Password"
                  : "Sending code..."
                }
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {passwordStep === "verify_code" ? (
                  <>
                    A 6-digit code has been sent to <br />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {profile?.email}
                    </span>
                  </>
                ) : passwordStep === "new_password" ? (
                  "Enter your new password"
                ) : (
                  "Please wait..."
                )}
              </p>
            </div>

            {passwordModalError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">{passwordModalError}</p>
              </div>
            )}

            {/* Loading state while sending code */}
            {!passwordStep && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              </div>
            )}

            {/* Code Input Step */}
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
                      className="w-12 h-14 text-center text-2xl font-bold bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    />
                  ))}
                </div>

                {/* Progress indicator */}
                <div className="flex justify-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600" />
                </div>

                <button
                  onClick={handleVerifyPasswordCode}
                  disabled={isVerifyingPasswordCode || passwordCode.join("").length !== 6}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isVerifyingPasswordCode ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Verify Code"
                  )}
                </button>

                <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
                  Step 1 of 2: Verify code
                </p>
              </>
            )}

            {/* New Password Step */}
            {passwordStep === "new_password" && (
              <>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="flex justify-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                </div>

                <button
                  onClick={handleConfirmNewPassword}
                  disabled={isVerifyingPasswordCode || !newPassword || !confirmPassword}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isVerifyingPasswordCode ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Change Password"
                  )}
                </button>

                <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-4">
                  Step 2 of 2: New password
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
