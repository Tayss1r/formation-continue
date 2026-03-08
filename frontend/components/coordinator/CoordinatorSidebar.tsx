"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Plus,
  Menu,
  X,
  ChevronLeft,
  ClipboardList,
  Users,
  CheckCircle,
  Activity,
  ChevronRight,
  Building2,
} from "lucide-react";

const navItems = [
  {
    label: "Tableau de Bord",
    href: "/coordinator",
    icon: LayoutDashboard,
  },
  {
    label: "Appels à Candidatures",
    href: "/coordinator/calls",
    icon: FileText,
  },
  {
    label: "Nouvel Appel",
    href: "/coordinator/calls/new",
    icon: Plus,
  },
  {
    label: "Candidatures",
    href: "/coordinator/applications",
    icon: ClipboardList,
  },
  {
    label: "Soumissions Employés",
    href: "/coordinator/submissions",
    icon: Users,
  },
  {
    label: "Résultats",
    href: "/coordinator/results",
    icon: CheckCircle,
  },
  {
    label: "Historique",
    href: "/coordinator/activity",
    icon: Activity,
  },
];

export function CoordinatorSidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/coordinator") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/coordinator" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">
              Coordinateur
            </span>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-700 dark:text-white hover:bg-muted rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-border">
            <Link href="/coordinator" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-primary">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-foreground block">
                  Formation
                </span>
                <span className="text-xs text-muted-foreground">
                  Espace Coordinateur
                </span>
              </div>
            </Link>
          </div>

          {/* Back to Site */}
          <div className="px-4 py-3 border-b border-border">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Retour au site
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    active
                      ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/30"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 flex-shrink-0 ${
                      active
                        ? "text-primary-500"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                  <span className="flex-1">{item.label}</span>
                  {active && (
                    <ChevronRight className="w-4 h-4 text-primary-500" />
                  )}
                </Link>
              );
            })}
          </nav>


        </div>
      </aside>

      {/* Spacer for mobile header */}
      <div className="lg:hidden h-16" />
    </>
  );
}
