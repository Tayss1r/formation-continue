"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CourseForm } from "@/components/staff/CourseForm";

export default function CoordinatorNewCoursePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/coordinator"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary-500 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Link>
        <h1 className="heading-display text-2xl">
          Créer une Nouvelle Formation
        </h1>
        <p className="text-muted-foreground mt-1">
          Ajoutez une formation qui sera visible dans le catalogue public.
        </p>
      </div>

      <CourseForm mode="create" onSuccessRedirect="/coordinator/courses" />
    </div>
  );
}
