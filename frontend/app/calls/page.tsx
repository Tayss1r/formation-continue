"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Clock,
  FileText,
  Filter,
  Search,
} from "lucide-react";
import { Header } from "@/components/Header";
import { getActiveCalls } from "@/lib/calls";
import type { CallPublic, Department } from "@/types/call";
import { DEPARTMENT_DISPLAY_NAMES } from "@/types/call";

const departments: Department[] = [
  'informatique',
  'mathematiques',
  'physique',
  'biologie',
  'chimie',
  'lettres',
  'economie',
  'droit',
  'medecine',
  'general',
];

export default function CallsPage() {
  const [calls, setCalls] = useState<CallPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<Department | "">("");

  useEffect(() => {
    async function fetchCalls() {
      try {
        const response = await getActiveCalls(selectedDepartment || undefined);
        setCalls(response.calls || []);
      } catch (error) {
        console.error("Error fetching calls:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchCalls();
  }, [selectedDepartment]);

  const filteredCalls = calls.filter((call) => {
    const matchesSearch =
      searchTerm === "" ||
      call.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.reference_number.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Appels à candidatures
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Découvrez les opportunités de formation ouvertes et soumettez votre candidature
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par titre ou référence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input w-full pl-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value as Department | "")}
                className="form-input pl-10 pr-10 appearance-none"
              >
                <option value="">Tous les départements</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {DEPARTMENT_DISPLAY_NAMES[dept]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-white dark:bg-slate-800 rounded-2xl p-6">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                  <div className="h-6 w-full bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                  <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Aucun appel trouvé
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {searchTerm || selectedDepartment
                  ? "Essayez de modifier vos critères de recherche"
                  : "Aucun appel à candidatures ouvert pour le moment"}
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCalls.map((call) => (
                <div
                  key={call.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex flex-col hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300">
                        {call.department_display}
                      </span>
                      {call.is_upcoming && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                          <Calendar className="w-3 h-3" />
                          Bientôt
                        </span>
                      )}
                    </div>
                    {call.is_upcoming && call.days_until_open !== undefined ? (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                        <Clock className="w-4 h-4" />
                        Ouvre dans {call.days_until_open} j
                      </span>
                    ) : call.days_remaining !== undefined && call.days_remaining !== null && (
                      <span
                        className={`inline-flex items-center gap-1 text-sm font-medium ${
                          call.days_remaining <= 3
                            ? "text-red-600 dark:text-red-400"
                            : call.days_remaining <= 7
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        {call.days_remaining} jours
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {call.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4 flex-grow">
                    {call.description?.slice(0, 120)}
                    {call.description && call.description.length > 120 ? "..." : ""}
                  </p>

                  {/* Footer */}
                  <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        Réf: {call.reference_number}
                      </span>
                      <Link
                        href={`/calls/${call.id}`}
                        className="inline-flex items-center text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline"
                      >
                        Voir les détails
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
