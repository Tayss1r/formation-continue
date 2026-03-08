"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Newspaper,
  Eye,
  EyeOff,
  Star,
  Trash2,
  Edit,
  Loader2,
  Calendar,
} from "lucide-react";
import { getStaffNews, updateNews, deleteNews, NewsItem } from "@/lib/news";

export default function StaffNewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  async function fetchNews() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getStaffNews(page, 10);
      setNews(data.news);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to fetch news:", err);
      setError("Impossible de charger les actualités");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchNews();
  }, [page]);

  const handleTogglePublish = async (item: NewsItem) => {
    try {
      await updateNews(item.id, { is_published: !item.is_published });
      fetchNews();
    } catch (err) {
      console.error("Failed to update:", err);
    }
  };

  const handleToggleFeatured = async (item: NewsItem) => {
    try {
      await updateNews(item.id, { is_featured: !item.is_featured });
      fetchNews();
    } catch (err) {
      console.error("Failed to update:", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette actualité ?")) return;
    try {
      await deleteNews(id);
      fetchNews();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-display text-2xl lg:text-3xl text-foreground">
            Gestion des Actualités
          </h1>
          <p className="text-muted-foreground mt-1">
            {total} actualité{total !== 1 ? "s" : ""} au total
          </p>
        </div>
        <Link
          href="/staff/news/create"
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Actualité
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border">
          <Newspaper className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Aucune actualité
          </h3>
          <p className="text-muted-foreground mb-6">
            Commencez par créer votre première actualité
          </p>
          <Link
            href="/staff/news/create"
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Créer une actualité
          </Link>
        </div>
      ) : (
        <>
          {/* News Table */}
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                      Titre
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                      Statut
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                      À la une
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                      Date
                    </th>
                    <th className="text-right px-6 py-4 text-sm font-semibold text-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {news.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      {/* Title */}
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="font-medium text-foreground truncate">
                            {item.title}
                          </p>
                          {item.excerpt && (
                            <p className="text-sm text-muted-foreground truncate mt-0.5">
                              {item.excerpt}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Published Status */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleTogglePublish(item)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                            item.is_published
                              ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-500/30"
                          }`}
                        >
                          {item.is_published ? (
                            <>
                              <Eye className="w-3 h-3" /> Publié
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" /> Brouillon
                            </>
                          )}
                        </button>
                      </td>

                      {/* Featured */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleFeatured(item)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            item.is_featured
                              ? "text-amber-500 bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200"
                              : "text-muted-foreground bg-muted hover:bg-muted/80"
                          }`}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              item.is_featured ? "fill-current" : ""
                            }`}
                          />
                        </button>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(item.created_at)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/staff/news/${item.id}/edit`}
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm rounded-lg bg-card border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              >
                Précédent
              </button>
              <span className="px-4 py-2 text-sm text-muted-foreground">
                Page {page} sur {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm rounded-lg bg-card border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors"
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
