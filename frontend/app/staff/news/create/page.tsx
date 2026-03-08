"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Star,
} from "lucide-react";
import { createNews } from "@/lib/news";

export default function CreateNewsPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !content.trim()) {
      setError("Le titre et le contenu sont obligatoires");
      return;
    }

    setIsSubmitting(true);
    try {
      await createNews({
        title: title.trim(),
        content: content.trim(),
        excerpt: excerpt.trim() || undefined,
        is_published: isPublished,
        is_featured: isFeatured,
      });
      router.push("/staff/news");
    } catch (err: unknown) {
      const error = err as { message?: string; detail?: string };
      setError(error.detail || error.message || "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <Link
          href="/staff/news"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux actualités
        </Link>
        <h1 className="heading-display text-2xl lg:text-3xl text-foreground">
          Nouvelle Actualité
        </h1>
        <p className="text-muted-foreground mt-1">
          Créez une actualité qui sera visible sur la page d&apos;accueil
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-3xl">
        <div className="bg-card rounded-2xl border border-border p-6 lg:p-8 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-foreground"
            >
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="form-input"
              placeholder="Titre de l'actualité"
            />
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <label
              htmlFor="excerpt"
              className="block text-sm font-medium text-foreground"
            >
              Résumé
              <span className="text-muted-foreground font-normal ml-1">
                (affiché sur les cartes)
              </span>
            </label>
            <input
              type="text"
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="form-input"
              placeholder="Court résumé de l'actualité (optionnel)"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label
              htmlFor="content"
              className="block text-sm font-medium text-foreground"
            >
              Contenu <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={10}
              className="form-input form-textarea"
              placeholder="Contenu complet de l'actualité..."
            />
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-6 pt-2">
            {/* Published Toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <button
                type="button"
                onClick={() => setIsPublished(!isPublished)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isPublished
                    ? "bg-green-500"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPublished ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                {isPublished ? (
                  <Eye className="w-4 h-4 text-green-500" />
                ) : (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                )}
                {isPublished ? "Publié" : "Brouillon"}
              </div>
            </label>

            {/* Featured Toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <button
                type="button"
                onClick={() => setIsFeatured(!isFeatured)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isFeatured
                    ? "bg-amber-500"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isFeatured ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <div className="flex items-center gap-1.5 text-sm text-foreground">
                <Star
                  className={`w-4 h-4 ${
                    isFeatured
                      ? "text-amber-500 fill-current"
                      : "text-muted-foreground"
                  }`}
                />
                À la une
              </div>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 mt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Création...
              </>
            ) : (
              "Créer l'actualité"
            )}
          </button>
          <Link
            href="/staff/news"
            className="px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  );
}
