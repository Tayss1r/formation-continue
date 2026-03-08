"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Users,
  FileText,
  Upload,
  Download,
  Trash2,
  Loader2,
  Calendar,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Star,
  MessageSquare,
} from "lucide-react";
import {
  getProfessorCourseDetails,
  getCourseMaterials,
  uploadCourseMaterial,
  deleteCourseMaterial,
  getEnrolledEmployees,
} from "@/lib/professor";
import { downloadMaterial } from "@/lib/materials";
import { getProfessorCourseFeedback, FeedbackListResponse } from "@/lib/feedback";
import { getImageUrl } from "@/lib/config";
import { useAuth } from "@/contexts/AuthContext";
import type { ProfessorCourse, CourseMaterial, EnrolledEmployee } from "@/types/professor";
import { FeedbackList } from "@/components/FeedbackList";

type Tab = "materials" | "employees" | "feedback";

export default function ProfessorCourseDetailPage() {
  const params = useParams();
  const courseId = Number(params.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isLoading: isAuthLoading } = useAuth();

  const [course, setCourse] = useState<ProfessorCourse | null>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [employees, setEmployees] = useState<EnrolledEmployee[]>([]);
  const [feedbackData, setFeedbackData] = useState<FeedbackListResponse | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("materials");
  const [isLoading, setIsLoading] = useState(true);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newMaterialTitle, setNewMaterialTitle] = useState("");
  const [newMaterialDescription, setNewMaterialDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    
    async function fetchData() {
      try {
        setIsLoading(true);
        const [courseData, materialsData, employeesData] = await Promise.all([
          getProfessorCourseDetails(courseId),
          getCourseMaterials(courseId),
          getEnrolledEmployees(courseId),
        ]);
        setCourse(courseData);
        setMaterials(materialsData.materials);
        setEmployees(employeesData.employees);
      } catch (err) {
        console.error("Failed to fetch course data:", err);
        setError("Impossible de charger les données de la formation");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [courseId, isAuthLoading]);

  // Load feedback when tab is activated
  useEffect(() => {
    if (isAuthLoading) return;
    
    async function loadFeedback() {
      if (activeTab === "feedback" && !feedbackData) {
        setIsFeedbackLoading(true);
        try {
          const data = await getProfessorCourseFeedback(courseId);
          setFeedbackData(data);
        } catch (err) {
          console.error("Failed to load feedback:", err);
        } finally {
          setIsFeedbackLoading(false);
        }
      }
    }
    loadFeedback();
  }, [activeTab, courseId, feedbackData, isAuthLoading]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadModalOpen(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !newMaterialTitle.trim()) return;

    setIsUploading(true);
    try {
      const newMaterial = await uploadCourseMaterial(
        courseId,
        newMaterialTitle.trim(),
        selectedFile,
        newMaterialDescription.trim() || undefined
      );
      setMaterials([newMaterial, ...materials]);
      setUploadModalOpen(false);
      setNewMaterialTitle("");
      setNewMaterialDescription("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Failed to upload material:", err);
      alert("Échec du téléchargement du document");
    } finally {
      setIsUploading(false);
    }
  };

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

  const handleDelete = async (materialId: number) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;

    try {
      await deleteCourseMaterial(materialId);
      setMaterials(materials.filter((m) => m.id !== materialId));
    } catch (err) {
      console.error("Failed to delete material:", err);
      alert("Échec de la suppression du document");
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getDocumentStatusBadge = (status?: string) => {
    switch (status) {
      case "verified":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            Vérifié
          </span>
        );
      case "pending_review":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            <Clock className="w-3 h-3" />
            En attente
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            <AlertCircle className="w-3 h-3" />
            Rejeté
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
        {error || "Formation non trouvée"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/professor/courses"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux formations
      </Link>

      {/* Course Header */}
      <div className="card-elevated p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Course Image */}
          <div className="w-full md:w-48 h-32 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
            {course.image_path ? (
              <img
                src={getImageUrl(course.image_path)}
                alt={course.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-slate-400" />
              </div>
            )}
          </div>

          {/* Course Info */}
          <div className="flex-1">
            <h1 className="heading-display text-xl text-foreground mb-2">
              {course.title}
            </h1>
            <p className="text-muted-foreground mb-4">
              {course.department_display || "Département non spécifié"}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{course.enrolled_count} inscrits</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span>{course.materials_count} documents</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{course.upcoming_sessions} sessions à venir</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("materials")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "materials"
              ? "border-primary-600 text-primary-600 dark:text-primary-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Documents ({materials.length})
        </button>
        <button
          onClick={() => setActiveTab("employees")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "employees"
              ? "border-primary-600 text-primary-600 dark:text-primary-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Participants ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab("feedback")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "feedback"
              ? "border-primary-600 text-primary-600 dark:text-primary-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="w-4 h-4 inline mr-2" />
          Avis {feedbackData ? `(${feedbackData.total})` : ""}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "materials" && (
        <div className="space-y-4">
          {/* Upload Button */}
          <div className="flex justify-end">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Ajouter un document
            </button>
          </div>

          {/* Materials List */}
          {materials.length === 0 ? (
            <div className="card-elevated p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Aucun document
              </h3>
              <p className="text-muted-foreground">
                Ajoutez des documents pour vos participants.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {materials.map((material) => (
                <div
                  key={material.id}
                  className="card-elevated p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30">
                      <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">
                        {material.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {material.file_name} • {formatFileSize(material.file_size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(material)}
                      disabled={downloadingId === material.id}
                      className="p-2 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {downloadingId === material.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Download className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(material.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "employees" && (
        <div className="space-y-4">
          {employees.length === 0 ? (
            <div className="card-elevated p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Aucun participant
              </h3>
              <p className="text-muted-foreground">
                Aucun employé n'est encore inscrit à cette formation.
              </p>
            </div>
          ) : (
            <div className="card-elevated overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Participant
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Entreprise
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Date d'inscription
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Document
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {employees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {employee.fullname}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {employee.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="w-4 h-4" />
                          <span>{employee.company_name || "Non spécifié"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(employee.enrolled_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        {getDocumentStatusBadge(employee.document_status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "feedback" && (
        <FeedbackList
          feedbackData={feedbackData}
          isLoading={isFeedbackLoading}
          courseTitle={course.title}
        />
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                Nouveau document
              </h3>
              <button
                onClick={() => {
                  setUploadModalOpen(false);
                  setSelectedFile(null);
                  setNewMaterialTitle("");
                  setNewMaterialDescription("");
                }}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Fichier sélectionné: <span className="font-medium text-foreground">{selectedFile?.name}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={newMaterialTitle}
                  onChange={(e) => setNewMaterialTitle(e.target.value)}
                  className="form-input"
                  placeholder="Ex: Chapitre 1 - Introduction"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Description (optionnelle)
                </label>
                <textarea
                  value={newMaterialDescription}
                  onChange={(e) => setNewMaterialDescription(e.target.value)}
                  className="form-input resize-none"
                  rows={3}
                  placeholder="Brève description du contenu..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setUploadModalOpen(false);
                    setSelectedFile(null);
                    setNewMaterialTitle("");
                    setNewMaterialDescription("");
                  }}
                  className="btn-secondary px-4 py-2"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!newMaterialTitle.trim() || isUploading}
                  className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Envoi...
                    </>
                  ) : (
                    "Télécharger"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
