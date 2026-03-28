"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { CourseForm } from "@/components/staff/CourseForm";
import { getStaffCourseDetails } from "@/lib/courses";
import type { Course } from "@/types/course";

export default function CoordinatorEditCoursePage() {
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
        setError("Formation introuvable ou acces refuse.");
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
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Formation introuvable
        </h1>
        <p className="text-muted-foreground mb-8">{error}</p>
        <Link
          href="/coordinator/courses"
          className="btn-primary inline-flex items-center gap-2 px-6 py-3"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour aux formations
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/coordinator/courses"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary-500 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux formations
        </Link>
        <h1 className="heading-display text-2xl">Modifier la formation</h1>
        <p className="text-muted-foreground mt-1">
          Modifiez les informations de la formation "{course.title}".
        </p>
      </div>

      <CourseForm mode="edit" course={course} onSuccessRedirect="/coordinator/courses" />
    </div>
  );
}
