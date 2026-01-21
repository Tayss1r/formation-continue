"use client";

import { useEffect, useCallback } from "react";
import { X, Zap } from "lucide-react";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";

interface AuthModalProps {
  isOpen: boolean;
  modalType: "login" | "register" | null;
  onClose: () => void;
  onSwitchToLogin: () => void;
  onSwitchToRegister: () => void;
}

export function AuthModal({
  isOpen,
  modalType,
  onClose,
  onSwitchToLogin,
  onSwitchToRegister,
}: AuthModalProps) {
  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
            </button>

            {/* Logo */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                TrainFast
              </span>
            </div>

            {/* Title */}
            <h2 className="text-xl font-semibold text-center text-slate-900 dark:text-white">
              {modalType === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-center text-slate-500 dark:text-slate-400 mt-1">
              {modalType === "login"
                ? "Sign in to continue your learning journey"
                : "Join thousands of learners today"}
            </p>
          </div>

          {/* Form Content */}
          <div className="px-6 pb-6">
            {modalType === "login" ? (
              <LoginForm
                onSwitchToRegister={onSwitchToRegister}
                onClose={onClose}
              />
            ) : (
              <RegisterForm
                onSwitchToLogin={onSwitchToLogin}
                onClose={onClose}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
