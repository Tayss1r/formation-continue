"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CalendarCheck,
  Users,
  AlertCircle,
  Clock,
} from "lucide-react";
import { getStaffCourses, deleteCourse } from "@/lib/courses";
import { getStaffAvailabilitySlots } from "@/lib/booking";
import { getImageUrl } from "@/lib/config";
import type { CourseListItem } from "@/types/course";
import type { AvailabilitySlot } from "@/types/booking";

interface CourseWithAvailability extends CourseListItem {
  slots: AvailabilitySlot[];
  openSlots: number;
  pendingSlots: number;
  totalReserved: number;
}

export default function StaffCoursesPage() {
  const [courses, setCourses] = useState<CourseWithAvailability[]>([]);
  const [allSlots, setAllSlots] = useState<AvailabilitySlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  const perPage = 10;

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      
      // Fetch courses first - critical
      let coursesData: { courses: CourseListItem[]; total_pages: number; total: number } | null = null;
      try {
        coursesData = await getStaffCourses(page, perPage);
        setTotalPages(coursesData.total_pages);
        setTotal(coursesData.total);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
        setIsLoading(false);
        return;
      }

      // Fetch slots separately - non-blocking
      let slotsData: AvailabilitySlot[] = [];
      try {
        const slotsResponse = await getStaffAvailabilitySlots(1, 50);
        slotsData = slotsResponse.slots;
        setAllSlots(slotsData);
      } catch (err) {
        console.error("Failed to fetch availability slots:", err);
        // Continue without slots
      }
      
      // Enhance courses with availability info
      const enhancedCourses: CourseWithAvailability[] = coursesData.courses.map(course => {
        const courseSlots = slotsData.filter(s => s.course_id === course.id);
        return {
          ...course,
          slots: courseSlots,
          openSlots: courseSlots.filter(s => s.status === "open").length,
          pendingSlots: courseSlots.filter(s => s.status === "pending_review").length,
          totalReserved: courseSlots.reduce((sum, s) => sum + s.reserved_seats, 0),
        };
      });
      
      setCourses(enhancedCourses);
      setIsLoading(false);
    }

    fetchData();
  }, [page]);

  const handleDelete = async (courseId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette formation ?")) {
      return;
    }

    try {
      await deleteCourse(courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
      setTotal((prev) => prev - 1);
    } catch (err) {
      console.error("Failed to delete course:", err);
      alert("Erreur lors de la suppression");
    }
    
    setActiveDropdown(null);
  };

  // Filter courses by search query (client-side)
  const filteredCourses = searchQuery
    ? courses.filter((course) =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : courses;

  const formatPrice = (price: number) => {
    return `${price.toLocaleString("fr-TN")} DT`;
  };

  // Info banner about new scheduling
  const showInfoBanner = courses.length > 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Mes Formations
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            {total} formation{total !== 1 ? "s" : ""} au total
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

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une formation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
      </div>

      {/* Info Banner - New Scheduling System */}
      {showInfoBanner && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CalendarCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Remarque : </strong>
                Utilisez le bouton <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Sessions</span> pour créer des créneaux de disponibilité que les entreprises pourront réserver.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Courses Table */}
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              {searchQuery ? "Aucune formation trouvée" : "Aucune formation créée"}
            </p>
            {!searchQuery && (
              <Link
                href="/staff/courses/new"
                className="inline-flex items-center gap-2 mt-4 text-purple-500 hover:text-purple-600"
              >
                <Plus className="w-4 h-4" />
                Créer une formation
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/50">
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                      Formation
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                      Type
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                      Prix
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                      Sessions
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                  {filteredCourses.map((course) => (
                    <tr
                      key={course.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={getImageUrl(course.image_path)}
                            alt={course.title}
                            className="w-12 h-12 rounded-lg object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder-course.jpg";
                            }}
                          />
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {course.title}
                            </p>
                            {course.short_description && (
                              <p className="text-sm text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                {course.short_description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            course.type === "public"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                          }`}
                        >
                          {course.type === "public" ? "Public" : "Privé"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-900 dark:text-white">
                        {formatPrice(course.price)}
                      </td>
                      <td className="px-6 py-4">
                        <Link 
                          href={`/staff/courses/${course.id}/availability`}
                          className="group"
                        >
                          {course.slots.length === 0 ? (
                            <span className="text-sm text-slate-400 group-hover:text-purple-500 transition-colors">
                              Aucune session
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-purple-500 transition-colors">
                                  {course.slots.length} session{course.slots.length > 1 ? "s" : ""}
                                </span>
                                {course.pendingSlots > 0 && (
                                  <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-yellow-500 text-white">
                                    {course.pendingSlots}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                {course.openSlots > 0 && (
                                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                    {course.openSlots} ouverte{course.openSlots > 1 ? "s" : ""}
                                  </span>
                                )}
                                {course.totalReserved > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3" />
                                    {course.totalReserved} réservé{course.totalReserved > 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/courses/${course.id}`}
                            className="p-2 text-slate-400 hover:text-purple-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="Voir"
                          >
                            <Eye className="w-5 h-5" />
                          </Link>
                          <Link
                            href={`/staff/courses/${course.id}/availability`}
                            className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                              course.pendingSlots > 0 
                                ? "text-yellow-500 hover:text-yellow-600" 
                                : "text-slate-400 hover:text-purple-500"
                            }`}
                            title={course.pendingSlots > 0 ? `${course.pendingSlots} session(s) à confirmer` : "Gérer les sessions"}
                          >
                            <Calendar className="w-5 h-5" />
                          </Link>
                          <Link
                            href={`/staff/courses/${course.id}/edit`}
                            className="p-2 text-slate-400 hover:text-purple-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-5 h-5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(course.id)}
                            className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-700/50">
              {filteredCourses.map((course) => (
                <div key={course.id} className="p-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={getImageUrl(course.image_path)}
                      alt={course.title}
                      className="w-16 h-16 rounded-lg object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder-course.jpg";
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-900 dark:text-white truncate">
                        {course.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {formatPrice(course.price)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            course.type === "public"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                          }`}
                        >
                          {course.type === "public" ? "Public" : "Privé"}
                        </span>
                        {course.slots.length > 0 && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {course.slots.length} session{course.slots.length > 1 ? "s" : ""}
                          </span>
                        )}
                        {course.pendingSlots > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-yellow-500 text-white">
                            {course.pendingSlots} à confirmer
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveDropdown(activeDropdown === course.id ? null : course.id)
                        }
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <MoreVertical className="w-5 h-5 text-slate-400" />
                      </button>

                      {activeDropdown === course.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg z-10">
                          <Link
                            href={`/courses/${course.id}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                          >
                            <Eye className="w-4 h-4" />
                            Voir
                          </Link>
                          <Link
                            href={`/staff/courses/${course.id}/availability`}
                            className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                              course.pendingSlots > 0 
                                ? "text-yellow-600 dark:text-yellow-400" 
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <Calendar className="w-4 h-4" />
                            Sessions
                            {course.pendingSlots > 0 && (
                              <span className="ml-auto px-1.5 py-0.5 rounded text-xs font-bold bg-yellow-500 text-white">
                                {course.pendingSlots}
                              </span>
                            )}
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
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700/50">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Page {page} sur {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
