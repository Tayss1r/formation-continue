"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ArrowLeft,
  FileText,
  Download,
  AlertCircle,
  Calendar,
  Building2,
  GraduationCap,
  CheckCircle,
} from "lucide-react";
import { getCourseDetails } from "@/lib/courses";
import { getCourseMaterialsForEmployee, getMaterialDownloadUrl, type CourseMaterial } from "@/lib/materials";
import { getImageUrl } from "@/lib/config";
import { useAuth } from "@/contexts/AuthContext";
import type { Course } from "@/types/course";

export default function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const courseData = await getCourseDetails(parseInt(id));
        setCourse(courseData);

        // Fetch materials if authenticated
        if (isAuthenticated) {
          try {
            const materialsData = await getCourseMaterialsForEmployee(parseInt(id));
            setMaterials(materialsData.materials);
          } catch {
            // Materials might not be accessible
            console.log("Could not fetch materials");
          }
        }
      } catch (err) {
        console.error("Error loading course:", err);
        setError("Erreur lors du chargement du cours");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [id, isAuthenticated]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "📄";
    if (fileType.includes("video")) return "🎥";
    if (fileType.includes("image")) return "🖼️";
    if (fileType.includes("presentation") || fileType.includes("ppt"))
      return "📊";
    return "📁";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="h-8 w-32 bg-muted rounded animate-pulse mb-6" />
          <div className="h-64 bg-muted rounded-2xl animate-pulse mb-6" />
          <div className="space-y-4">
            <div className="h-10 w-2/3 bg-muted rounded animate-pulse" />
            <div className="h-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Cours introuvable
          </h1>
          <p className="text-muted-foreground mb-6">
            {error || "Ce cours n'existe pas ou a été supprimé"}
          </p>
          <Link href="/courses" className="btn-primary">
            Voir tous les cours
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        {/* Course Header */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden mb-6">
          {/* Image */}
          <div className="aspect-[3/1] bg-muted relative">
            {course.image_path ? (
              <img
                src={getImageUrl(course.image_path)}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/30 dark:to-primary-800/30">
                <BookOpen className="w-20 h-20 text-primary-400" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              {course.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-muted-foreground">
              {course.department && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {course.department}
                </span>
              )}
            </div>

            {/* Description */}
            {course.description && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {course.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Course Details Grid */}
        {course.learning_outcomes && course.learning_outcomes.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary-500" />
              Objectifs de la formation
            </h2>
            <div className="space-y-2">
              {course.learning_outcomes.map((outcome: string, index: number) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-muted-foreground"
                >
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{outcome}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Materials Section */}
        {isAuthenticated && materials.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-500" />
              Supports de cours
            </h2>
            <div className="space-y-3">
              {materials.map((material) => (
                <div
                  key={material.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                >
                  <span className="text-2xl">{getFileIcon(material.file_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {material.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(material.file_size)}
                    </p>
                  </div>
                  <a
                    href={getMaterialDownloadUrl(material.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-primary-50 dark:bg-primary-900/20 rounded-2xl p-6 border border-primary-200 dark:border-primary-800">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Intéressé par cette formation ?
          </h3>
          <p className="text-muted-foreground mb-4">
            Les inscriptions se font via les appels à candidatures. Consultez les appels actifs 
            pour voir si cette formation est disponible.
          </p>
          <Link
            href="/#active-calls"
            className="btn-primary inline-flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Voir les appels à candidatures
          </Link>
        </div>
      </div>
    </div>
  );
}
