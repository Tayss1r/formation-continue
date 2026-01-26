"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  X,
  Clock,
  Users,
  DollarSign,
  FileText,
  Tag,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { createCourse, updateCourse, getCourseEditability } from "@/lib/courses";
import { getImageUrl } from "@/lib/config";
import type { Course, CourseCreateData, CourseType, CourseEditability } from "@/types/course";

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
        setErrors((prev) => ({ ...prev, image: "Please select an image file" }));
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, image: "Image must be less than 5MB" }));
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

    if (formData.price < 0) {
      newErrors.price = "Le prix ne peut pas être négatif";
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
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
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
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Informations Générales
        </h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Titre *
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={`w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border ${
                  errors.title
                    ? "border-red-500"
                    : "border-slate-200 dark:border-slate-700"
                } text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors`}
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
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
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
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="Brève description pour la carte (max 300 caractères)"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Description Complète *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={6}
              className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border ${
                errors.description
                  ? "border-red-500"
                  : "border-slate-200 dark:border-slate-700"
              } text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors resize-none`}
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
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Type de Formation
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors appearance-none"
              >
                <option value="public">Formation Publique</option>
                <option value="private">Formation Privée (Entreprise)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing & Capacity */}
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Prix et Capacité
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
                  {editability.reason || "Impossible de modifier le prix et les places après des réservations."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Price */}
          <div>
            <label
              htmlFor="price"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Prix (DT) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                min="0"
                step="100"
                disabled={mode === "edit" && editability?.has_bookings}
                className={`w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border ${
                  errors.price
                    ? "border-red-500"
                    : "border-slate-200 dark:border-slate-700"
                } text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors ${
                  mode === "edit" && editability?.has_bookings
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                placeholder="25000"
              />
            </div>
            {errors.price && (
              <p className="text-sm text-red-500 mt-1">{errors.price}</p>
            )}
          </div>

          {/* Max Seats */}
          <div>
            <label
              htmlFor="max_seats"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
            >
              Places Disponibles *
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="number"
                id="max_seats"
                name="max_seats"
                value={formData.max_seats}
                onChange={handleInputChange}
                min="1"
                disabled={mode === "edit" && editability?.has_bookings}
                className={`w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border ${
                  errors.max_seats
                    ? "border-red-500"
                    : "border-slate-200 dark:border-slate-700"
                } text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors ${
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
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Durée de la Formation
        </h2>

        <div className="max-w-md">
          <label
            htmlFor="duration_hours"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
          >
            Durée totale (heures)
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="number"
              id="duration_hours"
              name="duration_hours"
              value={formData.duration_hours || ""}
              onChange={handleInputChange}
              min="1"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="24"
            />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Les dates et horaires seront définis lors de la création des sessions de disponibilité.
          </p>
        </div>
      </div>

      {/* Publishing */}
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Publication
        </h2>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="is_published"
            checked={formData.is_published}
            onChange={handleCheckboxChange}
            className="w-5 h-5 rounded border-slate-300 text-purple-500 focus:ring-purple-500"
          />
          <span className="text-slate-700 dark:text-slate-300">
            Publier cette formation (visible sur le site)
          </span>
        </label>
      </div>

      {/* Submit Buttons */}
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-white font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
