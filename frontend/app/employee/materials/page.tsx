"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  Download,
  BookOpen,
  Loader2,
  AlertCircle,
  Search,
  FolderOpen,
} from "lucide-react";
import { getEmployeeMaterials, downloadMaterial, CourseMaterial } from "@/lib/materials";

export default function EmployeeMaterialsPage() {
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchMaterials() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getEmployeeMaterials();
        setMaterials(response.materials);
      } catch (err) {
        console.error("Failed to fetch materials:", err);
        setError("Impossible de charger les documents");
      } finally {
        setIsLoading(false);
      }
    }
    fetchMaterials();
  }, []);

  const handleDownload = async (material: CourseMaterial) => {
    setDownloadingId(material.id);
    try {
      await downloadMaterial(material.id, material.file_name);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Échec du téléchargement");
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " o";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " Ko";
    return (bytes / (1024 * 1024)).toFixed(1) + " Mo";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Filter materials by search query
  const filteredMaterials = materials.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.course_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.file_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group materials by course
  const materialsByCourse = filteredMaterials.reduce((acc, material) => {
    const courseTitle = material.course_title || "Autre";
    if (!acc[courseTitle]) {
      acc[courseTitle] = [];
    }
    acc[courseTitle].push(material);
    return acc;
  }, {} as Record<string, CourseMaterial[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-900/30">
            <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h1 className="heading-display text-2xl lg:text-3xl text-foreground">
              Mes Documents
            </h1>
            <p className="text-muted-foreground">
              Accédez aux documents de vos formations
            </p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder-muted-foreground focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
          />
        </div>
      </div>

      {/* Materials List */}
      {materials.length === 0 ? (
        <div className="card-elevated p-12 text-center">
          <div className="icon-box w-16 h-16 mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-primary-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Aucun document disponible
          </h3>
          <p className="text-muted-foreground mb-4">
            Les documents seront disponibles une fois inscrit à des formations.
          </p>
          <Link href="/employee/enroll" className="btn-primary inline-flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Voir les formations disponibles
          </Link>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="card-elevated p-12 text-center">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Aucun résultat
          </h3>
          <p className="text-muted-foreground">
            Aucun document ne correspond à votre recherche.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(materialsByCourse).map(([courseTitle, courseMaterials]) => (
            <div key={courseTitle}>
              {/* Course Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
                  <BookOpen className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">{courseTitle}</h2>
                <span className="text-sm text-muted-foreground">
                  ({courseMaterials.length} document{courseMaterials.length > 1 ? "s" : ""})
                </span>
              </div>

              {/* Materials Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courseMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="card-elevated p-4 hover:border-primary-500/30 transition-all duration-300"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex-shrink-0">
                        <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate" title={material.title}>
                          {material.title}
                        </h4>
                        <p className="text-sm text-muted-foreground truncate" title={material.file_name}>
                          {material.file_name}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(material.file_size)}</span>
                          <span>•</span>
                          <span>{formatDate(material.created_at || material.uploaded_at)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(material)}
                      disabled={downloadingId === material.id}
                      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl font-medium hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors disabled:opacity-50"
                    >
                      {downloadingId === material.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Télécharger
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
