"use client";

import { Clock, Users, Calendar } from "lucide-react";
import { getImageUrl } from "@/lib/config";
import type { CourseListItem } from "@/types/course";
import Link from "next/link";

interface CourseCardProps {
  course: CourseListItem;
}

/**
 * Format price in Tunisian Dinar (DT)
 */
function formatPriceDT(price: number): string {
  return `${new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)} DT`;
}

export function CourseCard({ course }: CourseCardProps) {
  const imageUrl = getImageUrl(course.image_path);
  
  // Format price in Tunisian Dinar (DT)
  const formattedPrice = formatPriceDT(course.price);

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
      <div className="group relative bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 hover:border-purple-500/50">
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
                  ? "bg-green-500/90 text-white"
                  : "bg-orange-500/90 text-white"
              }`}
            >
              {course.type === "public" ? "Public" : "Private"}
            </span>
          </div>
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        {/* Course Content */}
        <div className="p-5">
          {/* Title */}
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-purple-500 transition-colors">
            {course.title}
          </h3>

          {/* Short Description */}
          {course.short_description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
              {course.short_description}
            </p>
          )}

          {/* Meta Info */}
          <div className="flex flex-wrap gap-3 mb-4 text-xs text-slate-500 dark:text-slate-400">
            {course.duration_hours && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{course.duration_hours}h</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{course.max_seats} places</span>
            </div>
            {formattedStartDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{formattedStartDate}</span>
              </div>
            )}
          </div>

          {/* Price and CTA */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700/50">
            <div>
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {formattedPrice}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-purple-500 group-hover:text-purple-400 transition-colors">
              View Details
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
