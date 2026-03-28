"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getStaffCourses } from "@/lib/courses";
import { getImageUrl } from "@/lib/config";
import type { CourseListItem } from "@/types/course";

export default function CoordinatorCoursesPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCourses, setTotalCourses] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    fetchCourses();
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    fetchCourses(1);
  }, [searchQuery]);

  async function fetchCourses(page = currentPage) {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getStaffCourses(page, pageSize);
      let filtered = response.courses;

      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        filtered = filtered.filter(
          (course) =>
            course.title.toLowerCase().includes(query) ||
            (course.department || "").toLowerCase().includes(query)
        );
      }

      setCourses(filtered);
      setTotalPages(Math.max(1, response.total_pages));
      setTotalCourses(response.total);
    } catch (err) {
      console.error("Error loading coordinator courses:", err);
      setError("Erreur lors du chargement des formations");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="heading-display text-2xl text-foreground">
            Formations
          </h1>
          <p className="text-muted-foreground">
            {totalCourses} formation(s) geree(s)
          </p>
        </div>
        <Link
          href="/coordinator/courses/new"
          className="btn-primary inline-flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4" />
          Nouvelle formation
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher une formation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => fetchCourses()}
            className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Reessayer
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-border">
          <BookOpen className="w-14 h-14 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Aucune formation trouvee
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Creez une nouvelle formation ou ajustez votre recherche.
          </p>
          <Link
            href="/coordinator/courses/new"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Creer une formation
          </Link>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                  {course.image_path ? (
                    <img
                      src={getImageUrl(course.image_path)}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground mb-1 line-clamp-1">
                    {course.title}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {course.department || "Formation generale"}
                  </p>
                </div>

                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    course.is_published
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {course.is_published ? "Publie" : "Brouillon"}
                </span>

                <Link
                  href={`/coordinator/courses/${course.id}/edit`}
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Modifier"
                >
                  <Edit className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} sur {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-border hover:bg-card disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-border hover:bg-card disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
