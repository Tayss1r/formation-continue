"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Loader2,
  CalendarPlus,
  Filter,
} from "lucide-react";
import { getStaffAvailabilitySlots, getPendingReviewSlots } from "@/lib/booking";
import { getStaffCourses } from "@/lib/courses";
import type { AvailabilitySlot } from "@/types/booking";
import type { CourseListItem } from "@/types/course";

type FilterStatus = "all" | "open" | "pending_review" | "confirmed" | "cancelled";

export default function StaffAvailabilityPage() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [pendingSlots, setPendingSlots] = useState<AvailabilitySlot[]>([]);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // Fetch courses first - needed for context
      try {
        const coursesData = await getStaffCourses(1, 100);
        setCourses(coursesData.courses);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
      }

      // Fetch slots separately
      try {
        const slotsData = await getStaffAvailabilitySlots(1, 50);
        setSlots(slotsData.slots);
      } catch (err) {
        console.error("Failed to fetch slots:", err);
      }

      // Fetch pending slots separately
      try {
        const pendingData = await getPendingReviewSlots(1, 50);
        setPendingSlots(pendingData.slots);
      } catch (err) {
        console.error("Failed to fetch pending slots:", err);
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Ouvert
          </span>
        );
      case "pending_review":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
            En attente
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
            <CheckCircle className="w-3 h-3" />
            Confirmé
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            Annulé
          </span>
        );
      default:
        return null;
    }
  };

  // Calculate session numbers per course
  const getSessionInfo = (slot: AvailabilitySlot) => {
    // Get the course name
    const courseName = slot.course?.title || 
      courses.find((c) => c.id === slot.course_id)?.title || 
      `Formation #${slot.course_id}`;
    
    // Find all slots for this course, sorted by start_date
    const courseSlots = slots
      .filter(s => s.course_id === slot.course_id)
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
    
    // If only one session, just return the course name
    if (courseSlots.length <= 1) {
      return { name: courseName, sessionNumber: null, totalSessions: 1 };
    }
    
    // Find the session number (1-based index)
    const sessionNumber = courseSlots.findIndex(s => s.id === slot.id) + 1;
    
    return { 
      name: courseName, 
      sessionNumber, 
      totalSessions: courseSlots.length 
    };
  };

  const filteredSlots = statusFilter === "all" 
    ? slots 
    : slots.filter(s => s.status === statusFilter);

  // Stats
  const openSlots = slots.filter((s) => s.status === "open").length;
  const pendingCount = pendingSlots.length;
  const confirmedSlots = slots.filter((s) => s.status === "confirmed").length;
  const upcomingSlots = slots.filter(
    (s) => new Date(s.start_date) > new Date() && s.status !== "cancelled"
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Sessions & Planning
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Gérez les créneaux de disponibilité de vos formations
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sessions ouvertes</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{openSlots}</p>
        </div>

        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500 text-white">
                {pendingCount}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">À confirmer</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{pendingCount}</p>
        </div>

        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Sessions confirmées</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{confirmedSlots}</p>
        </div>

        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">À venir</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{upcomingSlots}</p>
        </div>
      </div>

      {/* Pending Review Alert */}
      {pendingSlots.length > 0 && (
        <div className="mb-8 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                {pendingSlots.length} session{pendingSlots.length > 1 ? "s" : ""} en attente de confirmation
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-4">
                Ces sessions ont dépassé leur date limite de réservation et nécessitent votre décision.
              </p>
              <div className="space-y-2">
                {pendingSlots.slice(0, 3).map((slot) => {
                  const sessionInfo = getSessionInfo(slot);
                  return (
                  <Link
                    key={slot.id}
                    href={`/staff/courses/${slot.course_id}/availability/${slot.id}/bookings`}
                    className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-yellow-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 dark:text-white text-sm">
                            {sessionInfo.name}
                          </p>
                          {sessionInfo.sessionNumber && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded">
                              Session {sessionInfo.sessionNumber}/{sessionInfo.totalSessions}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {formatDate(slot.start_date)} • {slot.reserved_seats}/{slot.max_seats} places
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </Link>
                  );
                })}
                {pendingSlots.length > 3 && (
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 text-center pt-2">
                    +{pendingSlots.length - 3} autre{pendingSlots.length - 3 > 1 ? "s" : ""} session{pendingSlots.length - 3 > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Courses Quick Access */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Gérer par formation
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.slice(0, 6).map((course) => {
            const courseSlots = slots.filter((s) => s.course_id === course.id);
            const openCount = courseSlots.filter((s) => s.status === "open").length;
            const pendingCourseCount = courseSlots.filter((s) => s.status === "pending_review").length;

            return (
              <Link
                key={course.id}
                href={`/staff/courses/${course.id}/availability`}
                className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 hover:border-purple-300 dark:hover:border-purple-500/50 hover:shadow-lg transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-medium text-slate-900 dark:text-white line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {course.title}
                  </h3>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-500 transition-colors" />
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <Calendar className="w-4 h-4" />
                    <span>{courseSlots.length} sessions</span>
                  </div>
                  {openCount > 0 && (
                    <span className="text-green-600 dark:text-green-400">
                      {openCount} ouverte{openCount > 1 ? "s" : ""}
                    </span>
                  )}
                  {pendingCourseCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">
                      {pendingCourseCount} à confirmer
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
        {courses.length > 6 && (
          <div className="mt-4 text-center">
            <Link
              href="/staff/courses"
              className="text-sm text-purple-500 hover:text-purple-600 font-medium"
            >
              Voir toutes les formations →
            </Link>
          </div>
        )}
      </div>

      {/* All Sessions with Filter */}
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700/50 gap-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Toutes les sessions
          </h2>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="open">Ouvert</option>
              <option value="pending_review">En attente</option>
              <option value="confirmed">Confirmé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
        </div>

        {filteredSlots.length === 0 ? (
          <div className="text-center py-12">
            <CalendarPlus className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              {statusFilter === "all" 
                ? "Aucune session créée"
                : `Aucune session avec le statut "${statusFilter}"`}
            </p>
            {statusFilter === "all" && (
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Créez des sessions depuis la page de chaque formation
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
            {filteredSlots.map((slot) => {
              const deadlinePassed = new Date(slot.booking_deadline) < new Date();
              const isUpcoming = new Date(slot.start_date) > new Date();
              const sessionInfo = getSessionInfo(slot);

              return (
                <Link
                  key={slot.id}
                  href={`/staff/courses/${slot.course_id}/availability/${slot.id}/bookings`}
                  className="flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        {sessionInfo.name}
                      </p>
                      {sessionInfo.sessionNumber && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-500/20 dark:to-pink-500/20 text-purple-700 dark:text-purple-300 rounded-full">
                          Session {sessionInfo.sessionNumber}/{sessionInfo.totalSessions}
                        </span>
                      )}
                      {getStatusBadge(slot.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(slot.start_date)} - {formatDate(slot.end_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {slot.reserved_seats}/{slot.max_seats} places
                      </span>
                      {deadlinePassed && slot.status === "open" && (
                        <span className="text-orange-600 dark:text-orange-400 text-xs">
                          Délai dépassé
                        </span>
                      )}
                      {slot.status === "confirmed" && (
                        <Link
                          href={`/staff/sessions/${slot.id}/enrollees`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-xs font-medium hover:underline"
                        >
                          Voir les participants →
                        </Link>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
