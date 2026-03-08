"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Plus,
  Menu,
  X,
  GraduationCap,
  ChevronLeft,
  CalendarCheck,
  ClipboardList,
  Newspaper,
  ShieldCheck,
  Settings,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/staff" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">
              Staff Portal
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
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-primary">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-lg font-bold text-foreground block">
                  Formation
                </span>
                <span className="text-xs text-muted-foreground">
                  Espace Staff
                </span>
              </div>
            </Link>
          </div>

          {/* Back to Site */}
          <div className="px-4 py-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Retour au site
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
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

          {/* Logout */}
          <div className="p-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-muted-foreground hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile spacer */}
      <div className="lg:hidden h-16" />
    </>
  );
}
