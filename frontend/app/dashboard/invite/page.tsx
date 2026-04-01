"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  UserPlus,
  Send,
  Trash2,
  CheckCircle,
  AlertCircle,
  Users,
  Mail,
  Loader2,
} from "lucide-react";
import { validateCompanyInvitation, inviteEmployees } from "@/lib/invitations";
import type { CompanyInvitePageInfo } from "@/types/invitation";

interface EmployeeInput {
  name: string;
  email: string;
}

function CompanyInviteDashboardContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [pageData, setPageData] = useState<CompanyInvitePageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [employees, setEmployees] = useState<EmployeeInput[]>([{ name: "", email: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (token) {
      loadInvitationData();
    } else {
      setError("Lien d'invitation invalide. Aucun token fourni.");
      setIsLoading(false);
    }
  }, [token]);

  async function loadInvitationData() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await validateCompanyInvitation(token);
      setPageData(data);
    } catch (err: any) {
      setError(err.message || "Invitation invalide ou expirée");
    } finally {
      setIsLoading(false);
    }
  }

  const invitedCount = pageData?.invited_employees.length || 0;
  const proposedCount = pageData?.proposed_employee_count || 0;
  const remainingSlots = Math.max(0, proposedCount - invitedCount);
  const canAddMore = remainingSlots > 0;
  const maxInviteRows = Math.max(1, remainingSlots);
  const reachedFormRowLimit = employees.length >= maxInviteRows;

  function addEmployee() {
    if (!canAddMore) {
      setError(`Limite atteinte: ${proposedCount} employés maximum.`);
      return;
    }

    if (reachedFormRowLimit) {
      setError(`Vous ne pouvez ajouter que ${remainingSlots} employé(s) supplémentaire(s).`);
      return;
    }

    setEmployees([...employees, { name: "", email: "" }]);
  }

  function removeEmployee(index: number) {
    if (employees.length <= 1) return;
    setEmployees(employees.filter((_, i) => i !== index));
  }

  function updateEmployee(index: number, field: "name" | "email", value: string) {
    const updated = [...employees];
    updated[index] = { ...updated[index], [field]: value };
    setEmployees(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validEmployees = employees.filter((emp) => emp.name.trim() && emp.email.trim());
    if (validEmployees.length === 0) {
      setError("Veuillez ajouter au moins un employé avec nom et email.");
      return;
    }

    if (validEmployees.length > remainingSlots) {
      setError(`Vous ne pouvez inviter que ${remainingSlots} employé(s) supplémentaire(s).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await inviteEmployees(token, validEmployees);
      setSuccess(result.message);
      setEmployees([{ name: "", email: "" }]);
      await loadInvitationData();
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi des invitations");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
          <p className="text-muted-foreground">Vérification de l&apos;invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !pageData) {
    return (
      <div className="card-elevated p-8 text-center max-w-2xl mx-auto">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-foreground mb-2">Invitation invalide</h1>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!pageData) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-display text-2xl text-foreground">Inviter vos employés</h1>
        <p className="text-muted-foreground">{pageData.company_name} – {pageData.call_title}</p>
      </div>

      <div className="card-elevated p-5 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <div className="flex gap-3">
          <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-blue-900 dark:text-blue-200">Candidature approuvée</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Réf: <strong>{pageData.call_reference}</strong>
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              <Users className="w-4 h-4 inline mr-1" />
              Proposé: <strong>{proposedCount}</strong> • Déjà invités: <strong>{invitedCount}</strong> • Restants: <strong>{remainingSlots}</strong>
            </p>
          </div>
        </div>
      </div>

      {pageData.invited_employees.length > 0 && (
        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            Employés déjà invités ({pageData.invited_employees.length})
          </h2>
          <div className="space-y-3">
            {pageData.invited_employees.map((emp) => (
              <div key={emp.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{emp.name}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {emp.email}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${emp.is_used ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"}`}>
                  {emp.is_used ? "✓ Inscrit" : "⏳ En attente"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-elevated p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-primary-500" />
          Inviter de nouveaux employés
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400">
            {success}
          </div>
        )}

        {!canAddMore && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
            Limite atteinte: vous avez déjà invité le nombre maximum d&apos;employés ({proposedCount}).
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {employees.map((emp, index) => (
            <div key={index} className="flex items-start gap-3 bg-muted/40 rounded-xl p-4">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Nom complet</label>
                  <input
                    type="text"
                    value={emp.name}
                    onChange={(e) => updateEmployee(index, "name", e.target.value)}
                    placeholder="Ahmed Ben Ali"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={!canAddMore}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
                  <input
                    type="email"
                    value={emp.email}
                    onChange={(e) => updateEmployee(index, "email", e.target.value)}
                    placeholder="ahmed@example.com"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={!canAddMore}
                  />
                </div>
              </div>
              {employees.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEmployee(index)}
                  className="mt-6 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={addEmployee}
              disabled={!canAddMore || reachedFormRowLimit}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary-400 hover:text-primary-600 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              Ajouter un employé
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !canAddMore}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 text-white font-medium text-sm hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isSubmitting ? "Envoi en cours..." : "Envoyer les invitations"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CompanyInviteDashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CompanyInviteDashboardContent />
    </Suspense>
  );
}
