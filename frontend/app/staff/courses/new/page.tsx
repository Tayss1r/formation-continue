"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CourseForm } from "@/components/staff/CourseForm";

export default function NewCoursePage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/staff"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-purple-500 dark:hover:text-purple-400 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Créer une Nouvelle Formation
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Remplissez les informations ci-dessous pour créer une nouvelle formation.
        </p>
      </div>

      {/* Form */}
      <CourseForm mode="create" />
    </div>
  );
}
