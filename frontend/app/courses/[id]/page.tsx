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
} from "lucide-react";
import { Header } from "@/components/Header";
import { getCourseDetails } from "@/lib/courses";
import { getImageUrl } from "@/lib/config";
import type { Course } from "@/types/course";

export default function CourseDetailsPage() {
  const params = useParams();
  const courseId = Number(params.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
      minimumFractionDigits: 0,
    }).format(price);
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
                        <p className="text-sm text-slate-500 dark:text-slate-400">Places disponibles</p>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {course.max_seats} participants max
                        </p>
                      </div>
                    </div>

                    {course.start_date && (
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-purple-500" />
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Date de début</p>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {formatDate(course.start_date)}
                          </p>
                        </div>
                      </div>
                    )}

                    {course.schedule && (
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-purple-500" />
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Horaires</p>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {course.schedule}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
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
    </main>
  );
}
