"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Send,
  Eye,
  FileText,
  Calendar,
  Building2,
  AlertCircle,
  CheckCircle,
  Info,
} from "lucide-react";
import { createCall, publishCall } from "@/lib/calls";
import { ConfirmDialog } from "@/components/coordinator/CoordinatorUI";
import type { CallCreate, RequiredDocumentSpec, Department } from "@/types/call";
import { DEPARTMENT_DISPLAY_NAMES } from "@/types/call";

const departments: Department[] = [
  'informatique',
  'mathematiques',
  'physique',
  'biologie',
  'chimie',
  'lettres',
  'economie',
  'droit',
  'medecine',
  'general',
];

const defaultDocumentTypes = [
  'company_registration',
  'tax_certificate',
  'financial_statement',
  'authorization_letter',
  'motivation_letter',
  'other',
];

const employeeDocumentTypes = [
  'cv',
  'diploma',
  'id_card',
  'photo',
  'motivation_letter',
  'recommendation_letter',
  'other',
];

export default function CreateCallPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<CallCreate>>({
    title: '',
    reference_number: '',
    department: 'general',
    description: '',
    eligibility_criteria: '',
    application_start_date: '',
    application_deadline: '',
    results_publication_date: '',
    required_documents: [],
    employee_required_documents: [],
  });

  // Document lists
  const [companyDocuments, setCompanyDocuments] = useState<RequiredDocumentSpec[]>([]);
  const [employeeDocuments, setEmployeeDocuments] = useState<RequiredDocumentSpec[]>([]);

  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'draft' | 'publish';
  } | null>(null);

  // Generate reference number
  function generateReference() {
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    setFormData(prev => ({ ...prev, reference_number: `CALL-${year}-${random}` }));
  }

  // Handle form changes — clear dependent dates when a parent date changes
  function handleChange(field: keyof CallCreate, value: string) {
    setFormData(prev => {
      const updated: Partial<CallCreate> = { ...prev, [field]: value };
      if (field === 'application_start_date') {
        if (prev.application_deadline && prev.application_deadline <= value) {
          updated.application_deadline = '';
          updated.results_publication_date = '';
        }
      }
      if (field === 'application_deadline') {
        if (prev.results_publication_date && prev.results_publication_date <= value) {
          updated.results_publication_date = '';
        }
      }
      return updated;
    });
    setError(null);
  }

  // Add company document
  function addCompanyDocument() {
    setCompanyDocuments(prev => [
      ...prev,
      {
        type: '',
        label: '',
        description: '',
        required: true,
        max_size_mb: 10,
        allowed_extensions: ['pdf', 'doc', 'docx'],
      },
    ]);
  }

  // Update company document
  function updateCompanyDocument(index: number, field: keyof RequiredDocumentSpec, value: unknown) {
    setCompanyDocuments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  // Remove company document
  function removeCompanyDocument(index: number) {
    setCompanyDocuments(prev => prev.filter((_, i) => i !== index));
  }

  // Add employee document
  function addEmployeeDocument() {
    setEmployeeDocuments(prev => [
      ...prev,
      {
        type: '',
        label: '',
        description: '',
        required: true,
        max_size_mb: 5,
        allowed_extensions: ['pdf', 'jpg', 'jpeg', 'png'],
      },
    ]);
  }

  // Update employee document
  function updateEmployeeDocument(index: number, field: keyof RequiredDocumentSpec, value: unknown) {
    setEmployeeDocuments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  // Remove employee document
  function removeEmployeeDocument(index: number) {
    setEmployeeDocuments(prev => prev.filter((_, i) => i !== index));
  }

  // Computed min dates for calendar restriction
  const todayStr = new Date().toISOString().split('T')[0];
  const deadlineMin = formData.application_start_date
    ? (() => { const d = new Date(formData.application_start_date); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()
    : todayStr;
  const resultsMin = formData.application_deadline
    ? (() => { const d = new Date(formData.application_deadline); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()
    : deadlineMin;

  // Validation
  function validate(): string | null {
    if (!formData.title?.trim()) return "Le titre est requis";
    if (!formData.reference_number?.trim()) return "La référence est requise";
    if (!formData.department) return "Le département est requis";
    if (!formData.application_start_date) return "La date de début est requise";
    if (!formData.application_deadline) return "La date limite est requise";
    if (!formData.results_publication_date) return "La date de publication des résultats est requise";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(formData.application_start_date);
    const deadline = new Date(formData.application_deadline);

    if (startDate <= today) {
      return "La date de début doit être dans le futur (après aujourd'hui)";
    }
    
    if (deadline <= startDate) {
      return "La date limite doit être après la date de début";
    }
    
    if (formData.results_publication_date) {
      const resultsDate = new Date(formData.results_publication_date);
      if (resultsDate <= deadline) {
        return "La date de publication des résultats doit être après la date limite";
      }
    }

    // Validate documents
    for (const doc of companyDocuments) {
      if (!doc.type.trim() || !doc.label.trim()) {
        return "Tous les documents entreprise doivent avoir un type et un label";
      }
    }

    for (const doc of employeeDocuments) {
      if (!doc.type.trim() || !doc.label.trim()) {
        return "Tous les documents employé doivent avoir un type et un label";
      }
    }

    return null;
  }

  // Submit form
  async function handleSubmit(publish: boolean = false) {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data: CallCreate = {
        title: formData.title!,
        reference_number: formData.reference_number!,
        department: formData.department as Department,
        description: formData.description || undefined,
        eligibility_criteria: formData.eligibility_criteria || undefined,
        application_start_date: formData.application_start_date!,
        application_deadline: formData.application_deadline!,
        results_publication_date: formData.results_publication_date || undefined,
        required_documents: companyDocuments.length > 0 ? companyDocuments : undefined,
        employee_required_documents: employeeDocuments.length > 0 ? employeeDocuments : undefined,
      };

      const response = await createCall(data);
      
      if (publish) {
        await publishCall(response.call.id);
      }

      router.push(`/coordinator/calls/${response.call.id}`);
    } catch (err: unknown) {
      console.error("Error creating call:", err);
      let errorMessage = 'Erreur lors de la création';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err && typeof err === 'object' && 'message' in err) {
        // Handle ApiError objects from the backend
        errorMessage = String((err as { message: string }).message);
      } else if (err && typeof err === 'object' && 'detail' in err) {
        // Handle FastAPI validation errors (422)
        const detail = (err as { detail: unknown }).detail;
        if (Array.isArray(detail) && detail.length > 0) {
          errorMessage = detail.map((d: { msg?: string }) => d.msg || '').filter(Boolean).join(', ');
        } else if (typeof detail === 'string') {
          errorMessage = detail;
        }
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
      setConfirmDialog(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/coordinator/calls"
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="heading-display text-2xl text-foreground">
            Nouvel Appel à Candidatures
          </h1>
          <p className="text-muted-foreground">
            Créez un nouvel appel pour recevoir des candidatures d'entreprises
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Form */}
      <div className="card-elevated p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            Informations générales
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Titre de l'appel *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Ex: Appel à candidatures - Formation en management"
                className="form-input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Référence *
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.reference_number}
                  onChange={(e) => handleChange('reference_number', e.target.value)}
                  placeholder="CALL-2026-XXXXXX"
                  className="form-input flex-1"
                />
                <button
                  type="button"
                  onClick={generateReference}
                  className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium text-foreground transition-colors"
                >
                  Générer
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Département *
              </label>
              <select
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                className="form-input appearance-none w-full"
              >
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {DEPARTMENT_DISPLAY_NAMES[dept]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Décrivez l'objet de cet appel à candidatures..."
            rows={4}
            className="form-input form-textarea w-full"
          />
        </div>

        {/* Eligibility */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Critères d'éligibilité
          </label>
          <textarea
            value={formData.eligibility_criteria}
            onChange={(e) => handleChange('eligibility_criteria', e.target.value)}
            placeholder="Définissez les critères que les entreprises doivent respecter..."
            rows={3}
            className="form-input form-textarea w-full"
          />
        </div>

        {/* Dates */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-500" />
            Dates importantes
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Date de début *
              </label>
              <input
                type="date"
                value={formData.application_start_date}
                min={todayStr}
                onChange={(e) => handleChange('application_start_date', e.target.value)}
                className="form-input w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">Doit être après aujourd'hui</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Date limite *
              </label>
              <input
                type="date"
                value={formData.application_deadline}
                min={deadlineMin}
                onChange={(e) => handleChange('application_deadline', e.target.value)}
                className="form-input w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">Doit être après la date de début</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Publication résultats *
              </label>
              <input
                type="date"
                value={formData.results_publication_date}
                min={resultsMin}
                onChange={(e) => handleChange('results_publication_date', e.target.value)}
                className="form-input w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">Doit être après la date limite</p>
            </div>
          </div>
        </div>

        {/* Company Documents */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary-500" />
              Documents requis (Entreprise)
            </h2>
            <button
              type="button"
              onClick={addCompanyDocument}
              className="inline-flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>

          {companyDocuments.length === 0 ? (
            <div className="text-center py-6 bg-muted/50 rounded-xl border-2 border-dashed border-border">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucun document requis</p>
              <button
                type="button"
                onClick={addCompanyDocument}
                className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Ajouter un document
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {companyDocuments.map((doc, index) => (
                <div key={index} className="p-4 bg-muted/50 rounded-xl border border-border">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Type
                        </label>
                        <select
                          value={doc.type}
                          onChange={(e) => updateCompanyDocument(index, 'type', e.target.value)}
                          className="form-input text-sm w-full appearance-none"
                        >
                          <option value="">Sélectionner...</option>
                          {defaultDocumentTypes.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Label
                        </label>
                        <input
                          type="text"
                          value={doc.label}
                          onChange={(e) => updateCompanyDocument(index, 'label', e.target.value)}
                          placeholder="Ex: Registre de commerce"
                          className="form-input text-sm w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={doc.description || ''}
                          onChange={(e) => updateCompanyDocument(index, 'description', e.target.value)}
                          placeholder="Description optionnelle"
                          className="form-input text-sm w-full"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={doc.required}
                          onChange={(e) => updateCompanyDocument(index, 'required', e.target.checked)}
                          className="w-4 h-4 rounded border-border text-primary-600"
                        />
                        Requis
                      </label>
                      <button
                        type="button"
                        onClick={() => removeCompanyDocument(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Employee Documents */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Documents requis (Employés)
            </h2>
            <button
              type="button"
              onClick={addEmployeeDocument}
              className="inline-flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:underline"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Ces documents seront demandés aux employés des entreprises approuvées.
              </p>
            </div>
          </div>

          {employeeDocuments.length === 0 ? (
            <div className="text-center py-6 bg-muted/50 rounded-xl border-2 border-dashed border-border">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucun document requis</p>
              <button
                type="button"
                onClick={addEmployeeDocument}
                className="mt-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Ajouter un document
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {employeeDocuments.map((doc, index) => (
                <div key={index} className="p-4 bg-muted/50 rounded-xl border border-border">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Type
                        </label>
                        <select
                          value={doc.type}
                          onChange={(e) => updateEmployeeDocument(index, 'type', e.target.value)}
                          className="form-input text-sm w-full appearance-none"
                        >
                          <option value="">Sélectionner...</option>
                          {employeeDocumentTypes.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Label
                        </label>
                        <input
                          type="text"
                          value={doc.label}
                          onChange={(e) => updateEmployeeDocument(index, 'label', e.target.value)}
                          placeholder="Ex: CV"
                          className="form-input text-sm w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={doc.description || ''}
                          onChange={(e) => updateEmployeeDocument(index, 'description', e.target.value)}
                          placeholder="Description optionnelle"
                          className="form-input text-sm w-full"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={doc.required}
                          onChange={(e) => updateEmployeeDocument(index, 'required', e.target.checked)}
                          className="w-4 h-4 rounded border-border text-primary-600"
                        />
                        Requis
                      </label>
                      <button
                        type="button"
                        onClick={() => removeEmployeeDocument(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Link
          href="/coordinator/calls"
          className="px-6 py-3 rounded-xl text-center font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Annuler
        </Link>
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="px-6 py-3 rounded-xl font-medium text-foreground bg-muted hover:bg-muted/80 transition-colors inline-flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Aperçu
        </button>
        <button
          type="button"
          onClick={() => setConfirmDialog({ isOpen: true, type: 'draft' })}
          disabled={isSubmitting}
          className="px-6 py-3 rounded-xl font-medium text-foreground border border-border bg-card hover:bg-muted transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          Enregistrer brouillon
        </button>
        <button
          type="button"
          onClick={() => setConfirmDialog({ isOpen: true, type: 'publish' })}
          disabled={isSubmitting}
          className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          Publier
        </button>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPreview(false)}
          />
          <div className="relative bg-card rounded-2xl shadow-elevated border border-border max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Aperçu de l'appel</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <span className="sr-only">Fermer</span>
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs font-medium text-primary-600 dark:text-primary-400 uppercase tracking-wide">
                  {formData.reference_number || 'Référence'}
                </span>
                <h2 className="text-2xl font-bold text-foreground mt-1">
                  {formData.title || 'Titre de l\'appel'}
                </h2>
                <p className="text-muted-foreground mt-1">
                  {DEPARTMENT_DISPLAY_NAMES[formData.department as Department] || 'Département'}
                </p>
              </div>
              
              {formData.description && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Description</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{formData.description}</p>
                </div>
              )}

              {formData.eligibility_criteria && (
                <div>
                  <h4 className="font-medium text-foreground mb-2">Critères d'éligibilité</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{formData.eligibility_criteria}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Date de début</p>
                  <p className="font-medium text-foreground">
                    {formData.application_start_date
                      ? new Date(formData.application_start_date).toLocaleDateString('fr-FR')
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date limite</p>
                  <p className="font-medium text-foreground">
                    {formData.application_deadline
                      ? new Date(formData.application_deadline).toLocaleDateString('fr-FR')
                      : '-'
                    }
                  </p>
                </div>
              </div>

              {companyDocuments.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <h4 className="font-medium text-foreground mb-2">Documents entreprise requis</h4>
                  <ul className="space-y-1">
                    {companyDocuments.map((doc, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {doc.label || doc.type}
                        {doc.required && <span className="text-red-500">*</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.type === 'publish' ? "Publier l'appel" : "Enregistrer comme brouillon"}
          message={
            confirmDialog.type === 'publish'
              ? "L'appel sera immédiatement visible et les entreprises pourront soumettre leurs candidatures."
              : "L'appel sera enregistré mais ne sera pas visible. Vous pourrez le modifier et le publier plus tard."
          }
          variant="primary"
          confirmLabel={confirmDialog.type === 'publish' ? 'Publier' : 'Enregistrer'}
          onConfirm={() => handleSubmit(confirmDialog.type === 'publish')}
          onCancel={() => setConfirmDialog(null)}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
}
