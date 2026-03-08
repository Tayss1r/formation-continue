"use client";

import { useState, useEffect } from "react";
import { Star, MessageSquare, User, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import {
  submitFeedback,
  getMyCourseFeedback,
  deleteFeedback,
  Feedback,
} from "@/lib/feedback";

interface CourseFeedbackFormProps {
  courseId: number;
  courseTitle: string;
}

export function CourseFeedbackForm({ courseId, courseTitle }: CourseFeedbackFormProps) {
  const [existingFeedback, setExistingFeedback] = useState<Feedback | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadExistingFeedback();
  }, [courseId]);

  const loadExistingFeedback = async () => {
    setIsLoading(true);
    try {
      const feedback = await getMyCourseFeedback(courseId);
      if (feedback) {
        setExistingFeedback(feedback);
        setRating(feedback.rating);
        setComment(feedback.comment || "");
        setIsAnonymous(feedback.is_anonymous);
      }
    } catch (err) {
      console.error("Error loading feedback:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Veuillez sélectionner une note");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const feedback = await submitFeedback({
        course_id: courseId,
        rating,
        comment: comment.trim() || undefined,
        is_anonymous: isAnonymous,
      });
      setExistingFeedback(feedback);
      setSuccess(existingFeedback ? "Avis mis à jour avec succès !" : "Merci pour votre avis !");
      setShowForm(false);
    } catch (err) {
      console.error("Error submitting feedback:", err);
      setError("Impossible de soumettre votre avis. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer votre avis ?")) return;

    setIsDeleting(true);
    setError("");

    try {
      await deleteFeedback(courseId);
      setExistingFeedback(null);
      setRating(0);
      setComment("");
      setIsAnonymous(false);
      setSuccess("Avis supprimé");
    } catch (err) {
      console.error("Error deleting feedback:", err);
      setError("Impossible de supprimer votre avis");
    } finally {
      setIsDeleting(false);
    }
  };

  const renderStars = (interactive: boolean = true) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? "button" : undefined}
            disabled={!interactive}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={`transition-transform ${interactive ? "hover:scale-110 cursor-pointer" : "cursor-default"}`}
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                star <= (hoverRating || rating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-gray-300 dark:text-gray-600"
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {rating > 0 ? `${rating}/5` : ""}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-primary-600" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Votre avis
        </h2>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
        </div>
      )}

      {/* Existing feedback display */}
      {existingFeedback && !showForm ? (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {renderStars(false)}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {existingFeedback.is_anonymous ? (
                  <span className="flex items-center gap-1">
                    <EyeOff className="w-3 h-3" />
                    Anonyme
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Identifié
                  </span>
                )}
              </div>
            </div>

            {existingFeedback.comment && (
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {existingFeedback.comment}
              </p>
            )}

            <p className="text-xs text-muted-foreground mt-3">
              Soumis le {new Date(existingFeedback.created_at).toLocaleDateString("fr-FR")}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="flex-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              Modifier mon avis
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="py-2 px-4 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Feedback form */
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Note *
            </label>
            {renderStars(true)}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Commentaire (optionnel)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Partagez votre expérience avec cette formation..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {comment.length}/2000 caractères
            </p>
          </div>

          {/* Anonymous toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isAnonymous ? "bg-primary-600" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAnonymous ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <div className="flex items-center gap-2">
              {isAnonymous ? (
                <EyeOff className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Eye className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {isAnonymous ? "Envoyer anonymement" : "Afficher mon nom"}
              </span>
            </div>
          </div>

          {isAnonymous && (
            <p className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-750 p-3 rounded-lg">
              Votre identité sera complètement masquée. Seuls votre note et commentaire seront visibles.
            </p>
          )}

          {/* Submit buttons */}
          <div className="flex gap-3 pt-2">
            {existingFeedback && (
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setRating(existingFeedback.rating);
                  setComment(existingFeedback.comment || "");
                  setIsAnonymous(existingFeedback.is_anonymous);
                  setError("");
                }}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
              >
                Annuler
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || rating === 0}
              className="flex-1 py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                existingFeedback ? "Mettre à jour" : "Envoyer mon avis"
              )}
            </button>
          </div>
        </form>
      )}

      {/* Not yet submitted prompt */}
      {!existingFeedback && !showForm && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Vous n&apos;avez pas encore donné votre avis sur cette formation.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <Star className="w-4 h-4" />
            Donner un avis
          </button>
        </div>
      )}
    </div>
  );
}
