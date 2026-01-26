"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Plus,
  Clock,
  Users,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Eye,
} from "lucide-react";
import { getCourseDetails } from "@/lib/courses";
import {
  getCourseAvailability,
  createAvailabilitySlot,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
  confirmOrCancelSlot,
} from "@/lib/booking";
import type { Course } from "@/types/course";
import type {
  AvailabilitySlot,
  CreateAvailabilityRequest,
  UpdateAvailabilityRequest,
} from "@/types/booking";

export default function CourseAvailabilityPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = parseInt(params.id as string);

  const [course, setCourse] = useState<Course | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [schedule, setSchedule] = useState("");
  const [maxSeats, setMaxSeats] = useState<number | "">("");
  const [minSeats, setMinSeats] = useState<number | "">("");
  const [bookingDeadline, setBookingDeadline] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [courseData, availabilityData] = await Promise.all([
          getCourseDetails(courseId),
          getCourseAvailability(courseId, 1, 50, false), // Include all statuses for staff
        ]);
        setCourse(courseData);
        setSlots(availabilityData.slots);
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Erreur lors du chargement des données");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [courseId]);

  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setSchedule("");
    setMaxSeats("");
    setMinSeats("");
    setBookingDeadline("");
    setEditingSlot(null);
    setFormError(null);
  };

  const openNewForm = () => {
    resetForm();
    if (course) {
      setMaxSeats(course.max_seats);
    }
    setShowForm(true);
  };

  const openEditForm = (slot: AvailabilitySlot) => {
    setEditingSlot(slot);
    setStartDate(slot.start_date.split("T")[0]);
    setEndDate(slot.end_date.split("T")[0]);
    setSchedule(slot.schedule || "");
    setMaxSeats(slot.max_seats);
    setMinSeats(slot.min_seats || "");
    setBookingDeadline(slot.booking_deadline.split("T")[0]);
    setFormError(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      if (editingSlot) {
        // Update existing slot
        const updateData: UpdateAvailabilityRequest = {
          start_date: startDate,
          end_date: endDate,
          schedule: schedule || undefined,
          max_seats: maxSeats as number,
          min_seats: minSeats ? (minSeats as number) : undefined,
          booking_deadline: bookingDeadline,
        };

        const updated = await updateAvailabilitySlot(editingSlot.id, updateData);
        setSlots((prev) =>
          prev.map((s) => (s.id === editingSlot.id ? updated : s))
        );
      } else {
        // Create new slot
        const createData: CreateAvailabilityRequest = {
          course_id: courseId,
          start_date: startDate,
          end_date: endDate,
          schedule: schedule || undefined,
          max_seats: maxSeats as number,
          min_seats: minSeats ? (minSeats as number) : undefined,
          booking_deadline: bookingDeadline,
        };

        const created = await createAvailabilitySlot(createData);
        setSlots((prev) => [...prev, created]);
      }

      setShowForm(false);
      resetForm();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Une erreur est survenue");
      }
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (slotId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce créneau ?")) {
      return;
    }

    try {
      await deleteAvailabilitySlot(slotId);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Erreur lors de la suppression");
      }
    }
  };

  const handleConfirm = async (slotId: number) => {
    try {
      await confirmOrCancelSlot(slotId, "confirmed");
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, status: "confirmed" as const } : s))
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Erreur lors de la confirmation");
      }
    }
  };

  const handleCancel = async (slotId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir annuler ce créneau ?")) {
      return;
    }

    try {
      await confirmOrCancelSlot(slotId, "cancelled");
      setSlots((prev) =>
        prev.map((s) => (s.id === slotId ? { ...s, status: "cancelled" as const } : s))
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Erreur lors de l'annulation");
      }
    }
  };

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
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
            Ouvert
          </span>
        );
      case "pending_review":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">
            En attente
          </span>
        );
      case "confirmed":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            {error || "Formation non trouvée"}
          </p>
          <Link
            href="/staff/courses"
            className="text-purple-500 hover:text-purple-600 mt-4 inline-block"
          >
            Retour aux formations
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
          href="/staff/courses"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-purple-500 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux formations
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Sessions de formation
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {course.title}
            </p>
          </div>
          <button
            onClick={openNewForm}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            Nouveau créneau
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowForm(false);
              resetForm();
            }}
          />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
                {editingSlot ? "Modifier le créneau" : "Nouveau créneau"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Date de début *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Date de fin *
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Horaires
                  </label>
                  <input
                    type="text"
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    placeholder="ex: 09h00 - 17h00"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Places max *
                    </label>
                    <input
                      type="number"
                      value={maxSeats}
                      onChange={(e) =>
                        setMaxSeats(e.target.value ? parseInt(e.target.value) : "")
                      }
                      min={1}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Places min
                    </label>
                    <input
                      type="number"
                      value={minSeats}
                      onChange={(e) =>
                        setMinSeats(e.target.value ? parseInt(e.target.value) : "")
                      }
                      min={1}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Date limite de réservation *
                  </label>
                  <input
                    type="date"
                    value={bookingDeadline}
                    onChange={(e) => setBookingDeadline(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {formError && (
                  <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-600 dark:text-red-400 text-sm">
                    {formError}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {formLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : editingSlot ? (
                      "Mettre à jour"
                    ) : (
                      "Créer"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Slots List */}
      {slots.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Aucun créneau
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Créez un créneau pour permettre aux entreprises de réserver cette
            formation.
          </p>
          <button
            onClick={openNewForm}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Créer un créneau
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {slots.map((slot) => {
            const remainingSeats = slot.max_seats - slot.reserved_seats;
            const isEditable = slot.status === "open" && slot.reserved_seats === 0;
            
            // Check if today is the deadline day or past
            const deadline = new Date(slot.booking_deadline);
            const today = new Date();
            const isDeadlineDay = deadline.toDateString() === today.toDateString();
            const isDeadlinePassed = today >= deadline;
            const canConfirmOrCancel = isDeadlineDay || isDeadlinePassed;

            return (
              <div
                key={slot.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <Calendar className="w-5 h-5 text-purple-500" />
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {formatDate(slot.start_date)} - {formatDate(slot.end_date)}
                      </span>
                      {getStatusBadge(slot.status)}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      {slot.schedule && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Clock className="w-4 h-4" />
                          {slot.schedule}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <Users className="w-4 h-4" />
                        {slot.reserved_seats}/{slot.max_seats} places
                      </div>
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <AlertCircle className="w-4 h-4" />
                        Limite: {formatDate(slot.booking_deadline)}
                      </div>
                      {slot.min_seats && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Users className="w-4 h-4" />
                          Min: {slot.min_seats}
                        </div>
                      )}
                    </div>
                    
                    {/* Show deadline-day message if cannot confirm yet */}
                    {(slot.status === "open" || slot.status === "pending_review") && 
                     slot.reserved_seats > 0 && 
                     !canConfirmOrCancel && (
                      <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg">
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          ⏰ Confirmation/annulation disponible le {formatDate(slot.booking_deadline)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View bookings */}
                    <Link
                      href={`/staff/courses/${courseId}/availability/${slot.id}/bookings`}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
                      title="Voir les réservations"
                    >
                      <Eye className="w-5 h-5" />
                    </Link>

                    {/* Edit - only for open slots with no bookings */}
                    {isEditable && (
                      <button
                        onClick={() => openEditForm(slot)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    )}

                    {/* Delete - only for slots with no bookings */}
                    {slot.reserved_seats === 0 && slot.status !== "confirmed" && (
                      <button
                        onClick={() => handleDelete(slot.id)}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}

                    {/* Confirm - for pending_review or open with bookings, only on deadline day or after */}
                    {(slot.status === "pending_review" ||
                      (slot.status === "open" && slot.reserved_seats > 0)) && canConfirmOrCancel && (
                      <button
                        onClick={() => handleConfirm(slot.id)}
                        className="p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-500/10 text-green-500 transition-colors"
                        title="Confirmer la session"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}

                    {/* Cancel - for open or pending, only on deadline day or after */}
                    {(slot.status === "open" || slot.status === "pending_review") && canConfirmOrCancel && (
                      <button
                        onClick={() => handleCancel(slot.id)}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors"
                        title="Annuler la session"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
