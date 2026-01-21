"use client";

import { useState, FormEvent } from "react";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import type { LoginCredentials } from "@/types/auth";

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onClose: () => void;
}

export function LoginForm({ onSwitchToRegister, onClose }: LoginFormProps) {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginCredentials> = {};

    if (!credentials.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!credentials.password) {
      newErrors.password = "Password is required";
    } else if (credentials.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
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
      // const response = await authApi.login(credentials);
      // if (response.success) {
      //   // Store token
      //   // Redirect to dashboard
      // }
      
      console.log("Login credentials:", credentials);
      
      // Simulate API delay for UI testing
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // TODO: Handle successful login
      // - Store auth token
      // - Update user state
      // - Redirect to dashboard
      onClose();
    } catch (error) {
      // TODO: Handle error from backend
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    // TODO: Implement forgot password flow
    // Could open a new modal or redirect to a page
    console.log("Forgot password for:", credentials.email);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email Field */}
      <div className="space-y-2">
        <label
          htmlFor="login-email"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            id="login-email"
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
          htmlFor="login-password"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            id="login-password"
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

      {/* Forgot Password */}
      <div className="text-right">
        <button
          type="button"
          onClick={handleForgotPassword}
          className="text-sm text-purple-500 hover:text-purple-400 transition-colors"
        >
          Forgot password?
        </button>
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
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </button>

      {/* Switch to Register */}
      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-purple-500 hover:text-purple-400 font-medium transition-colors"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}
