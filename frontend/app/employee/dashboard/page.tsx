"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Calendar,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getMyEnrollments, MyEnrollment } from "@/lib/enrollment";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<MyEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getMyEnrollments();
        setEnrollments(data);
      } catch (err) {
        console.error("Error loading enrollments:", err);
        setError("Erreur lors du chargement des inscriptions");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Calculate stats
  const totalEnrollments = enrollments.length;
  const pendingDocs = enrollments.filter(e => !e.document_status || e.document_status === "pending_review").length;
  const verifiedDocs = enrollments.filter(e => e.document_status === "verified").length;
  const upcomingSessions = enrollments.filter(e => 
    e.session?.start_date && new Date(e.session.start_date) > new Date()
  ).length;

  // Stats cards data
  const stats = [
    {
      label: "Mes Inscriptions",
      value: totalEnrollments,
      icon: BookOpen,
      color: "from-purple-500 to-pink-500",
    },
    {
      label: "Sessions à Venir",
      value: upcomingSessions,
      icon: Calendar,
      color: "from-blue-500 to-cyan-500",
    },
    {
      label: "Documents Vérifiés",
      value: verifiedDocs,
      icon: CheckCircle,
      color: "from-green-500 to-emerald-500",
    },
    {
      label: "Documents en Attente",
      value: pendingDocs,
      icon: AlertCircle,
      color: "from-yellow-500 to-orange-500",
      highlight: pendingDocs > 0,
    },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
            <CheckCircle className="w-3 h-3" />
            Vérifié
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            Rejeté
          </span>
        );
      case "pending_review":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">
            <Clock className="w-3 h-3" />
            En attente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
            <FileText className="w-3 h-3" />
            Non soumis
          </span>
        );
    }
  };

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">
            Erreur de chargement
          </h2>
          <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Mes Inscriptions
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Bienvenue, {user?.first_name || user?.email}
          </p>
        </div>
        <Link
          href="/employee/enroll"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          Nouvelle Inscription
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`bg-white dark:bg-slate-800/50 rounded-2xl border p-6 ${
              stat.highlight 
                ? "border-yellow-300 dark:border-yellow-500/50 ring-2 ring-yellow-200 dark:ring-yellow-500/20" 
                : "border-slate-200 dark:border-slate-700/50"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              {stat.highlight && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500 text-white animate-pulse">
                  Action
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {isLoading ? "-" : stat.value}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Enrollments Section */}
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Mes Formations
          </h2>
          {enrollments.length > 0 && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {enrollments.length} inscription{enrollments.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : enrollments.length === 0 ? (
          <div className="text-center py-12 px-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              Aucune inscription
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-sm mx-auto">
              Vous n&apos;êtes inscrit à aucune formation pour le moment. Utilisez un code d&apos;inscription fourni par votre entreprise.
            </p>
            <Link
              href="/employee/enroll"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-5 h-5" />
              S&apos;inscrire à une formation
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
            {enrollments.map((enrollment) => (
              <Link
                key={enrollment.id}
                href={`/employee/enrollments/${enrollment.id}`}
                className="flex items-center gap-4 p-6 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
              >
                {/* Course Icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>

                {/* Course Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                    {enrollment.session.course_title}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {enrollment.company_name}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {enrollment.session.start_date
                          ? formatDate(enrollment.session.start_date)
                          : "Date à confirmer"}
                      </span>
                    </div>
                    {enrollment.session.schedule && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{enrollment.session.schedule}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {getStatusBadge(enrollment.document_status)}
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Help Section */}
      {enrollments.length > 0 && pendingDocs > 0 && (
        <div className="mt-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200 dark:border-purple-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Documents requis
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Vous avez {pendingDocs} inscription{pendingDocs > 1 ? "s" : ""} en attente de document. 
                Veuillez soumettre votre pièce d&apos;identité (CIN ou Passeport) pour valider votre participation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
