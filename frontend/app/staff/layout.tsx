"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { StaffSidebar } from "@/components/staff/StaffSidebar";

export default function StaffLayout({
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
      
      // Check if user has staff or admin role
      if (user && !["staff", "admin"].includes(user.role)) {
        router.push("/unauthorized");
        return;
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#020817] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Don't render if not authenticated or not staff
  if (!isAuthenticated || !user || !["staff", "admin"].includes(user.role)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020817]">
      <StaffSidebar />
      <div className="lg:pl-64">
        <main className="p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
