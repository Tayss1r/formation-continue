"use client";

import { Sidebar } from "@/components/Sidebar";
import { DashboardHeader } from "@/components/DashboardHeader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
