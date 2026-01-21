"use client";

import {
  BookOpen,
  Clock,
  Award,
  TrendingUp,
  Play,
  CheckCircle2,
  Flame,
} from "lucide-react";
import type { UserStats, UserCourse, UserActivity } from "@/types/user";

// Placeholder data structure - will be replaced with API data
const placeholderStats: UserStats = {
  coursesCompleted: 0,
  coursesInProgress: 0,
  totalLearningHours: 0,
  certificationsEarned: 0,
  currentStreak: 0,
  longestStreak: 0,
};

const placeholderCourses: UserCourse[] = [];
const placeholderActivity: UserActivity[] = [];

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
}

function StatCard({ title, value, icon: Icon, trend, trendUp }: StatCardProps) {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 hover:border-purple-500/30 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
            {value}
          </p>
          {trend && (
            <p
              className={`text-sm mt-2 ${
                trendUp
                  ? "text-green-500"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {trend}
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/20 flex items-center justify-center">
          <Icon className="w-6 h-6 text-purple-500" />
        </div>
      </div>
    </div>
  );
}

interface DashboardCardsProps {
  stats?: UserStats;
  courses?: UserCourse[];
  activity?: UserActivity[];
}

export function DashboardCards({
  stats = placeholderStats,
  courses = placeholderCourses,
  activity = placeholderActivity,
}: DashboardCardsProps) {
  const statCards: StatCardProps[] = [
    {
      title: "Courses Completed",
      value: stats.coursesCompleted,
      icon: CheckCircle2,
      trend: stats.coursesCompleted > 0 ? "+2 this month" : "Start learning!",
      trendUp: stats.coursesCompleted > 0,
    },
    {
      title: "Learning Hours",
      value: stats.totalLearningHours.toFixed(1),
      icon: Clock,
      trend:
        stats.totalLearningHours > 0 ? "+5.5 this week" : "Track your time",
      trendUp: stats.totalLearningHours > 0,
    },
    {
      title: "Certifications",
      value: stats.certificationsEarned,
      icon: Award,
      trend:
        stats.certificationsEarned > 0
          ? `${stats.coursesInProgress} in progress`
          : "Earn badges",
    },
    {
      title: "Current Streak",
      value: `${stats.currentStreak} days`,
      icon: Flame,
      trend:
        stats.longestStreak > 0
          ? `Best: ${stats.longestStreak} days`
          : "Build your streak!",
      trendUp: stats.currentStreak > 0,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <StatCard key={index} {...card} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Continue Learning */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Continue Learning
            </h3>
            <a
              href="/dashboard/courses"
              className="text-sm text-purple-500 hover:text-purple-400 font-medium"
            >
              View All
            </a>
          </div>

          {courses.length > 0 ? (
            <div className="space-y-4">
              {courses.slice(0, 3).map((course) => (
                <div
                  key={course.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/30 hover:border-purple-500/30 transition-colors group cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-8 h-8 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 dark:text-white truncate">
                      {course.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {course.progress}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {course.completedLessons} of {course.totalLessons} lessons
                    </p>
                  </div>
                  <button className="p-2 rounded-lg bg-purple-500/10 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-purple-500" />
              </div>
              <h4 className="font-medium text-slate-900 dark:text-white mb-2">
                No courses yet
              </h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Start your learning journey by enrolling in a course
              </p>
              <a
                href="/dashboard/courses"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Browse Courses
              </a>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
            Recent Activity
          </h3>

          {activity.length > 0 ? (
            <div className="space-y-4">
              {activity.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 dark:text-white">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
              <h4 className="font-medium text-slate-900 dark:text-white text-sm mb-1">
                No activity yet
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your learning activity will appear here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button className="p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-colors text-left group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
              <Play className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h4 className="font-medium text-slate-900 dark:text-white">
                Resume Learning
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Continue where you left off
              </p>
            </div>
          </div>
        </button>

        <button className="p-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 hover:border-purple-500/30 transition-colors text-left group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
              <BookOpen className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-purple-500 transition-colors" />
            </div>
            <div>
              <h4 className="font-medium text-slate-900 dark:text-white">
                Browse Courses
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Explore new topics
              </p>
            </div>
          </div>
        </button>

        <button className="p-4 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/50 hover:border-purple-500/30 transition-colors text-left group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
              <Award className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-purple-500 transition-colors" />
            </div>
            <div>
              <h4 className="font-medium text-slate-900 dark:text-white">
                My Certificates
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                View achievements
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
