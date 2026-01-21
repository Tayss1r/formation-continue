"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, User, Loader2 } from "lucide-react";
import type { RegisterCredentials } from "@/types/auth";

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onClose: () => void;
}

export function RegisterForm({ onSwitchToLogin, onClose }: RegisterFormProps) {
  const router = useRouter();
  const [credentials, setCredentials] = useState<RegisterCredentials>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<RegisterCredentials>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterCredentials> = {};

    if (!credentials.fullName) {
      newErrors.fullName = "Full name is required";
    } else if (credentials.fullName.length < 2) {
      newErrors.fullName = "Name must be at least 2 characters";
    }

    if (!credentials.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!credentials.password) {
      newErrors.password = "Password is required";
    } else if (credentials.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(credentials.password)) {
      newErrors.password =
        "Password must contain uppercase, lowercase, and number";
    }

    if (!credentials.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (credentials.password !== credentials.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // TODO: Implement backend API call
      // const response = await authApi.register({
      //   fullName: credentials.fullName,
      //   email: credentials.email,
      //   password: credentials.password,
      // });
      // if (response.success) {
      //   // Store email for verification page
      //   // Redirect to email verification
      // }

      console.log("Register credentials:", credentials);

      // Simulate API delay for UI testing
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // TODO: Handle successful registration
      // - Store email in session/context for verification page
      // - Redirect to email verification page
      
      onClose();
      router.push(`/verify-email?email=${encodeURIComponent(credentials.email)}`);
    } catch (error) {
      // TODO: Handle error from backend
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Full Name Field */}
      <div className="space-y-2">
        <label
          htmlFor="register-name"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Full Name
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            id="register-name"
            type="text"
            value={credentials.fullName}
            onChange={(e) =>
              setCredentials((prev) => ({ ...prev, fullName: e.target.value }))
            }
            placeholder="John Doe"
            className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800/50 border ${
              errors.fullName
                ? "border-red-500"
                : "border-slate-300 dark:border-slate-700/50"
            } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
          />
        </div>
        {errors.fullName && (
          <p className="text-sm text-red-500">{errors.fullName}</p>
        )}
      </div>

      {/* Email Field */}
      <div className="space-y-2">
        <label
          htmlFor="register-email"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            id="register-email"
            type="email"
            value={credentials.email}
            onChange={(e) =>
              setCredentials((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="you@example.com"
            className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800/50 border ${
              errors.email
                ? "border-red-500"
                : "border-slate-300 dark:border-slate-700/50"
            } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email}</p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <label
          htmlFor="register-password"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            id="register-password"
            type={showPassword ? "text" : "password"}
            value={credentials.password}
            onChange={(e) =>
              setCredentials((prev) => ({ ...prev, password: e.target.value }))
            }
            placeholder="••••••••"
            className={`w-full pl-10 pr-12 py-3 rounded-xl bg-white dark:bg-slate-800/50 border ${
              errors.password
                ? "border-red-500"
                : "border-slate-300 dark:border-slate-700/50"
            } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password}</p>
        )}
      </div>

      {/* Confirm Password Field */}
      <div className="space-y-2">
        <label
          htmlFor="register-confirm-password"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Confirm Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            id="register-confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            value={credentials.confirmPassword}
            onChange={(e) =>
              setCredentials((prev) => ({
                ...prev,
                confirmPassword: e.target.value,
              }))
            }
            placeholder="••••••••"
            className={`w-full pl-10 pr-12 py-3 rounded-xl bg-white dark:bg-slate-800/50 border ${
              errors.confirmPassword
                ? "border-red-500"
                : "border-slate-300 dark:border-slate-700/50"
            } text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {showConfirmPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-red-500">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </button>

      {/* Terms */}
      <p className="text-center text-xs text-slate-500 dark:text-slate-500">
        By creating an account, you agree to our{" "}
        <a href="/terms" className="text-purple-500 hover:text-purple-400">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="text-purple-500 hover:text-purple-400">
          Privacy Policy
        </a>
      </p>

      {/* Switch to Login */}
      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-purple-500 hover:text-purple-400 font-medium transition-colors"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}
