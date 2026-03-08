"use client";

import { useState, useEffect } from "react";
import { Star, MessageSquare, User, EyeOff, Loader2, BarChart3 } from "lucide-react";
import { FeedbackListResponse, Feedback } from "@/lib/feedback";

interface FeedbackListProps {
  feedbackData: FeedbackListResponse | null;
  isLoading: boolean;
  courseTitle?: string;
}

export function FeedbackList({ feedbackData, isLoading, courseTitle }: FeedbackListProps) {
  if (isLoading) {
    return (
      <div className="card-elevated p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  if (!feedbackData) {
    return (
      <div className="card-elevated p-6">
        <p className="text-muted-foreground text-center py-8">
          Impossible de charger les avis
        </p>
      </div>
    );
  }

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-gray-300 dark:text-gray-600"
          }`}
        />
      ))}
    </div>
  );

  const renderRatingBar = (count: number, total: number, starNum: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="w-6 text-muted-foreground">{starNum}</span>
        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="w-8 text-right text-muted-foreground">{count}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="card-elevated p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-foreground">
            Résumé des avis
            {courseTitle && <span className="text-muted-foreground font-normal"> - {courseTitle}</span>}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Average Rating */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground">
                {feedbackData.average_rating.toFixed(1)}
              </div>
              <div className="flex items-center justify-center mt-1">
                {renderStars(Math.round(feedbackData.average_rating))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {feedbackData.total} avis
              </p>
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => (
              renderRatingBar(
                feedbackData.rating_distribution[star] || 0,
                feedbackData.total,
                star
              )
            ))}
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="card-elevated p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-foreground">
            Avis des participants
          </h3>
        </div>

        {feedbackData.feedback.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Aucun avis pour le moment
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Les participants pourront donner leur avis après avoir suivi la formation
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbackData.feedback.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-muted rounded-lg border border-border"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-2">
                      {item.is_anonymous ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <EyeOff className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium">Anonyme</span>
                        </div>
                      ) : item.employee ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary-600" />
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {item.employee.fullname}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="text-sm font-medium">Utilisateur</span>
                        </div>
                      )}
                    </div>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-2">
                      {renderStars(item.rating)}
                      <span className="text-sm text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    {/* Comment */}
                    {item.comment && (
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {item.comment}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
