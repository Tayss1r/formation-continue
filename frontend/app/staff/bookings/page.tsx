"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  Users,
  Clock,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  ClipboardList,
  Filter,
} from "lucide-react";
import { getStaffAvailabilitySlots, getSlotBookings } from "@/lib/booking";
import { getStaffCourses } from "@/lib/courses";
import type { AvailabilitySlot, Booking } from "@/types/booking";
import type { CourseListItem } from "@/types/course";

interface BookingWithSlot extends Booking {
  slot: AvailabilitySlot;
  courseName: string;
  sessionNumber: number | null;
  totalSessions: number;
}

type BookingStatusFilter = "all" | "reserved" | "confirmed" | "cancelled";

export default function StaffBookingsPage() {
  const [bookings, setBookings] = useState<BookingWithSlot[]>([]);
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BookingStatusFilter>("all");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      let coursesData: { courses: CourseListItem[] } = { courses: [] };
      let slotsData: { slots: AvailabilitySlot[] } = { slots: [] };
      
      // Get courses first
      try {
        coursesData = await getStaffCourses(1, 100);
        setCourses(coursesData.courses);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
      }
      
      // Get slots
      try {
        slotsData = await getStaffAvailabilitySlots(1, 50);
      } catch (err) {
        console.error("Failed to fetch slots:", err);
        setLoading(false);
        return;
      }
      
      // Get bookings for each slot that has reserved seats
      const slotsWithBookings = slotsData.slots.filter(s => s.reserved_seats > 0);
      
      // Calculate session numbers per course
      const getSessionInfo = (slot: AvailabilitySlot) => {
        const courseName = slot.course?.title || 
          coursesData.courses.find(c => c.id === slot.course_id)?.title || 
          `Formation #${slot.course_id}`;
        
        const courseSlots = slotsData.slots
          .filter(s => s.course_id === slot.course_id)
          .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
        
        if (courseSlots.length <= 1) {
          return { courseName, sessionNumber: null, totalSessions: 1 };
        }
        
        const sessionNumber = courseSlots.findIndex(s => s.id === slot.id) + 1;
        return { courseName, sessionNumber, totalSessions: courseSlots.length };
      };
      
      const allBookings: BookingWithSlot[] = [];
      
      for (const slot of slotsWithBookings) {
        try {
          const summary = await getSlotBookings(slot.id);
          const sessionInfo = getSessionInfo(slot);
          
          for (const booking of summary.bookings) {
            allBookings.push({
              ...booking,
              slot,
              courseName: sessionInfo.courseName,
              sessionNumber: sessionInfo.sessionNumber,
              totalSessions: sessionInfo.totalSessions,
            });
          }
        } catch (err) {
          console.error(`Failed to fetch bookings for slot ${slot.id}:`, err);
        }
      }
      
      // Sort by most recent first
      allBookings.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setBookings(allBookings);
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "reserved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">
            <Clock className="w-3 h-3" />
            Réservé
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
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

  const filteredBookings = statusFilter === "all"
    ? bookings
    : bookings.filter(b => b.status === statusFilter);

  // Stats
  const totalBookings = bookings.filter(b => b.status !== "cancelled").length;
  const pendingBookings = bookings.filter(b => b.status === "reserved").length;
  const confirmedBookings = bookings.filter(b => b.status === "confirmed").length;
  const totalParticipants = bookings
    .filter(b => b.status !== "cancelled")
    .reduce((sum, b) => sum + b.employee_count, 0);

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
            Réservations
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Suivez et gérez les réservations des entreprises
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total réservations</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalBookings}</p>
        </div>

        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            {pendingBookings > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500 text-white">
                {pendingBookings}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">En attente</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{pendingBookings}</p>
        </div>

        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Confirmées</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{confirmedBookings}</p>
        </div>

        <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Total participants</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalParticipants}</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-8 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Nouveau système de réservation :</strong> Les formations n&apos;ont plus de dates fixes.
              Vous définissez des créneaux de disponibilité, et les entreprises réservent des places sur ces créneaux.
              Une fois le délai de réservation passé, vous confirmez ou annulez la session.
            </p>
            <Link
              href="/staff/availability"
              className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Gérer les sessions
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700/50 gap-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Toutes les réservations
          </h2>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BookingStatusFilter)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="reserved">Réservé</option>
              <option value="confirmed">Confirmé</option>
              <option value="cancelled">Annulé</option>
            </select>
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              {statusFilter === "all"
                ? "Aucune réservation pour le moment"
                : `Aucune réservation avec le statut "${statusFilter}"`}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              Les entreprises pourront réserver des places sur vos créneaux ouverts
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
            {filteredBookings.map((booking) => (
              <Link
                key={booking.id}
                href={`/staff/courses/${booking.slot.course_id}/availability/${booking.slot.id}/bookings`}
                className="flex items-center gap-4 p-5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {booking.company?.company_name || "Entreprise"}
                    </p>
                    {getStatusBadge(booking.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate">{booking.courseName}</span>
                      {booking.sessionNumber && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded">
                          S{booking.sessionNumber}/{booking.totalSessions}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {booking.employee_count} participant{booking.employee_count > 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(booking.slot.start_date)}
                    </span>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDateTime(booking.created_at)}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
