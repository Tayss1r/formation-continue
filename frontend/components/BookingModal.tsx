"use client";

import { useState } from "react";
import {
  X,
  Calendar,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  MinusCircle,
  PlusCircle,
} from "lucide-react";
import { createBooking } from "@/lib/booking";
import type { AvailabilitySlot } from "@/types/booking";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  slot: AvailabilitySlot;
  courseTitle: string;
  pricePerPerson: number;
  onSuccess: () => void;
}

export function BookingModal({
  isOpen,
  onClose,
  slot,
  courseTitle,
  pricePerPerson,
  onSuccess,
}: BookingModalProps) {
  const [employeeCount, setEmployeeCount] = useState(slot.min_seats || 1);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const remainingSeats = slot.max_seats - slot.reserved_seats;
  const maxCanBook = Math.min(remainingSeats, slot.max_seats);
  const minRequired = slot.min_seats || 1;
  const totalPrice = employeeCount * pricePerPerson;

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "TND",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleIncrement = () => {
    if (employeeCount < maxCanBook) {
      setEmployeeCount(employeeCount + 1);
    }
  };

  const handleDecrement = () => {
    if (employeeCount > minRequired) {
      setEmployeeCount(employeeCount - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await createBooking({
        availability_slot_id: slot.id,
        employee_count: employeeCount,
        notes: notes || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Une erreur est survenue lors de la réservation.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Réserver une session
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Réservation confirmée !
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Votre demande de réservation a été enregistrée. Vous recevrez une
              confirmation par email.
            </p>
          </div>
        ) : (
          <>
            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Course Info */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">
                  {courseTitle}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span>{formatDate(slot.start_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Clock className="w-4 h-4 text-purple-500" />
                    <span>
                      Jusqu'au {formatDate(slot.end_date)}
                    </span>
                  </div>
                  {slot.schedule && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <AlertCircle className="w-4 h-4 text-purple-500" />
                      <span>{slot.schedule}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span>{remainingSeats} places disponibles</span>
                  </div>
                </div>
              </div>

              {/* Employee Count Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                  Nombre de participants
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleDecrement}
                    disabled={employeeCount <= minRequired}
                    className={`p-2 rounded-lg transition-colors ${
                      employeeCount <= minRequired
                        ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                        : "text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10"
                    }`}
                  >
                    <MinusCircle className="w-8 h-8" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-4xl font-bold text-slate-900 dark:text-white">
                      {employeeCount}
                    </span>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      participant{employeeCount > 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={handleIncrement}
                    disabled={employeeCount >= maxCanBook}
                    className={`p-2 rounded-lg transition-colors ${
                      employeeCount >= maxCanBook
                        ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                        : "text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10"
                    }`}
                  >
                    <PlusCircle className="w-8 h-8" />
                  </button>
                </div>
                {minRequired > 1 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                    Minimum {minRequired} participants requis
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                  Notes supplémentaires (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informations supplémentaires pour votre réservation..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Price Summary */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-500/10 dark:to-pink-500/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-600 dark:text-slate-400">
                    Prix unitaire
                  </span>
                  <span className="text-slate-900 dark:text-white">
                    {formatPrice(pricePerPerson)}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-600 dark:text-slate-400">
                    Participants
                  </span>
                  <span className="text-slate-900 dark:text-white">
                    × {employeeCount}
                  </span>
                </div>
                <div className="border-t border-purple-200 dark:border-purple-500/30 my-2" />
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Total estimé
                  </span>
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-600 dark:text-red-400">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Info */}
              <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Votre réservation sera confirmée par notre équipe. Vous
                  recevrez un email de confirmation avec les détails de paiement.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || employeeCount < minRequired}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Réservation...
                  </>
                ) : (
                  "Confirmer la réservation"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
