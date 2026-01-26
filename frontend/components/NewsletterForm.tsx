"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, CheckCircle, AlertCircle, Building2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/lib/config";

// Industry sectors - must match backend constants
const INDUSTRY_SECTORS = [
  "IT",
  "Manufacturing",
  "Finance",
  "Energy",
  "Healthcare",
  "Education",
  "Retail",
  "Construction",
  "Transport",
  "Agriculture",
  "Telecommunications",
  "Hospitality",
  "Consulting",
  "Legal",
  "Media",
  "Pharmaceutical",
  "Real Estate",
  "Other",
];

interface NewsletterFormProps {
  variant?: "footer" | "section";
}

export function NewsletterForm({ variant = "footer" }: NewsletterFormProps) {
  const { user, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [sector, setSector] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  // Pre-fill for authenticated company users
  useEffect(() => {
    if (isAuthenticated && user) {
      setEmail(user.email || "");
      // If user has company with sector, auto-fill it
      if ((user as { company?: { industry_sector?: string } }).company?.industry_sector) {
        setSector((user as { company?: { industry_sector?: string } }).company?.industry_sector || "");
      }
    }
  }, [isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !sector) {
      setStatus("error");
      setMessage("Veuillez remplir tous les champs.");
      return;
    }

    setIsLoading(true);
    setStatus("idle");

    try {
      const response = await fetch(`${API_BASE_URL}/newsletter/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, sector }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de l'inscription");
      }

      setStatus("success");
      setMessage("Inscription réussie ! Vous recevrez des offres adaptées à votre secteur.");
      
      // Reset form after success
      if (!isAuthenticated) {
        setEmail("");
        setSector("");
      }
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error 
          ? err.message 
          : "Une erreur est survenue. Veuillez réessayer."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isFooter = variant === "footer";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={isFooter ? "" : "bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10 rounded-3xl border border-purple-500/20 p-8 md:p-12"}
    >
      {!isFooter && (
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 mb-4"
          >
            <Mail className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-3">
            Restez informé des formations
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Recevez des offres de formation et de consulting adaptées à votre secteur d&apos;activité.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className={isFooter ? "flex flex-col md:flex-row gap-3" : "max-w-lg mx-auto space-y-4"}>
        {/* Email Input */}
        <div className={isFooter ? "flex-1" : "relative"}>
          {!isFooter && (
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Adresse Email
            </label>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all disabled:opacity-50"
            />
          </div>
        </div>

        {/* Sector Select */}
        <div className={isFooter ? "flex-1" : "relative"}>
          {!isFooter && (
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Secteur d&apos;Activité
            </label>
          )}
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all disabled:opacity-50 appearance-none cursor-pointer"
            >
              <option value="">Sélectionnez votre secteur</option>
              {INDUSTRY_SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={isLoading || !email || !sector}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`${isFooter ? "px-6" : "w-full"} py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Inscription...</span>
            </>
          ) : (
            <span>S&apos;inscrire</span>
          )}
        </motion.button>
      </form>

      {/* Status Messages */}
      <AnimatePresence mode="wait">
        {status !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${
              status === "success"
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            }`}
          >
            {status === "success" ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <p
              className={`text-sm ${
                status === "success"
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!isFooter && (
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
          En vous inscrivant, vous acceptez de recevoir des communications personnalisées selon votre secteur.
          <br />
          Désabonnement possible à tout moment.
        </p>
      )}
    </motion.div>
  );
}
