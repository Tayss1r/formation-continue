"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { DashboardCards } from "@/components/DashboardCards";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Bell, Search, User } from "lucide-react";
import type { DashboardData } from "@/types/user";

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // TODO: Implement backend API call
        // const response = await dashboardApi.getData();
        // setDashboardData(response.data);

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        // TODO: Replace with actual API data
        setDashboardData(null);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020817] transition-colors duration-300">
      <Sidebar />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            {/* Search */}
            <div className="flex-1 max-w-md ml-12 lg:ml-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search courses, topics..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-transparent focus:border-purple-500/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <ThemeToggle />

              {/* Notifications */}
              <button className="relative p-2 rounded-lg bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors">
                <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full" />
              </button>

              {/* Profile */}
              <button className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden sm:block text-sm font-medium text-slate-700 dark:text-slate-300">
                  {/* TODO: Display actual user name */}
                  User
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
              Welcome back! 👋
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Here&apos;s what&apos;s happening with your learning journey.
            </p>
          </div>

          {/* Dashboard Cards */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <DashboardCards
              stats={dashboardData?.stats}
              courses={dashboardData?.recentCourses}
              activity={dashboardData?.recentActivity}
            />
          )}
        </main>
      </div>
    </div>
  );
}
