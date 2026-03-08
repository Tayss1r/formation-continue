"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Users,
  FileText,
  Calendar,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { getProfessorCourses } from "@/lib/professor";
import { getImageUrl } from "@/lib/config";
import type { ProfessorCourse } from "@/types/professor";

export default function ProfessorCoursesPage() {
  const [courses, setCourses] = useState<ProfessorCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchCourses() {
      try {
        setIsLoading(true);
        const data = await getProfessorCourses(page, 10);
        setCourses(data.courses);
        setTotalPages(data.total_pages);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
        setError("Impossible de charger les formations");
      } finally {
        setIsLoading(false);
      }
    }
    fetchCourses();
  }, [page]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="heading-display text-2xl text-foreground mb-2">
          Mes Formations
        </h1>
        <p className="text-muted-foreground">
          Gérez vos formations assignées, vos documents et vos participants.
        </p>
      </div>

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <div className="card-elevated p-12 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Aucune formation assignée
          </h3>
          <p className="text-muted-foreground">
            Vous n'avez pas encore de formations assignées.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/professor/courses/${course.id}`}
              className="card-elevated overflow-hidden group"
            >
              {/* Course Image */}
              <div className="aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                {course.image_path ? (
                  <img
                    src={getImageUrl(course.image_path)}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Course Info */}
              <div className="p-5">
                <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-2">
                  {course.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {course.department_display || "Département non spécifié"}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{course.enrolled_count} inscrits</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>{course.materials_count} docs</span>
                  </div>
                </div>

                {/* Upcoming Sessions */}
                {course.upcoming_sessions > 0 && (
                  <div className="mt-3 flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400">
                    <Calendar className="w-4 h-4" />
                    <span>{course.upcoming_sessions} sessions à venir</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Précédent
          </button>
          <span className="text-sm text-muted-foreground px-4">
            Page {page} sur {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
