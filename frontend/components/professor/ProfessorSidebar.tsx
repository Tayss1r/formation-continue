"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Menu,
  X,
  Settings,
  CalendarDays,
  ClipboardCheck,
} from "lucide-react";
import { AppLogo } from "@/components/ui/AppLogo";

const navItems = [
  {
    label: "Tableau de Bord",
    href: "/professor",
    icon: LayoutDashboard,
  },
  {
    label: "Mes Formations",
    href: "/professor/courses",
    icon: BookOpen,
  },
  {
    label: "Sessions",
    href: "/professor/sessions",
    icon: CalendarDays,
  },
  {
    label: "Presences",
    href: "/professor/attendance",
    icon: ClipboardCheck,
  },
  {
    label: "Paramètres",
    href: "/professor/settings",
    icon: Settings,
  },
];

export function ProfessorSidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/professor" className="flex items-center gap-2">
            <AppLogo size="sm" alt="Forminy logo" />
            <span className="text-lg font-bold text-foreground">
              Forminy
            </span>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-700 dark:text-white"
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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card transform transition-transform duration-300 lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6">
            <Link href="/professor" className="flex items-center gap-3">
              <AppLogo alt="Forminy logo" />
              <div>
                <span className="text-lg font-bold text-foreground block">
                  Forminy
                </span>
                <span className="text-xs text-muted-foreground">
                  Espace Professeur
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/professor" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive
                      ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}
