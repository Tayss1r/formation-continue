"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, mounted, toggleTheme } = useTheme();

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <button
        className="p-2 rounded-lg bg-slate-800/50 dark:bg-slate-800/50 border border-slate-700/50 dark:border-slate-700/50"
        aria-label="Toggle theme"
      >
        <div className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 border border-slate-300/50 dark:border-slate-700/50 hover:bg-slate-300/50 dark:hover:bg-slate-700/50 transition-all duration-300"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5 text-yellow-400 transition-transform duration-300 hover:rotate-12" />
      ) : (
        <Moon className="w-5 h-5 text-slate-700 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
