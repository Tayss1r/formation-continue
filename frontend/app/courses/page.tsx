"use client";

import { useEffect, useState } from "react";
import { BookOpen, Filter, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Header } from "@/components/Header";
import { CourseCard } from "@/components/CourseCard";
import { getPublicCourses } from "@/lib/courses";
import type { CourseListItem } from "@/types/course";

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [courseType, setCourseType] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  const perPage = 12;

  useEffect(() => {
    async function fetchCourses() {
      try {
        setIsLoading(true);
        const response = await getPublicCourses(page, perPage, courseType);
        setCourses(response.courses);
        setTotalPages(response.total_pages);
        setTotal(response.total);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
        setError("Failed to load courses. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchCourses();
  }, [page, courseType]);

  // Filter courses by search query (client-side)
  const filteredCourses = searchQuery
    ? courses.filter(
        (course) =>
          course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.short_description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : courses;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#020817]">
      <Header />

      {/* Page Header */}
      <section className="pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
              <BookOpen className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-purple-500 font-medium">
                Catalogue des Formations
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Nos <span className="gradient-text">Formations Professionnelles</span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Découvrez notre catalogue complet de formations dispensées par des experts universitaires.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-8">
            {/* Search */}
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher une formation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <select
                value={courseType || ""}
                onChange={(e) => {
                  setCourseType(e.target.value || undefined);
                  setPage(1);
                }}
                className="px-4 py-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                <option value="">Toutes les formations</option>
                <option value="public">Formations Publiques</option>
                <option value="private">Formations Privées</option>
              </select>
            </div>
          </div>

          {/* Results Count */}
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            {total} formation{total !== 1 ? "s" : ""} trouvée{total !== 1 ? "s" : ""}
          </p>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="text-center py-20">
              <p className="text-red-500 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && filteredCourses.length === 0 && (
            <div className="text-center py-20">
              <BookOpen className="w-16 h-16 mx-auto text-slate-400 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Aucune formation trouvée
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {searchQuery
                  ? "Essayez avec d'autres mots-clés."
                  : "Revenez bientôt pour de nouvelles formations."}
              </p>
            </div>
          )}

          {/* Courses Grid */}
          {!isLoading && !error && filteredCourses.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-12">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Précédent
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                            page === pageNum
                              ? "bg-purple-500 text-white"
                              : "border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Suivant
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
