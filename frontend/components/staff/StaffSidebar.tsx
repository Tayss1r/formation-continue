"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Plus,
  Menu,
  X,
  CalendarCheck,
  ClipboardList,
  Newspaper,
  ShieldCheck,
  Settings,
  ChevronRight,
} from "lucide-react";
import { AppLogo } from "@/components/ui/AppLogo";

const navItems = [
  {
    label: "Tableau de Bord",
    href: "/staff",
    icon: LayoutDashboard,
  },
  {
    label: "Vérifications",
    href: "/staff/verifications",
    icon: ShieldCheck,
  },
  {
    label: "Mes Formations",
    href: "/staff/courses",
    icon: BookOpen,
  },
  {
    label: "Sessions & Planning",
    href: "/staff/availability",
    icon: CalendarCheck,
  },
  {
    label: "Réservations",
    href: "/staff/bookings",
    icon: ClipboardList,
  },
  {
    label: "Actualités",
    href: "/staff/news",
    icon: Newspaper,
  },
  {
    label: "Nouvelle Formation",
    href: "/staff/courses/new",
    icon: Plus,
  },
  {
    label: "Paramètres",
    href: "/staff/settings",
    icon: Settings,
  },
];

export function StaffSidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/staff" className="flex items-center gap-2">
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
            <Link href="/staff" className="flex items-center gap-3">
              <AppLogo alt="Forminy logo" />
              <div>
                <span className="text-lg font-bold text-foreground block">
                  Forminy
                </span>
                <span className="text-xs text-muted-foreground">
                  Espace Staff
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/staff" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                    isActive
                      ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/30"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-primary-500" : "text-muted-foreground group-hover:text-foreground"}`} />
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 text-primary-500" />}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile spacer */}
      <div className="lg:hidden h-16" />
    </>
  );
}
