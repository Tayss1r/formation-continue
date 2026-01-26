"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Users,
  Building2,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { getSlotBookings, confirmOrCancelSlot } from "@/lib/booking";
import type { SlotBookingSummary, Booking } from "@/types/booking";

export default function SlotBookingsPage() {
  const params = useParams();
  const courseId = parseInt(params.id as string);
  const slotId = parseInt(params.slotId as string);

  const [summary, setSummary] = useState<SlotBookingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBookings() {
      try {
        setLoading(true);
        const data = await getSlotBookings(slotId);
        setSummary(data);
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
        setError("Erreur lors du chargement des réservations");
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, [slotId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "reserved":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">
            Réservé
          </span>
        );
      case "confirmed":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
            Confirmé
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
            Annulé
          </span>
        );
      default:
        return null;
    }
  };

  const getSlotStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
            Ouvert aux réservations
          </span>
        );
      case "pending_review":
        return (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">
            En attente de confirmation
          </span>
        );
      case "confirmed":
        return (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
            Session confirmée
          </span>
        );
      case "cancelled":
        return (
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
            Session annulée
          </span>
        );
      default:
        return null;
    }
  };

  const handleConfirmSlot = async () => {
    if (!confirm("Confirmer cette session de formation ?")) return;

    try {
      await confirmOrCancelSlot(slotId, "confirmed");
      setSummary((prev) =>
        prev ? { ...prev, slot_status: "confirmed" } : null
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Erreur lors de la confirmation");
      }
    }
  };

  const handleCancelSlot = async () => {
    if (
      !confirm(
        "Annuler cette session ? Toutes les réservations seront annulées."
      )
    )
      return;

    try {
      await confirmOrCancelSlot(slotId, "cancelled");
      setSummary((prev) =>
        prev ? { ...prev, slot_status: "cancelled" } : null
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Erreur lors de l'annulation");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            {error || "Créneau non trouvé"}
          </p>
          <Link
            href={`/staff/courses/${courseId}/availability`}
            className="text-purple-500 hover:text-purple-600 mt-4 inline-block"
          >
            Retour aux créneaux
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/staff/courses/${courseId}/availability`}
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-purple-500 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux créneaux
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Réservations du créneau
            </h1>
            {getSlotStatusBadge(summary.slot_status)}
          </div>

          {(summary.slot_status === "open" ||
            summary.slot_status === "pending_review") && (
            (() => {
              // Check if today is the deadline day
              const deadline = new Date(summary.booking_deadline);
              const today = new Date();
              const isDeadlineDay = deadline.toDateString() === today.toDateString();
              const isDeadlinePassed = today >= deadline;
              const canConfirm = isDeadlineDay || isDeadlinePassed;
              
              if (!canConfirm) {
                return (
                  <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl p-4 max-w-sm">
                    <div className="flex items-start gap-2">
                      <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                          Action disponible le {formatDate(summary.booking_deadline)}
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                          La confirmation ou l&apos;annulation ne peut être effectuée que le jour de la date limite de réservation.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              
              return (
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirmSlot}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Confirmer
                  </button>
                  <button
                    onClick={handleCancelSlot}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                  >
                    <XCircle className="w-5 h-5" />
                    Annuler
                  </button>
                </div>
              );
            })()
          )}
        </div>
      </div>

      {/* Slot Info */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dates
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {formatDate(summary.start_date)} - {formatDate(summary.end_date)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Places réservées
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {summary.total_reserved}/{summary.max_seats}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Entreprises
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {summary.bookings.filter((b) => b.status !== "cancelled").length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Date limite
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {formatDate(summary.booking_deadline)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      {summary.bookings.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Aucune réservation
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Ce créneau n&apos;a pas encore de réservations.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Liste des réservations ({summary.bookings.length})
          </h2>

          {summary.bookings.map((booking) => (
            <div
              key={booking.id}
              className={`bg-white dark:bg-slate-800 rounded-2xl border p-6 ${
                booking.status === "cancelled"
                  ? "border-red-200 dark:border-red-500/30 opacity-60"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Building2 className="w-5 h-5 text-purple-500" />
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {booking.company?.company_name || (
                        <span className="text-red-500 italic">
                          Données entreprise manquantes (ID: {booking.company_id})
                        </span>
                      )}
                    </span>
                    {getStatusBadge(booking.status)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Users className="w-4 h-4" />
                      {booking.employee_count} participant
                      {booking.employee_count > 1 ? "s" : ""}
                    </div>
                    {booking.company?.email && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Mail className="w-4 h-4" />
                        {booking.company.email}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Clock className="w-4 h-4" />
                      Réservé le {formatDateTime(booking.created_at)}
                    </div>
                    {booking.company?.phone && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Phone className="w-4 h-4" />
                        {booking.company.phone}
                      </div>
                    )}
                  </div>

                  {booking.notes && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-sm text-slate-600 dark:text-slate-400">
                      <strong>Notes:</strong> {booking.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
