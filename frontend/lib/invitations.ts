/**
 * Invitation Workflow API Library
 */

import { apiClient, API_BASE_URL, getAccessToken, setAccessToken } from "./api";
import type {
  CompanyInvitePageInfo,
  EmployeeInvitationInfo,
  EmployeeRegisterRequest,
  ApplicationEmployeesData,
  CallResultsData,
} from "@/types/invitation";

// =============================================================================
// PUBLIC ENDPOINTS (no auth needed, token-based)
// =============================================================================

/**
 * Validate a company invitation token (public)
 */
export async function validateCompanyInvitation(
  token: string
): Promise<CompanyInvitePageInfo> {
  const response = await fetch(
    `${API_BASE_URL}/invitations/company/validate?token=${encodeURIComponent(token)}`
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Invitation invalide");
  }
  return response.json();
}

/**
 * Invite employees (company uses token, public endpoint)
 */
export async function inviteEmployees(
  token: string,
  employees: { name: string; email: string }[]
): Promise<{ message: string; invited_count: number }> {
  const response = await fetch(
    `${API_BASE_URL}/invitations/company/invite-employees?token=${encodeURIComponent(token)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employees }),
    }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Impossible d'envoyer les invitations");
  }
  return response.json();
}

/**
 * Validate an employee invitation token (public)
 */
export async function validateEmployeeInvitation(
  token: string
): Promise<EmployeeInvitationInfo> {
  const response = await fetch(
    `${API_BASE_URL}/invitations/employee/validate?token=${encodeURIComponent(token)}`
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Invitation invalide");
  }
  return response.json();
}

/**
 * Register an employee via invitation (public)
 */
export async function registerEmployeeViaInvitation(
  data: EmployeeRegisterRequest
): Promise<{ message: string }> {
  const response = await fetch(
    `${API_BASE_URL}/invitations/employee/register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || "Inscription impossible");
  }
  return response.json();
}

// =============================================================================
// COORDINATOR ENDPOINTS (authenticated)
// =============================================================================

/**
 * Get employees for an approved application (coordinator)
 */
export async function getApplicationEmployees(
  applicationId: number
): Promise<ApplicationEmployeesData> {
  return apiClient.get<ApplicationEmployeesData>(
    `/invitations/coordinator/application/${applicationId}/employees`,
    true
  );
}

/**
 * Approve an employee submission (coordinator)
 */
export async function approveEmployeeSubmission(
  submissionId: number,
  notes?: string
): Promise<{ message: string; status: string }> {
  return apiClient.post(
    `/invitations/coordinator/submission/${submissionId}/approve${notes ? `?notes=${encodeURIComponent(notes)}` : ""}`,
    {},
    true
  );
}

/**
 * Reject an employee submission (coordinator)
 */
export async function rejectEmployeeSubmission(
  submissionId: number,
  notes?: string
): Promise<{ message: string; status: string }> {
  return apiClient.post(
    `/invitations/coordinator/submission/${submissionId}/reject${notes ? `?notes=${encodeURIComponent(notes)}` : ""}`,
    {},
    true
  );
}

/**
 * Get results data for a call (coordinator)
 */
export async function getCallResultsData(
  callId: number
): Promise<CallResultsData> {
  return apiClient.get<CallResultsData>(
    `/invitations/coordinator/call/${callId}/results-data`,
    true
  );
}

/**
 * Generate and download results file (coordinator)
 */
export async function downloadResultsFile(
  callId: number,
  format: "pdf" = "pdf"
): Promise<void> {
  const endpoint = `${API_BASE_URL}/invitations/coordinator/call/${callId}/generate-results?format=${format}`;
  const token = getAccessToken();

  let response = await fetch(endpoint, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  if (response.status === 401) {
    const refresh = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (refresh.ok) {
      const refreshData = await refresh.json();
      const newToken = refreshData?.access_token as string | undefined;
      if (newToken) {
        setAccessToken(newToken);
      }
      response = await fetch(endpoint, {
        headers: newToken ? { Authorization: `Bearer ${newToken}` } : {},
        credentials: "include",
      });
    }
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.detail || err?.message || "Impossible de générer le fichier");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "resultats.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Publish results as news (coordinator)
 */
export async function publishResultsAsNews(
  callId: number
): Promise<{ message: string; news_id: number }> {
  return apiClient.post(
    `/invitations/coordinator/call/${callId}/publish-results`,
    {},
    true
  );
}
