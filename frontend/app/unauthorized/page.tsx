"use client";

import Link from "next/link";
import { ShieldX, ArrowLeft, Home } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#020817] dark:via-[#0f172a] dark:to-[#020817] px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <ShieldX className="w-10 h-10 text-red-600 dark:text-red-400" />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
          Accès Refusé
        </h1>
        
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
          Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, veuillez contacter l&apos;administrateur.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => window.history.back()}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
          >
            <Home className="w-4 h-4" />
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
