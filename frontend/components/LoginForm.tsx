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
          className="block text-sm font-medium text-muted-foreground"
        >
          Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            id="login-email"
            type="email"
            value={credentials.email}
            onChange={(e) =>
              setCredentials((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="you@example.com"
            className={`form-input pl-10 ${
              errors.email
                ? "border-red-500 focus:ring-red-500/50"
                : ""
            }`}
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
          className="block text-sm font-medium text-muted-foreground"
        >
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            value={credentials.password}
            onChange={(e) =>
              setCredentials((prev) => ({ ...prev, password: e.target.value }))
            }
            placeholder="••••••••"
            className={`form-input pl-10 pr-12 ${
              errors.password
                ? "border-red-500 focus:ring-red-500/50"
                : ""
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
          className="text-sm text-primary-500 hover:text-primary-600 transition-colors"
        >
          Forgot password?
        </button>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full py-3 flex items-center justify-center gap-2"
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
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-primary-500 hover:text-primary-600 font-medium transition-colors"
        >
          Sign up
        </button>
      </p>
    </form>
  );
}
