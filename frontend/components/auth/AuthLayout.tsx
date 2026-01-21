"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { GraduationCap, BookOpen, Users, Award, ArrowRight } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <main className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl animate-pulse delay-500" />
        </div>
        
        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0wIDBoNjB2NjBIMHoiLz48cGF0aCBkPSJNMzAgMzBtLTEgMGExIDEgMCAxIDAgMiAwYTEgMSAwIDEgMCAtMiAwIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L2c+PC9zdmc+')] opacity-40" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <div>
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-105 transition-transform border border-white/30">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold text-white block">Formation Continue</span>
                <span className="text-sm text-white/80">Bureau de Formation Continue</span>
              </div>
            </Link>
          </div>
          
          {/* Main Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
                Développez vos compétences avec nos formations professionnelles
              </h1>
              <p className="text-xl text-white/80 max-w-lg">
                Rejoignez notre plateforme de formation continue et accédez à des cours dispensés par des experts universitaires.
              </p>
            </div>
            
            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-colors">
                <BookOpen className="w-8 h-8 text-white mb-3" />
                <h3 className="text-white font-semibold mb-1">Formations Certifiantes</h3>
                <p className="text-white/70 text-sm">Obtenez des certificats reconnus</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-colors">
                <Users className="w-8 h-8 text-white mb-3" />
                <h3 className="text-white font-semibold mb-1">Experts Universitaires</h3>
                <p className="text-white/70 text-sm">Formateurs qualifiés et expérimentés</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-colors">
                <Award className="w-8 h-8 text-white mb-3" />
                <h3 className="text-white font-semibold mb-1">Qualité Assurée</h3>
                <p className="text-white/70 text-sm">Standards universitaires</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20 hover:bg-white/15 transition-colors">
                <ArrowRight className="w-8 h-8 text-white mb-3" />
                <h3 className="text-white font-semibold mb-1">Flexibilité</h3>
                <p className="text-white/70 text-sm">Formations adaptées à vos besoins</p>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between text-white/60 text-sm">
            <span>© 2025 Formation Continue - Université</span>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-white transition-colors">Confidentialité</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Conditions</Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center bg-slate-50 dark:bg-[#020817] p-4 sm:p-8 transition-colors duration-300">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                Formation Continue
              </span>
            </Link>
          </div>
          
          {/* Auth Card */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xl overflow-hidden">
            {/* Header */}
            {(title || subtitle) && (
              <div className="px-8 pt-8 pb-2 text-center">
                {title && (
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-slate-600 dark:text-slate-400">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
            
            {/* Form Content */}
            <div className="p-8">
              {children}
            </div>
          </div>
          
          {/* Back to Home */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-slate-600 dark:text-slate-400 hover:text-purple-500 dark:hover:text-purple-400 text-sm transition-colors"
            >
              ← Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
