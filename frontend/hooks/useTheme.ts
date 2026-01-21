"use client";

import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      // Check system preference, default to light
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(systemPrefersDark ? "dark" : "light");
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const setDarkTheme = useCallback(() => {
    setTheme("dark");
  }, []);

  const setLightTheme = useCallback(() => {
    setTheme("light");
  }, []);

  return {
    theme,
    mounted,
    toggleTheme,
    setDarkTheme,
    setLightTheme,
    isDark: theme === "dark",
    isLight: theme === "light",
  };
}
