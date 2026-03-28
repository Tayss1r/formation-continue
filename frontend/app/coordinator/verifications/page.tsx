"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Building2,
  GraduationCap,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Loader2,
  Mail,
  Calendar,
  Download,
  ExternalLink,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { getImageUrl } from "@/lib/config";

interface PendingUser {
  id: number;
  email: string;
  fullname: string;
  role: "company" | "professor";
  created_at: string;
  verification_document_url?: string;
  company_name?: string;
  industry_sector?: string;
  specialization?: string;
  username?: string;
}

interface PendingUsersResponse {
  users: PendingUser[];
  total: number;
}

type FilterTab = "all" | "company" | "professor";
type ActionType = "approve" | "reject";

export default function CoordinatorVerificationsPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  useEffect(() => {
    void fetchPendingUsers();
  }, []);

  async function fetchPendingUsers() {
    setIsLoading(true);
    setError("");
    try {
      const response = await apiClient.get<PendingUsersResponse>("/admin/pending-verifications");
      setPendingUsers(response.users || []);
    } catch (err) {
      console.error("Failed to fetch pending users:", err);
      setError("Impossible de charger les demandes d'inscription");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAction(userId: number, action: ActionType) {
    setActionLoading(userId);
    setError("");

    try {
      if (action === "reject") {
        const reasonInput = window.prompt("Raison du refus (optionnel):", "");
        const reason = reasonInput?.trim();
        const endpoint = reason
          ? `/admin/verification/${userId}/reject?reason=${encodeURIComponent(reason)}`
          : `/admin/verification/${userId}/reject`;
        await apiClient.post(endpoint);
      } else {
        await apiClient.post(`/admin/verification/${userId}/approve`);
      }

      setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      setSelectedUser(null);
      setShowDocumentModal(false);
    } catch (err) {
      console.error(`Failed to ${action} user:`, err);
      setError(`Erreur lors de ${action === "approve" ? "l'approbation" : "le rejet"}`);
    } finally {
      setActionLoading(null);
    }
  }

  const filteredUsers = pendingUsers.filter((user) => {
    if (activeTab === "all") return true;
    return user.role === activeTab;
  });

  const stats = {
    total: pendingUsers.length,
    companies: pendingUsers.filter((u) => u.role === "company").length,
    professors: pendingUsers.filter((u) => u.role === "professor").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-primary-600" />
            Validation des inscriptions
          </h1>
          <p className="text-muted-foreground mt-1">
            Verifiez les profils entreprise/professeur, consultez les documents puis acceptez ou refusez.
          </p>
        </div>
        <button
          onClick={() => void fetchPendingUsers()}
          disabled={isLoading}
          className="btn-secondary flex items-center gap-2 px-4 py-2"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Actualiser"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">En attente</p>
            </div>
          </div>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.companies}</p>
              <p className="text-sm text-muted-foreground">Entreprises</p>
            </div>
          </div>
        </div>
        <div className="card-elevated p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.professors}</p>
              <p className="text-sm text-muted-foreground">Professeurs</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-2 border-b border-border">
        {[
          { value: "all", label: "Tous", count: stats.total },
          { value: "company", label: "Entreprises", count: stats.companies },
          { value: "professor", label: "Professeurs", count: stats.professors },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value as FilterTab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.value
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.value
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Aucune demande en attente</h3>
          <p className="text-muted-foreground mt-1">Toutes les demandes ont ete traitees</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <div key={user.id} className="card-elevated p-5 hover:shadow-lg transition-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      user.role === "company"
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : "bg-primary-100 dark:bg-primary-900/30"
                    }`}
                  >
                    {user.role === "company" ? (
                      <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <GraduationCap className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">
                        {user.role === "company" ? user.company_name : user.fullname}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          user.role === "company"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                        }`}
                      >
                        {user.role === "company" ? "Entreprise" : "Professeur"}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{user.email}</span>
                      </div>
                      {user.role === "company" && user.industry_sector && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span>Secteur: {user.industry_sector}</span>
                        </div>
                      )}
                      {user.role === "professor" && user.specialization && (
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          <span>Specialisation: {user.specialization}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Inscrit le {new Date(user.created_at).toLocaleDateString("fr-FR")}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {user.verification_document_url && (
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDocumentModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Voir document
                    </button>
                  )}

                  <button
                    onClick={() => void handleAction(user.id, "reject")}
                    disabled={actionLoading === user.id}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {actionLoading === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Refuser
                  </button>

                  <button
                    onClick={() => void handleAction(user.id, "approve")}
                    disabled={actionLoading === user.id}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {actionLoading === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Accepter
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDocumentModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Document de verification</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    {selectedUser.role === "company" ? selectedUser.company_name : selectedUser.fullname}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDocumentModal(false);
                    setSelectedUser(null);
                  }}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {selectedUser.verification_document_url ? (
                <div className="space-y-4">
                  <div className="bg-muted rounded-xl p-4 flex items-center justify-center min-h-[300px]">
                    {selectedUser.verification_document_url.endsWith(".pdf") ? (
                      <div className="text-center">
                        <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Document PDF</p>
                      </div>
                    ) : (
                      <img
                        src={getImageUrl(selectedUser.verification_document_url)}
                        alt="Document de verification"
                        className="max-w-full max-h-[400px] object-contain rounded-lg"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    <a
                      href={getImageUrl(selectedUser.verification_document_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Ouvrir dans un nouvel onglet
                    </a>
                    <a
                      href={getImageUrl(selectedUser.verification_document_url)}
                      download
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Telecharger
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                  <p className="text-muted-foreground">Aucun document telecharge</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => void handleAction(selectedUser.id, "reject")}
                disabled={actionLoading === selectedUser.id}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === selectedUser.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Refuser
              </button>
              <button
                onClick={() => void handleAction(selectedUser.id, "approve")}
                disabled={actionLoading === selectedUser.id}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === selectedUser.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Accepter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
