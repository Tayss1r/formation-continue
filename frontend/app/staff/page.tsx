"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Users,
  TrendingUp,
  Calendar,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getStaffCourses, deleteCourse } from "@/lib/courses";
import { getImageUrl } from "@/lib/config";
import type { CourseListItem } from "@/types/course";

export default function StaffDashboard() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCourses, setTotalCourses] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      try {
        setIsLoading(true);
        const response = await getStaffCourses(1, 5);
        setCourses(response.courses);
        setTotalCourses(response.total);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCourses();
  }, []);

  const handleDelete = async (courseId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette formation ?")) {
      return;
    }

    try {
      await deleteCourse(courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      setTotalCourses((prev) => prev - 1);
    } catch (err) {
      console.error("Failed to delete course:", err);
      alert("Erreur lors de la suppression");
    }
    
    setActiveDropdown(null);
  };

  // Stats cards data
  const stats = [
    {
      label: "Total Formations",
      value: totalCourses,
      icon: BookOpen,
      color: "from-purple-500 to-pink-500",
    },
    {
      label: "Formations Actives",
      value: courses.filter((c) => c.type === "public").length,
      icon: Eye,
      color: "from-green-500 to-emerald-500",
    },
    {
      label: "Ce Mois",
      value: 0,
      icon: Calendar,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "Total Inscrits",
      value: 0,
      icon: Users,
      color: "from-orange-500 to-amber-500",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Tableau de Bord
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Bienvenue, {user?.email}
          </p>
        </div>
        <Link
          href="/staff/courses/new"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Formation
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Courses */}
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700/50">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Mes Formations Récentes
          </h2>
          <Link
            href="/staff/courses"
            className="text-sm text-purple-500 hover:text-purple-600 font-medium"
          >
            Voir tout →
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              Aucune formation créée
            </p>
            <Link
              href="/staff/courses/new"
              className="inline-flex items-center gap-2 mt-4 text-purple-500 hover:text-purple-600"
            >
              <Plus className="w-4 h-4" />
              Créer une formation
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex items-center gap-4 p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              >
                {/* Course Image */}
                <img
                  src={getImageUrl(course.image_path)}
                  alt={course.title}
                  className="w-16 h-16 rounded-lg object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder-course.jpg";
                  }}
                />

                {/* Course Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-slate-900 dark:text-white truncate">
                    {course.title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {course.max_seats} places • {course.price.toLocaleString()} DZD
                  </p>
                </div>

                {/* Status Badge */}
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    course.type === "public"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                  }`}
                >
                  {course.type === "public" ? "Public" : "Privé"}
                </span>

                {/* Actions */}
                <div className="relative">
                  <button
                    onClick={() =>
                      setActiveDropdown(activeDropdown === course.id ? null : course.id)
                    }
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <MoreVertical className="w-5 h-5 text-slate-400" />
                  </button>

                  {activeDropdown === course.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg z-10">
                      <Link
                        href={`/courses/${course.id}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <Eye className="w-4 h-4" />
                        Voir
                      </Link>
                      <Link
                        href={`/staff/courses/${course.id}/edit`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <Edit className="w-4 h-4" />
                        Modifier
                      </Link>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
