"use client";

import { Calendar } from "lucide-react";
import { getImageUrl } from "@/lib/config";
import type { CourseListItem } from "@/types/course";
import Link from "next/link";

interface CourseCardProps {
  course: CourseListItem;
}

export function CourseCard({ course }: CourseCardProps) {
  const imageUrl = getImageUrl(course.image_path);

  // Format date if available
  const formattedStartDate = course.start_date
    ? new Date(course.start_date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <Link href={`/courses/${course.id}`}>
      <div className="group relative card-elevated overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary-500/10 hover:-translate-y-1 hover:border-primary-500/50">
        {/* Course Image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={imageUrl}
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder-course.jpg";
            }}
          />
          {/* Course Type Badge */}
          <div className="absolute top-3 right-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                course.type === "public"
                  ? "bg-emerald-500/90 text-white"
                  : "bg-orange-500/90 text-white"
              }`}
            >
              {course.type === "public" ? "Public" : "Privé"}
            </span>
          </div>
          {/* Department Badge */}
          {course.department_display && (
            <div className="absolute top-3 left-3">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-500/90 text-white">
                {course.department_display}
              </span>
            </div>
          )}
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        {/* Course Content */}
        <div className="p-5">
          {/* Title */}
          <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary-500 transition-colors">
            {course.title}
          </h3>

          {/* Short Description */}
          {course.short_description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {course.short_description}
            </p>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap gap-3 mb-4 text-xs text-muted-foreground">
            {formattedStartDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formattedStartDate}</span>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="flex items-center justify-end pt-4 border-t border-border">
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary-500 group-hover:text-primary-400 transition-colors">
              Voir les détails
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
