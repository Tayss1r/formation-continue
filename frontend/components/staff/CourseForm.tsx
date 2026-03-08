"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  X,
  Clock,
  Users,
  FileText,
  Tag,
  Loader2,
  AlertTriangle,
  Building2,
  GraduationCap,
  Plus,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { createCourse, updateCourse, getCourseEditability, getDepartments, getProfessors } from "@/lib/courses";
import { getImageUrl } from "@/lib/config";
import type { 
  Course, 
  CourseCreateData, 
  CourseType, 
  CourseEditability,
  Department,
  ProfessorListItem 
} from "@/types/course";
import { DEPARTMENT_DISPLAY_NAMES } from "@/types/course";

interface CourseFormProps {
  course?: Course;
  mode: "create" | "edit";
}

export function CourseForm({ course, mode }: CourseFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<CourseCreateData>({
    title: course?.title || "",
    description: course?.description || "",
    short_description: course?.short_description || "",
    type: (course?.type as CourseType) || "public",
    price: course?.price || 0,
    max_seats: course?.max_seats || 20,
    duration_hours: course?.duration_hours || undefined,
    sector: course?.sector || "",
    department: course?.department as Department || undefined,
    professor_id: course?.professor?.id || undefined,
    learning_outcomes: course?.learning_outcomes || [],
    is_published: course?.is_published ?? true,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    course?.image_path ? getImageUrl(course.image_path) : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editability, setEditability] = useState<CourseEditability | null>(null);
  const [editabilityLoading, setEditabilityLoading] = useState(false);
  
  // New states for departments and professors
  const [professors, setProfessors] = useState<ProfessorListItem[]>([]);
  const [professorsLoading, setProfessorsLoading] = useState(false);
  const [newOutcome, setNewOutcome] = useState("");

  // Fetch professors when department changes
  useEffect(() => {
    async function fetchProfessors() {
      setProfessorsLoading(true);
      try {
        const response = await getProfessors(formData.department);
        setProfessors(response.professors);
      } catch (err) {
        console.error("Failed to fetch professors:", err);
        setProfessors([]);
      } finally {
        setProfessorsLoading(false);
      }
    }
    fetchProfessors();
  }, [formData.department]);

  // Fetch editability status when editing a course
  useEffect(() => {
    async function fetchEditability() {
      if (mode === "edit" && course) {
        try {
          setEditabilityLoading(true);
          const data = await getCourseEditability(course.id);
          setEditability(data);
        } catch (err) {
          console.error("Failed to fetch editability:", err);
        } finally {
          setEditabilityLoading(false);
        }
      }
    }
    fetchEditability();
  }, [mode, course]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value ? Number(value) : undefined) : value,
    }));
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Department | "";
    setFormData((prev) => ({
      ...prev,
      department: value || undefined,
      professor_id: undefined, // Reset professor when department changes
    }));
    if (errors.department) {
      setErrors((prev) => ({ ...prev, department: "" }));
    }
  };

  const handleProfessorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      professor_id: value ? Number(value) : undefined,
    }));
    if (errors.professor_id) {
      setErrors((prev) => ({ ...prev, professor_id: "" }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrors((prev) => ({ ...prev, image: "Veuillez sélectionner une image" }));
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, image: "L'image doit faire moins de 5MB" }));
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setErrors((prev) => ({ ...prev, image: "" }));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Learning outcomes handlers
  const addLearningOutcome = () => {
    if (newOutcome.trim()) {
      setFormData((prev) => ({
        ...prev,
        learning_outcomes: [...(prev.learning_outcomes || []), newOutcome.trim()],
      }));
      setNewOutcome("");
    }
  };

  const removeLearningOutcome = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      learning_outcomes: prev.learning_outcomes?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleOutcomeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addLearningOutcome();
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Le titre est requis";
    } else if (formData.title.length < 3) {
      newErrors.title = "Le titre doit contenir au moins 3 caractères";
    }

    if (!formData.description.trim()) {
      newErrors.description = "La description est requise";
    } else if (formData.description.length < 10) {
      newErrors.description = "La description doit contenir au moins 10 caractères";
    }

    if (!formData.department) {
      newErrors.department = "Le département est requis";
    }

    if (!formData.max_seats || formData.max_seats < 1) {
      newErrors.max_seats = "Au moins 1 place est requise";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "create") {
        await createCourse(formData, imageFile || undefined);
      } else if (course) {
        await updateCourse(course.id, formData, imageFile || undefined);
      }

      router.push("/staff/courses");
      router.refresh();
    } catch (err) {
      console.error("Failed to save course:", err);
      setErrors((prev) => ({
        ...prev,
        submit: "Une erreur est survenue. Veuillez réessayer.",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* General Error */}
      {errors.submit && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
          {errors.submit}
        </div>
      )}

      {/* Image Upload */}
      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Image de la Formation
        </h2>
        
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Preview */}
          <div className="relative w-full sm:w-48 h-32 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600">
            {imagePreview ? (
              <>
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <Upload className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Upload Button */}
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Choisir une image
            </label>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              PNG, JPG ou WebP. Max 5MB.
            </p>
            {errors.image && (
              <p className="text-sm text-red-500 mt-1">{errors.image}</p>
            )}
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Informations Générales
        </h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-muted-foreground mb-2"
            >
              Titre *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`form-input pl-10 ${
                  errors.title
                    ? "border-red-500 focus:ring-red-500/50"
                    : ""
                }`}
                placeholder="Ex: Formation en Gestion de Projet"
              />
            </div>
            {errors.title && (
              <p className="text-sm text-red-500 mt-1">{errors.title}</p>
            )}
          </div>

          {/* Short Description */}
          <div>
            <label
              htmlFor="short_description"
              className="block text-sm font-medium text-muted-foreground mb-2"
            >
              Description Courte
            </label>
            <input
              type="text"
              id="short_description"
              name="short_description"
              value={formData.short_description || ""}
              onChange={handleInputChange}
              maxLength={300}
              className="form-input"
              placeholder="Brève description pour la carte (max 300 caractères)"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-muted-foreground mb-2"
            >
              Description Complète *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={6}
              className={`form-input resize-none ${
                errors.description
                  ? "border-red-500 focus:ring-red-500/50"
                  : ""
              }`}
              placeholder="Description détaillée de la formation..."
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description}</p>
            )}
          </div>

          {/* Type */}
          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-muted-foreground mb-2"
            >
              Type de Formation
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="form-input pl-10 appearance-none"
              >
                <option value="public">Formation Publique</option>
                <option value="private">Formation Privée (Entreprise)</option>
              </select>
            </div>
          </div>

          {/* Department - Required */}
          <div>
            <label
              htmlFor="department"
              className="block text-sm font-medium text-muted-foreground mb-2"
            >
              Département *
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <select
                id="department"
                name="department"
                value={formData.department || ""}
                onChange={handleDepartmentChange}
                className={`form-input pl-10 appearance-none ${
                  errors.department ? "border-red-500 focus:ring-red-500/50" : ""
                }`}
              >
                <option value="">Sélectionner un département</option>
                {Object.entries(DEPARTMENT_DISPLAY_NAMES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {errors.department && (
              <p className="text-sm text-red-500 mt-1">{errors.department}</p>
            )}
          </div>

          {/* Professor Selection - Enhanced with relevance ranking */}
          <div>
            <label
              htmlFor="professor_id"
              className="block text-sm font-medium text-muted-foreground mb-2"
            >
              Professeur
            </label>
            <div className="relative">
              <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none z-10" />
              <select
                id="professor_id"
                name="professor_id"
                value={formData.professor_id || ""}
                onChange={handleProfessorChange}
                disabled={professorsLoading || !formData.department}
                className={`form-input pl-10 appearance-none ${
                  !formData.department ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <option value="">
                  {!formData.department 
                    ? "Sélectionnez d'abord un département" 
                    : professorsLoading 
                      ? "Chargement..." 
                      : "Sélectionner un professeur (optionnel)"}
                </option>
                {professors.length > 0 && professors.some(p => p.is_recommended) && (
                  <optgroup label="⭐ Recommandés pour ce département">
                    {professors.filter(p => p.is_recommended).map((prof) => (
                      <option key={prof.id} value={prof.id}>
                        {prof.fullname} - {prof.specialization} ({prof.courses_taught} formations)
                      </option>
                    ))}
                  </optgroup>
                )}
                {professors.length > 0 && professors.some(p => !p.is_recommended) && (
                  <optgroup label="Autres professeurs">
                    {professors.filter(p => !p.is_recommended).map((prof) => (
                      <option key={prof.id} value={prof.id}>
                        {prof.fullname} - {prof.specialization} {prof.department_display ? `(${prof.department_display})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            {!formData.department ? (
              <p className="text-sm text-muted-foreground mt-1">
                Sélectionnez un département pour voir les professeurs disponibles
              </p>
            ) : professors.length > 0 && professors.some(p => p.is_recommended) ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                ⭐ Professeurs recommandés basés sur leur expertise et expérience dans ce domaine
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Learning Outcomes */}
      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Ce que vous apprendrez
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Ajoutez les compétences et connaissances que les participants acquerront
        </p>

        {/* Existing outcomes */}
        {formData.learning_outcomes && formData.learning_outcomes.length > 0 && (
          <ul className="space-y-2 mb-4">
            {formData.learning_outcomes.map((outcome, index) => (
              <li 
                key={index}
                className="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800"
              >
                <CheckCircle2 className="w-5 h-5 text-primary-500 shrink-0" />
                <span className="flex-1 text-foreground">{outcome}</span>
                <button
                  type="button"
                  onClick={() => removeLearningOutcome(index)}
                  className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add new outcome */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newOutcome}
            onChange={(e) => setNewOutcome(e.target.value)}
            onKeyDown={handleOutcomeKeyDown}
            placeholder="Ex: Maîtriser les bases de la gestion de projet"
            className="form-input flex-1"
          />
          <button
            type="button"
            onClick={addLearningOutcome}
            disabled={!newOutcome.trim()}
            className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Capacity */}
      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Capacité
        </h2>

        {/* Show warning if editing is restricted */}
        {mode === "edit" && editability && editability.has_bookings && (
          <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Modification restreinte
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  {editability.reason || "Impossible de modifier les places après des réservations."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-md">
          {/* Max Seats */}
          <div>
            <label
              htmlFor="max_seats"
              className="block text-sm font-medium text-muted-foreground mb-2"
            >
              Places Disponibles *
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <input
                type="number"
                id="max_seats"
                name="max_seats"
                value={formData.max_seats}
                onChange={handleInputChange}
                min="1"
                disabled={mode === "edit" && editability?.has_bookings}
                className={`form-input pl-10 ${
                  errors.max_seats
                    ? "border-red-500 focus:ring-red-500/50"
                    : ""
                } ${
                  mode === "edit" && editability?.has_bookings
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                placeholder="20"
              />
            </div>
            {errors.max_seats && (
              <p className="text-sm text-red-500 mt-1">{errors.max_seats}</p>
            )}
          </div>
        </div>
      </div>

      {/* Duration */}
      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Durée de la Formation
        </h2>

        <div className="max-w-md">
          <label
            htmlFor="duration_hours"
            className="block text-sm font-medium text-muted-foreground mb-2"
          >
            Durée totale (heures)
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="number"
              id="duration_hours"
              name="duration_hours"
              value={formData.duration_hours || ""}
              onChange={handleInputChange}
              min="1"
              className="form-input pl-10"
              placeholder="24"
            />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Les dates et horaires seront définis lors de la création des sessions de disponibilité.
          </p>
        </div>
      </div>

      {/* Publishing */}
      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Publication
        </h2>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="is_published"
            checked={formData.is_published}
            onChange={handleCheckboxChange}
            className="w-5 h-5 rounded border-border text-primary-500 focus:ring-primary-500"
          />
          <span className="text-muted-foreground">
            Publier cette formation (visible sur le site)
          </span>
        </label>
      </div>

      {/* Submit Buttons */}
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary px-6 py-3"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary px-6 py-3"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enregistrement...
            </>
          ) : mode === "create" ? (
            "Créer la Formation"
          ) : (
            "Enregistrer les Modifications"
          )}
        </button>
      </div>
    </form>
  );
}
