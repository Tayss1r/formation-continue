"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  FileText,
  Calendar,
  Building2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { getCallDetails, updateCall } from "@/lib/calls";
import type { Call, CallUpdate, RequiredDocumentSpec, Department } from "@/types/call";
import { DEPARTMENT_DISPLAY_NAMES } from "@/types/call";

const departments: Department[] = [
  'informatique',
  'mecanique',
  'electrique',
  'civil',
  'gestion',
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

export default function EditCallPage() {
  const params = useParams();
  const router = useRouter();
  const callId = Number(params.id);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [originalCall, setOriginalCall] = useState<Call | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<CallUpdate>>({
    title: '',
    description: '',
    eligibility_criteria: '',
    application_start_date: '',
    application_deadline: '',
    results_publication_date: '',
  });

  // Document lists
  const [companyDocuments, setCompanyDocuments] = useState<RequiredDocumentSpec[]>([]);
  const [employeeDocuments, setEmployeeDocuments] = useState<RequiredDocumentSpec[]>([]);

  useEffect(() => {
    async function fetchCall() {
      try {
        const call = await getCallDetails(callId);
        setOriginalCall(call);
        
        // Populate form
        setFormData({
          title: call.title,
          description: call.description || '',
          eligibility_criteria: call.eligibility_criteria || '',
          application_start_date: call.application_start_date?.split('T')[0] || '',
          application_deadline: call.application_deadline?.split('T')[0] || '',
          results_publication_date: call.results_publication_date?.split('T')[0] || '',
        });
        
        setCompanyDocuments(call.required_documents || []);
        setEmployeeDocuments(call.employee_required_documents || []);
      } catch (err) {
        console.error("Error fetching call:", err);
        setLoadError("Erreur lors du chargement de l'appel");
      } finally {
        setIsLoading(false);
      }
    }
    
    if (callId) {
      fetchCall();
    }
  }, [callId]);

  // Handle form changes
  function handleChange(field: keyof CallUpdate, value: string) {
    setFormData(prev => {
      const updated: Partial<CallUpdate> = { ...prev, [field]: value };
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
  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data: CallUpdate = {
        title: formData.title || undefined,
        description: formData.description || undefined,
        eligibility_criteria: formData.eligibility_criteria || undefined,
        application_start_date: formData.application_start_date || undefined,
        application_deadline: formData.application_deadline || undefined,
        results_publication_date: formData.results_publication_date || undefined,
        required_documents: companyDocuments.length > 0 ? companyDocuments : undefined,
        employee_required_documents: employeeDocuments.length > 0 ? employeeDocuments : undefined,
      };

      await updateCall(callId, data);
      router.push(`/coordinator/calls/${callId}`);
    } catch (err: unknown) {
      console.error("Error updating call:", err);
      let errorMessage = 'Erreur lors de la mise à jour';
      if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String((err as { message: string }).message);
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded w-64 animate-pulse" />
            <div className="h-4 bg-muted rounded w-48 animate-pulse" />
          </div>
        </div>
        <div className="card-elevated p-6 space-y-6">
          <div className="h-10 bg-muted rounded w-full animate-pulse" />
          <div className="h-32 bg-muted rounded w-full animate-pulse" />
        </div>
      </div>
    );
  }

  if (loadError || !originalCall) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/coordinator/calls"
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <h1 className="heading-display text-2xl text-foreground">Modifier l'appel</h1>
        </div>
        
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">{loadError || "Appel non trouvé"}</h2>
          <Link href="/coordinator/calls" className="btn-primary inline-flex items-center gap-2 mt-4">
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  if (originalCall.status !== 'draft') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/coordinator/calls/${callId}`}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <h1 className="heading-display text-2xl text-foreground">Modifier l'appel</h1>
        </div>
        
        <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Modification non autorisée</h2>
          <p className="text-muted-foreground mb-4">
            Seuls les appels en brouillon peuvent être modifiés.
          </p>
          <Link href={`/coordinator/calls/${callId}`} className="btn-primary inline-flex items-center gap-2">
            Retour à l'appel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/coordinator/calls/${callId}`}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="heading-display text-2xl text-foreground">
            Modifier l'appel
          </h1>
          <p className="text-muted-foreground">
            {originalCall.reference_number}
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
          
          <div className="space-y-4">
            <div>
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
                Département
              </label>
              <input
                type="text"
                value={DEPARTMENT_DISPLAY_NAMES[originalCall.department] || originalCall.department}
                disabled
                className="form-input w-full opacity-50 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">Le département ne peut pas être modifié</p>
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
                Date de début
              </label>
              <input
                type="date"
                value={formData.application_start_date}
                min={todayStr}
                onChange={(e) => handleChange('application_start_date', e.target.value)}
                className="form-input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Date limite
              </label>
              <input
                type="date"
                value={formData.application_deadline}
                min={deadlineMin}
                onChange={(e) => handleChange('application_deadline', e.target.value)}
                className="form-input w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Publication résultats
              </label>
              <input
                type="date"
                value={formData.results_publication_date}
                min={resultsMin}
                onChange={(e) => handleChange('results_publication_date', e.target.value)}
                className="form-input w-full"
              />
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
                          placeholder="Nom affiché"
                          className="form-input text-sm w-full"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={doc.required}
                            onChange={(e) => updateCompanyDocument(index, 'required', e.target.checked)}
                            className="rounded border-border"
                          />
                          <span className="text-sm text-muted-foreground">Obligatoire</span>
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCompanyDocument(index)}
                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
              <FileText className="w-5 h-5 text-primary-500" />
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

          {employeeDocuments.length === 0 ? (
            <div className="text-center py-6 bg-muted/50 rounded-xl border-2 border-dashed border-border">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucun document requis pour les employés</p>
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
                          placeholder="Nom affiché"
                          className="form-input text-sm w-full"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={doc.required}
                            onChange={(e) => updateEmployeeDocument(index, 'required', e.target.checked)}
                            className="rounded border-border"
                          />
                          <span className="text-sm text-muted-foreground">Obligatoire</span>
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEmployeeDocument(index)}
                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <Link
          href={`/coordinator/calls/${callId}`}
          className="px-6 py-3 rounded-xl text-center font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Annuler
        </Link>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Enregistrer les modifications
            </>
          )}
        </button>
      </div>
    </div>
  );
}
