"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { EmployeeSidebar } from "@/components/employee/EmployeeSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isPublicEmployeeRegister = pathname === "/employee/register";

  useEffect(() => {
    if (isPublicEmployeeRegister) {
      return;
    }

    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
        return;
      }
      
      // Check if user has employee role
      if (user && user.role !== "employee") {
        router.push("/unauthorized");
        return;
      }
    }
  }, [isLoading, isAuthenticated, user, router, isPublicEmployeeRegister]);

  if (isPublicEmployeeRegister) {
    return <>{children}</>;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Don't render if not authenticated or not employee
  if (!isAuthenticated || !user || user.role !== "employee") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <EmployeeSidebar />
      <div className="lg:pl-64">
        <DashboardHeader settingsHref="/employee/settings" />
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
