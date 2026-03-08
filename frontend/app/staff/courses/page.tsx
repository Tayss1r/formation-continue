"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { getStaffCourses, deleteCourse } from "@/lib/courses";
import { getImageUrl } from "@/lib/config";
import type { CourseListItem } from "@/types/course";

export default function StaffCoursesPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCourses, setTotalCourses] = useState(0);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    fetchCourses();
  }, [currentPage, filterActive]);

  async function fetchCourses() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getStaffCourses(currentPage, pageSize);
      
      // Apply client-side filters
      let filteredCourses = response.courses;
      
      // Filter by search query (client-side)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredCourses = filteredCourses.filter(c => 
          c.title.toLowerCase().includes(query) ||
          (c.department && c.department.toLowerCase().includes(query))
        );
      }
      
      // Filter by published status
      if (filterActive !== null) {
        filteredCourses = filteredCourses.filter(c => c.is_published === filterActive);
      }
      
      setCourses(filteredCourses);
      setTotalPages(Math.ceil(response.total / pageSize));
      setTotalCourses(response.total);
    } catch (err) {
      console.error("Error loading courses:", err);
      setError("Erreur lors du chargement des cours");
    } finally {
      setIsLoading(false);
    }
  }

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCourses();
  };

  const clearFilters = () => {
    setFilterActive(null);
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="heading-display text-2xl text-foreground">
            Gestion des Cours
          </h1>
          <p className="text-muted-foreground">
            {totalCourses} cours au total
          </p>
        </div>
        <Link
          href="/staff/courses/new"
          className="btn-primary inline-flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4" />
          Nouveau cours
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un cours..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </form>

        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors ${
              filterActive !== null
                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400"
                : "border-border bg-card hover:bg-muted"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtres
            {filterActive !== null && (
              <span className="w-2 h-2 rounded-full bg-primary-500" />
            )}
          </button>

          {showFilters && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-lg z-10 p-2">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                Statut
              </p>
              <button
                onClick={() => {
                  setFilterActive(true);
                  setShowFilters(false);
                  setCurrentPage(1);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  filterActive === true
                    ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400"
                    : "hover:bg-muted"
                }`}
              >
                Actifs uniquement
              </button>
              <button
                onClick={() => {
                  setFilterActive(false);
                  setShowFilters(false);
                  setCurrentPage(1);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  filterActive === false
                    ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400"
                    : "hover:bg-muted"
                }`}
              >
                Inactifs uniquement
              </button>
              {filterActive !== null && (
                <>
                  <hr className="my-2 border-border" />
                  <button
                    onClick={() => {
                      clearFilters();
                      setShowFilters(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Effacer les filtres
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => fetchCourses()}
            className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : courses.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12 bg-card rounded-2xl border border-border">
          <BookOpen className="w-14 h-14 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {searchQuery || filterActive !== null
              ? "Aucun cours trouvé"
              : "Aucun cours créé"}
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {searchQuery || filterActive !== null
              ? "Essayez de modifier vos critères de recherche"
              : "Créez votre premier cours pour commencer"}
          </p>
          {searchQuery || filterActive !== null ? (
            <button
              onClick={clearFilters}
              className="btn-secondary inline-flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Effacer les filtres
            </button>
          ) : (
            <Link
              href="/staff/courses/new"
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Créer un cours
            </Link>
          )}
        </div>
      ) : (
        /* Courses List */
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="divide-y divide-border">
            {courses.map((course) => (
              <div
                key={course.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
              >
                {/* Image */}
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

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground mb-1 line-clamp-1">
                    {course.title}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {course.department || "Formation générale"} • {course.duration_hours || 0}h
                  </p>
                  {course.price && (
                    <p className="text-sm text-primary-600 dark:text-primary-400 font-medium mt-1">
                      {course.price.toLocaleString()} DA
                    </p>
                  )}
                </div>

                {/* Status */}
                <span
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                    course.is_published
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {course.is_published ? "Publié" : "Brouillon"}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/courses/${course.id}`}
                    className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text.foreground"
                    title="Voir"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/staff/courses/${course.id}/edit`}
                    className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Modifier"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCourse(course.id);
                    }}
                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-muted-foreground hover:text-red-600"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
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
