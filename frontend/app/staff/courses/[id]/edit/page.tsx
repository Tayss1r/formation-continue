"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { CourseForm } from "@/components/staff/CourseForm";
import { getStaffCourseDetails } from "@/lib/courses";
import type { Course } from "@/types/course";

export default function EditCoursePage() {
  const params = useParams();
  const courseId = Number(params.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourse() {
      try {
        setIsLoading(true);
        const data = await getStaffCourseDetails(courseId);
        setCourse(data);
      } catch (err) {
        console.error("Failed to fetch course:", err);
        setError("Formation introuvable ou accès refusé.");
      } finally {
        setIsLoading(false);
      }
    }

    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Formation Introuvable
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-8">{error}</p>
        <Link
          href="/staff/courses"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour à mes formations
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/staff/courses"
          className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-purple-500 dark:hover:text-purple-400 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à mes formations
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Modifier la Formation
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          Modifiez les informations de la formation &quot;{course.title}&quot;
        </p>
      </div>

      {/* Form */}
      <CourseForm mode="edit" course={course} />
    </div>
  );
}
