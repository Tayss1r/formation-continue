"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useAuth } from "@/contexts/AuthContext";

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        const query = searchParams?.toString();
        const currentUrl = `${pathname}${query ? `?${query}` : ""}`;
        router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
        return;
      }

      if (user && user.role !== "company") {
        router.push("/unauthorized");
      }
    }
  }, [isLoading, isAuthenticated, user, router, pathname, searchParams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== "company") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Sidebar />

      {/* Main Content */}
      <div className="lg:pl-64">
        <DashboardHeader settingsHref="/dashboard/settings" />

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}
