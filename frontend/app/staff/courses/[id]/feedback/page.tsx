"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getStaffCourseFeedback, FeedbackListResponse } from "@/lib/feedback";
import { FeedbackList } from "@/components/FeedbackList";
import { getCourseDetails } from "@/lib/courses";
import type { Course } from "@/types/course";

export default function StaffCourseFeedbackPage() {
  const params = useParams();
  const courseId = Number(params.id);
  const { isLoading: isAuthLoading } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading) {
      loadData();
    }
  }, [courseId, isAuthLoading]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [courseData, feedback] = await Promise.all([
        getCourseDetails(courseId),
        getStaffCourseFeedback(courseId),
      ]);
      setCourse(courseData);
      setFeedbackData(feedback);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Impossible de charger les données");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/staff/courses"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux formations
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30">
          <MessageSquare className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h1 className="heading-display text-2xl text-foreground">
            Avis sur la formation
          </h1>
          {course && (
            <p className="text-muted-foreground mt-1">{course.title}</p>
          )}
        </div>
      </div>

      {/* Feedback Content */}
      <FeedbackList
        feedbackData={feedbackData}
        isLoading={false}
        courseTitle={course?.title}
      />
    </div>
  );
}
