"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Users,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  AlertCircle,
  ChevronRight,
  Newspaper,
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const coursesResponse = await getStaffCourses(1, 5);
        setCourses(coursesResponse.courses);
        setTotalCourses(coursesResponse.total);
      } catch (err) {
        console.error("Error loading courses:", err);
        setError("Erreur lors du chargement des cours");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleDeleteCourse = async (courseId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce cours ?")) return;

    try {
      await deleteCourse(courseId);
      setCourses(courses.filter((c) => c.id !== courseId));
      setTotalCourses((prev) => prev - 1);
    } catch (err) {
      console.error("Error deleting course:", err);
      alert("Erreur lors de la suppression du cours");
    }
  };

  // Stats cards data
  const stats = [
    {
      label: "Total Cours",
      value: totalCourses,
      icon: BookOpen,
      color: "from-primary-500 to-primary-600",
    },
    {
      label: "Cours Publiés",
      value: courses.filter((c) => c.is_published).length,
      icon: TrendingUp,
      color: "from-green-500 to-emerald-500",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-display text-2xl text-foreground">
            Tableau de Bord Staff
          </h1>
          <p className="text-muted-foreground">
            Bienvenue, {user?.first_name || "Staff"}
          </p>
        </div>
        <Link
          href="/staff/courses/new"
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouveau cours
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="relative overflow-hidden rounded-2xl bg-card border border-border p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {stat.label}
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
              <div
                className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} text-white`}
              >
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/staff/courses"
          className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary-300 transition-colors"
        >
          <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30">
            <BookOpen className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Gérer les cours</p>
            <p className="text-sm text-muted-foreground">
              Voir et modifier les formations
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>

        <Link
          href="/staff/news"
          className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary-300 transition-colors"
        >
          <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
            <Newspaper className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Actualités</p>
            <p className="text-sm text-muted-foreground">
              Gérer les publications
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>

        <Link
          href="/staff/courses/new"
          className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary-300 transition-colors"
        >
          <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
            <Plus className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">Ajouter un cours</p>
            <p className="text-sm text-muted-foreground">
              Créer une nouvelle formation
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </Link>
      </div>

      {/* Recent Courses */}
      <div className="rounded-2xl bg-card border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary-500" />
            Cours récents
          </h2>
          <Link
            href="/staff/courses"
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            Voir tout
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-4">
              Aucun cours créé pour le moment
            </p>
            <Link
              href="/staff/courses/new"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Créer un cours
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors"
              >
                {/* Image */}
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                  {course.image_path ? (
                    <img
                      src={getImageUrl(course.image_path)}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {course.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {course.department || "Formation générale"}
                  </p>
                </div>

                {/* Status */}
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    course.is_published
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {course.is_published ? "Publié" : "Brouillon"}
                </span>

                {/* Actions */}
                <div className="relative">
                  <button
                    onClick={() =>
                      setActiveDropdown(
                        activeDropdown === course.id ? null : course.id
                      )
                    }
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>

                  {activeDropdown === course.id && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-xl shadow-lg z-10">
                      <Link
                        href={`/courses/${course.id}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Voir
                      </Link>
                      <Link
                        href={`/staff/courses/${course.id}/edit`}
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Modifier
                      </Link>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full text-left"
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
