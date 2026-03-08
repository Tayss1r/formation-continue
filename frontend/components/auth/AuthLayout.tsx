"use client";

import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <main className="h-screen flex bg-background overflow-hidden">
      {/* Left Panel - Visual Section with Background Image - Fixed, no scroll */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative h-screen sticky top-0">
        {/* Background Image */}
        <Image
          src="/bg-accueil.svg"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        
        {/* Dark Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/80 via-primary-800/70 to-primary-900/80" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-10 xl:p-14 w-full">
          {/* Logo - NO white box, just the logo directly */}
          <Link href="/" className="inline-flex items-center gap-3 group w-fit">
            <Image
              src="/radess.png"
              alt="Logo"
              width={48}
              height={48}
              className="object-contain drop-shadow-lg"
            />
            <div>
              <span className="text-xl font-semibold text-white block drop-shadow-md">Formation Continue</span>
              <span className="text-sm text-white/70">Bureau de Formation</span>
            </div>
          </Link>
          
          {/* Main Content - Centered */}
          <div className="space-y-8 max-w-lg">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-px w-12 bg-gradient-to-r from-primary-400 to-transparent" />
                <span className="text-primary-300 text-sm font-medium uppercase tracking-wider">
                  ISET Rades
                </span>
              </div>
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-[1.15] drop-shadow-lg">
                Développez vos
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-primary-100">
                  compétences
                </span>
                professionnelles
              </h1>
              <p className="text-lg text-white/80 leading-relaxed drop-shadow-md">
                Accédez à des formations certifiantes dispensées par des experts universitaires et propulsez votre carrière.
              </p>
            </div>
          </div>
          
          {/* Footer */}
          <p className="text-white/50 text-sm">
            © 2026 Bureau de Formation Continue - ISET Rades
          </p>
        </div>
      </div>
      
      {/* Right Panel - Form Section (Scrollable) */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex flex-col h-screen overflow-y-auto">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background z-20">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center overflow-hidden">
              <Image
                src="/radess.png"
                alt="Logo"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <span className="text-base font-semibold text-foreground">Formation Continue</span>
          </Link>
        </div>
        
        {/* Form Container - Scrollable content */}
        <div className="flex-1 px-6 py-8 sm:px-8 lg:px-12 xl:px-16">
          <div className="w-full max-w-md mx-auto">
            {/* Back Link */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400 text-sm transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à l&apos;accueil
            </Link>
            
            {/* Header */}
            {(title || subtitle) && (
              <div className="mb-8">
                {title && (
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
            
            {/* Form Content */}
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
