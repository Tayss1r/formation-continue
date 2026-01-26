"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  MapPin,
  User,
  Mail,
  Phone,
  CheckCircle,
  Share2,
  Heart,
  AlertCircle,
  Loader2,
  BookOpen,
} from "lucide-react";
import { Header } from "@/components/Header";
import { getCourseDetails } from "@/lib/courses";
import { getCourseAvailability, getCourseAvailabilityWithBookingStatus } from "@/lib/booking";
import { getImageUrl } from "@/lib/config";
import { useAuth } from "@/contexts/AuthContext";
import type { Course } from "@/types/course";
import type { AvailabilitySlot, AvailabilitySlotWithBookingStatus } from "@/types/booking";
import { BookingModal } from "@/components/BookingModal";

export default function CourseDetailsPage() {
  const params = useParams();
  const courseId = Number(params.id);
  const { user, isAuthenticated } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlotWithBookingStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlotWithBookingStatus | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    async function fetchCourse() {
      try {
        setIsLoading(true);
        const data = await getCourseDetails(courseId);
        setCourse(data);
      } catch (err) {
        console.error("Failed to fetch course:", err);
        setError("Course not found or unavailable.");
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchAvailability() {
      try {
        setSlotsLoading(true);
        // Use authenticated endpoint if user is logged in and is a company
        if (isAuthenticated && user?.role === "company") {
          const response = await getCourseAvailabilityWithBookingStatus(courseId, 1, 50, true);
          setAvailabilitySlots(response.slots);
        } else {
          // Use public endpoint
          const response = await getCourseAvailability(courseId, 1, 50, true);
          setAvailabilitySlots(response.slots);
        }
      } catch (err) {
        console.error("Failed to fetch availability:", err);
        // Fallback to public endpoint on error
        try {
          const response = await getCourseAvailability(courseId, 1, 50, true);
          setAvailabilitySlots(response.slots);
        } catch {
          // Ignore fallback error
        }
      } finally {
        setSlotsLoading(false);
      }
    }

    if (courseId) {
      fetchCourse();
      fetchAvailability();
    }
  }, [courseId, isAuthenticated, user?.role]);

  // Format price in Tunisian Dinar (DT)
  const formatPrice = (price: number) => {
    return `${new Intl.NumberFormat("fr-TN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)} DT`;
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Format short date for slots
  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Format time
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Check if user is a company
  const isCompanyUser = user?.role === "company";

  // Handle booking slot selection
  const handleBookSlot = (slot: AvailabilitySlotWithBookingStatus) => {
    if (!isAuthenticated) {
      // Redirect to login
      window.location.href = "/login?redirect=" + encodeURIComponent(`/courses/${courseId}`);
      return;
    }
    if (!isCompanyUser) {
      alert("Seuls les comptes entreprise peuvent réserver des formations.");
      return;
    }
    setSelectedSlot(slot);
    setShowBookingModal(true);
  };

  // Handle booking success
  const handleBookingSuccess = async () => {
    setShowBookingModal(false);
    setSelectedSlot(null);
    // Refresh availability slots with booking status
    try {
      if (isAuthenticated && user?.role === "company") {
        const response = await getCourseAvailabilityWithBookingStatus(courseId, 1, 50, true);
        setAvailabilitySlots(response.slots);
      } else {
        const response = await getCourseAvailability(courseId, 1, 50, true);
        setAvailabilitySlots(response.slots);
      }
    } catch {
      // Ignore refresh error
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#020817]">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </main>
    );
  }

  if (error || !course) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-[#020817]">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Course Not Found
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#020817]">
      <Header />

      {/* Breadcrumb */}
      <div className="pt-24 pb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="text-slate-500 hover:text-purple-500 transition-colors"
            >
              Accueil
            </Link>
            <span className="text-slate-400">/</span>
            <Link
              href="/courses"
              className="text-slate-500 hover:text-purple-500 transition-colors"
            >
              Formations
            </Link>
            <span className="text-slate-400">/</span>
            <span className="text-slate-900 dark:text-white truncate max-w-xs">
              {course.title}
            </span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2">
              {/* Course Image */}
              <div className="relative rounded-2xl overflow-hidden mb-8">
                <img
                  src={getImageUrl(course.image_path)}
                  alt={course.title}
                  className="w-full h-[400px] object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder-course.jpg";
                  }}
                />
                {/* Course Type Badge */}
                <div className="absolute top-4 left-4">
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      course.type === "public"
                        ? "bg-green-500 text-white"
                        : "bg-orange-500 text-white"
                    }`}
                  >
                    {course.type === "public" ? "Formation Publique" : "Formation Privée"}
                  </span>
                </div>
                {/* Share & Favorite */}
                <div className="absolute top-4 right-4 flex gap-2">
                  <button className="p-2 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors">
                    <Heart className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Course Title & Description */}
              <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-8 mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                  {course.title}
                </h1>

                {course.short_description && (
                  <p className="text-lg text-slate-600 dark:text-slate-400 mb-6">
                    {course.short_description}
                  </p>
                )}

                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                    Description de la Formation
                  </h2>
                  <div className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                    {course.description}
                  </div>
                </div>
              </div>

              {/* What You'll Learn */}
              <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-8 mb-8">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
                  Ce que vous apprendrez
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    "Maîtrise des concepts fondamentaux",
                    "Mise en pratique à travers des exercices",
                    "Études de cas réels",
                    "Méthodologies éprouvées",
                    "Outils et techniques actuels",
                    "Certification à la fin de la formation",
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-slate-600 dark:text-slate-400">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructor */}
              {course.professor && (
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-8">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
                    Formateur
                  </h2>
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold">
                      {course.professor.specialization.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Expert en {course.professor.specialization}
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">
                        Spécialisation: {course.professor.specialization}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                {/* Price Card */}
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 mb-6">
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
                      {formatPrice(course.price)}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      par participant
                    </p>
                  </div>

                  <button className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity mb-4">
                    Demander cette Formation
                  </button>

                  <button className="w-full px-6 py-4 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    Contacter pour Devis
                  </button>
                </div>

                {/* Course Info */}
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Informations
                  </h3>
                  
                  <div className="space-y-4">
                    {course.duration_hours && (
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-purple-500" />
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Durée</p>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {course.duration_hours} heures
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Capacité</p>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {course.max_seats} participants max
                        </p>
                      </div>
                    </div>

                    {course.sector && (
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-purple-500" />
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Secteur</p>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {course.sector}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Available Sessions */}
                <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 mt-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Sessions Disponibles
                  </h3>
                  
                  {slotsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : availabilitySlots.length === 0 ? (
                    <div className="text-center py-6">
                      <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 dark:text-slate-400 text-sm">
                        Aucune session disponible pour le moment.
                      </p>
                      <p className="text-slate-500 dark:text-slate-500 text-xs mt-1">
                        Contactez-nous pour connaître les prochaines dates.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availabilitySlots.map((slot) => {
                        const remainingSeats = slot.max_seats - slot.reserved_seats;
                        const deadlinePassed = new Date(slot.booking_deadline) < new Date();
                        const hasUserBooking = !!slot.user_booking_id;
                        const userBookingStatus = slot.user_booking_status;
                        const canBook = !deadlinePassed && remainingSeats > 0 && slot.status === "open" && !hasUserBooking;
                        
                        // Get booking status badge for user's booking
                        const getBookingStatusBadge = (status: string) => {
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
                        
                        return (
                          <div
                            key={slot.id}
                            className={`p-4 rounded-xl border ${
                              hasUserBooking && userBookingStatus !== "cancelled"
                                ? "border-green-200 dark:border-green-500/30 bg-green-50/50 dark:bg-green-500/10"
                                : canBook
                                ? "border-purple-200 dark:border-purple-500/30 bg-purple-50/50 dark:bg-purple-500/10"
                                : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 opacity-60"
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-purple-500" />
                                <span className="font-medium text-slate-900 dark:text-white text-sm">
                                  {formatShortDate(slot.start_date)}
                                </span>
                              </div>
                              {hasUserBooking && userBookingStatus ? (
                                getBookingStatusBadge(userBookingStatus)
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    remainingSeats > 5
                                      ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                                      : remainingSeats > 0
                                      ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400"
                                      : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                                  }`}
                                >
                                  {remainingSeats > 0 ? `${remainingSeats} places` : "Complet"}
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 mb-3">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatShortDate(slot.start_date)} - {formatShortDate(slot.end_date)}
                              </div>
                              {slot.schedule && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {slot.schedule}
                                </div>
                              )}
                              {!hasUserBooking && (
                                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                  <AlertCircle className="w-3 h-3" />
                                  Réserver avant le {formatShortDate(slot.booking_deadline)}
                                </div>
                              )}
                            </div>

                            {hasUserBooking && userBookingStatus !== "cancelled" ? (
                              <div className="w-full py-2 rounded-lg text-sm font-medium text-center bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
                                <CheckCircle className="w-4 h-4 inline-block mr-1" />
                                Déjà réservé
                              </div>
                            ) : (
                              <button
                                onClick={() => handleBookSlot(slot)}
                                disabled={!canBook}
                                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                                  canBook
                                    ? "bg-purple-500 text-white hover:bg-purple-600"
                                    : "bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400 cursor-not-allowed"
                                }`}
                              >
                                {deadlinePassed
                                  ? "Délai dépassé"
                                  : remainingSeats === 0
                                  ? "Complet"
                                  : "Réserver cette session"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Contact Card */}
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20 p-6 mt-6">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Besoin d&apos;aide ?
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                    Notre équipe est disponible pour répondre à vos questions.
                  </p>
                  <div className="space-y-2">
                    <a
                      href="mailto:formation@university.dz"
                      className="flex items-center gap-2 text-purple-500 hover:text-purple-600 text-sm"
                    >
                      <Mail className="w-4 h-4" />
                      formation@university.dz
                    </a>
                    <a
                      href="tel:+213123456789"
                      className="flex items-center gap-2 text-purple-500 hover:text-purple-600 text-sm"
                    >
                      <Phone className="w-4 h-4" />
                      +213 123 456 789
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {selectedSlot && (
        <BookingModal
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedSlot(null);
          }}
          slot={selectedSlot}
          courseTitle={course.title}
          pricePerPerson={course.price}
          onSuccess={handleBookingSuccess}
        />
      )}
    </main>
  );
}
