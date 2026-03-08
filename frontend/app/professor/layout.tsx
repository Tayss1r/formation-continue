"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ProfessorSidebar } from "@/components/professor/ProfessorSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

export default function ProfessorLayout({
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
      
      // Check if user has professor role
      if (user && user.role !== "professor") {
        router.push("/unauthorized");
        return;
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Don't render if not authenticated or not professor
  if (!isAuthenticated || !user || user.role !== "professor") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <ProfessorSidebar />
      <div className="lg:pl-64">
        <DashboardHeader settingsHref="/professor/settings" />
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
