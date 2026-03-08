"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

interface DashboardHeaderProps {
  settingsHref?: string;
}

export function DashboardHeader({ settingsHref = "/settings" }: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    window.location.href = "/";
  };

  const displayName =
    user?.first_name && user?.last_name
      ? `${user.first_name} ${user.last_name}`
      : user?.username || user?.email || "Utilisateur";

  const initial = (user?.first_name?.[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md">
      <div className="flex items-center justify-end h-16 px-4 lg:px-8">
        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
              aria-haspopup="true"
              aria-expanded={profileOpen}
            >
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-sm font-semibold text-white">{initial}</span>
              </div>
              <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                  profileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-card border border-border shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* User Info */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-medium text-foreground truncate">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>

                {/* Settings */}
                <Link
                  href={settingsHref}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  Paramètres
                </Link>

                {/* Sign Out */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
