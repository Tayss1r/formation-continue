"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { 
  login as apiLogin, 
  logout as apiLogout,
  signup as apiSignup,
  refreshAccessToken,
  clearAccessToken,
  type AuthUser,
  type SignupData,
} from "@/lib/api";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (data: SignupData) => Promise<AuthUser>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (data: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try to refresh the token on initial load
      const success = await refreshAccessToken();
      if (success) {
        // If refresh succeeded, get user info from stored access token
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } else {
        setUser(null);
        localStorage.removeItem("user");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
      localStorage.removeItem("user");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const response = await apiLogin(email, password);
    setUser(response.user);
    localStorage.setItem("user", JSON.stringify(response.user));
    return response.user;
  };

  const signup = async (data: SignupData): Promise<AuthUser> => {
    const response = await apiSignup(data);
    // Don't set user yet - they need to verify email first
    return response.user;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      clearAccessToken();
      localStorage.removeItem("user");
    }
  };

  const updateUser = (data: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    checkAuth,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles?: string[]
) {
  return function ProtectedRoute(props: P) {
    const { user, isLoading, isAuthenticated } = useAuth();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        window.location.href = "/login";
      }
      
      if (!isLoading && isAuthenticated && allowedRoles && user) {
        if (!allowedRoles.includes(user.role)) {
          window.location.href = "/unauthorized";
        }
      }
    }, [isLoading, isAuthenticated, user]);

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      return null;
    }

    return <Component {...props} />;
  };
}
