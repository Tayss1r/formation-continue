"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, ArrowLeft, User, Clock, Share2, Newspaper } from "lucide-react";
import { Header } from "@/components/Header";
import Link from "next/link";
import { getNewsDetails, NewsItem } from "@/lib/news";
import { getImageUrl } from "@/lib/config";

export default function NewsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const newsId = params.id as string;

  useEffect(() => {
    async function fetchNews() {
      try {
        setLoading(true);
        const data = await getNewsDetails(parseInt(newsId));
        setNews(data);
      } catch (err) {
        console.error("Failed to fetch news:", err);
        setError("Actualité introuvable");
      } finally {
        setLoading(false);
      }
    }

    if (newsId) {
      fetchNews();
    }
  }, [newsId]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatReadTime = (content: string) => {
    const words = content?.split(/\s+/).length || 0;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min de lecture`;
  };

  const getSanitizedNewsContent = (content: string) => {
    return content
      .replace(/<a[^>]*>\s*Excel\s*<\/a>\s*\|\s*/gi, "")
      .replace(/Excel\s*\|\s*/gi, "")
      .replace(/\n/g, '<br />');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-primary-950/20 dark:to-background">
        <Header />
        <div className="pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse space-y-8">
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
              <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
              <div className="space-y-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !news) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-primary-950/20 dark:to-background">
        <Header />
        <div className="pt-24 pb-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 mb-6">
              <Newspaper className="w-10 h-10 text-slate-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              {error || "Actualité introuvable"}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Cette actualité n&apos;existe pas ou a été supprimée.
            </p>
            <Link
              href="/#news"
              className="btn-primary inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour aux actualités
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-primary-950/20 dark:to-background">
      <Header />
      
      {/* Hero Banner */}
      <section className="relative pt-24 pb-12 lg:pt-28 lg:pb-16 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors mb-8"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour
            </button>
          </motion.div>

          {/* Title & Meta */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {news.is_featured && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-medium rounded-full mb-4">
                ⭐ À la une
              </span>
            )}
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white leading-tight mb-6">
              {news.title}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(news.published_at)}
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {news.author}
              </div>
              {news.content && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {formatReadTime(news.content)}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="pb-8 lg:pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Featured Image / Banner - only show if image exists */}
          {news.image_path && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-10"
            >
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/30 dark:to-primary-800/20">
                <img
                  src={getImageUrl(news.image_path)}
                  alt={news.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
                {/* Fallback shown behind img — visible if img fails */}
                <div className="absolute inset-0 flex items-center justify-center -z-10">
                  <Newspaper className="w-16 h-16 text-primary-300 dark:text-primary-600" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Article Content */}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="prose prose-lg dark:prose-invert max-w-none"
          >
            {/* Excerpt as lead paragraph */}
            {news.excerpt && (
              <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed mb-8 font-medium">
                {news.excerpt}
              </p>
            )}

            {/* Main content */}
            <div 
              className="text-slate-700 dark:text-slate-300 leading-relaxed space-y-6"
              dangerouslySetInnerHTML={{ 
                __html: getSanitizedNewsContent(news.content || '')
              }}
            />
          </motion.article>

          {/* Share Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center justify-between">
              <Link
                href="/#news"
                className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400 font-medium hover:underline"
              >
                <ArrowLeft className="w-5 h-5" />
                Toutes les actualités
              </Link>
              
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: news.title,
                      url: window.location.href,
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert("Lien copié !");
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Partager
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            © {new Date().getFullYear()} Forminy - Bureau de Formation Continue
          </p>
        </div>
      </footer>
    </main>
  );
}
