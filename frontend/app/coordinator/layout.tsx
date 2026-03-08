"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { CoordinatorSidebar } from "@/components/coordinator/CoordinatorSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

export default function CoordinatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
        return;
      }
      
      // Check if user has coordinator or admin role
      if (user && !["coordinator", "admin"].includes(user.role)) {
        router.push("/unauthorized");
        return;
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or not coordinator
  if (!isAuthenticated || !user || !["coordinator", "admin"].includes(user.role)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <CoordinatorSidebar />
      <div className="lg:pl-64">
        <DashboardHeader settingsHref="/coordinator/settings" />
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
