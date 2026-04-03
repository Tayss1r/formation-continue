/**
 * Company Applications API Library
 */

import { apiClient } from "./api";
import type {
  Application,
  ApplicationWithCall,
  ApplicationCreate,
  ApplicationUpdate,
  ApplicationApprove,
  ApplicationReject,
  ApplicationRequestInfo,
  DocumentReview,
  ApplicationListResponse,
  ApplicationActionResponse,
  DocumentActionResponse,
  CompanyAttendanceSummaryResponse,
} from "@/types/application";
import type { ApplicationStatus } from "@/types/call";

/**
 * Create a new application for a call (Company only)
 */
export async function createApplication(
  data: ApplicationCreate
): Promise<ApplicationActionResponse> {
  return apiClient.post<ApplicationActionResponse>("/applications", data, true);
}

/**
 * Get all applications for the current company
 */
export async function getMyApplications(
  status?: ApplicationStatus
): Promise<ApplicationListResponse> {
  const params = new URLSearchParams();
  if (status) {
    params.append("status", status);
  }
  const queryString = params.toString();
  const url = queryString
    ? `/applications/my-applications?${queryString}`
    : "/applications/my-applications";
  return apiClient.get<ApplicationListResponse>(url, true);
}

/**
 * Get attendance summary for admitted employees of current company.
 */
export async function getMyAttendanceSummary(): Promise<CompanyAttendanceSummaryResponse> {
  return apiClient.get<CompanyAttendanceSummaryResponse>(
    "/applications/attendance-summary",
    true
  );
}

/**
 * Get details of a specific application (Company only)
 */
export async function getMyApplication(
  applicationId: number
): Promise<ApplicationWithCall> {
  return apiClient.get<ApplicationWithCall>(
    `/applications/my-applications/${applicationId}`,
    true
  );
}

/**
 * Delete an application for the current company (only if not approved)
 */
export async function deleteMyApplication(
  applicationId: number
): Promise<void> {
  return apiClient.delete<void>(
    `/applications/my-applications/${applicationId}`,
    true
  );
}

/**
 * Update an existing application for the current company (if not approved/rejected)
 */
export async function updateMyApplication(
  applicationId: number,
  data: ApplicationUpdate
): Promise<ApplicationActionResponse> {
  return apiClient.put<ApplicationActionResponse>(
    `/applications/my-applications/${applicationId}`,
    data,
    true
  );
}

/**
 * Upload a document for an application (Company only)
 */
export async function uploadApplicationDocument(
  applicationId: number,
  documentType: string,
  file: File
): Promise<DocumentActionResponse> {
  const formData = new FormData();
  formData.append("document_type", documentType);
  formData.append("file", file);

  return apiClient.post<DocumentActionResponse>(
    `/applications/${applicationId}/documents`,
    formData,
    true
  );
}

/**
 * Delete a document from an application (Company only)
 */
export async function deleteApplicationDocument(
  applicationId: number,
  documentId: number
): Promise<void> {
  return apiClient.delete<void>(
    `/applications/${applicationId}/documents/${documentId}`,
    true
  );
}

/**
 * Submit application for review (Company only)
 */
export async function submitApplication(
  applicationId: number
): Promise<ApplicationActionResponse> {
  return apiClient.post<ApplicationActionResponse>(
    `/applications/${applicationId}/submit`,
    {},
    true
  );
}

// =============================================================================
// COORDINATOR ENDPOINTS
// =============================================================================

/**
 * Get all applications for a call (Coordinator only)
 */
export async function getCallApplications(
  callId: number,
  status?: ApplicationStatus
): Promise<ApplicationListResponse> {
  const params = new URLSearchParams();
  if (status) {
    params.append("status", status);
  }
  const queryString = params.toString();
  const url = queryString
    ? `/applications/call/${callId}?${queryString}`
    : `/applications/call/${callId}`;
  return apiClient.get<ApplicationListResponse>(url, true);
}

/**
 * Get detailed application info for review (Coordinator only)
 */
export async function getApplicationDetails(
  applicationId: number
): Promise<ApplicationWithCall> {
  return apiClient.get<ApplicationWithCall>(
    `/applications/${applicationId}`,
    true
  );
}

/**
 * Review a document (Coordinator only)
 */
export async function reviewApplicationDocument(
  applicationId: number,
  documentId: number,
  data: DocumentReview
): Promise<DocumentActionResponse> {
  return apiClient.post<DocumentActionResponse>(
    `/applications/${applicationId}/documents/${documentId}/review`,
    data,
    true
  );
}

/**
 * Approve an application (Coordinator only)
 */
export async function approveApplication(
  applicationId: number,
  data: ApplicationApprove
): Promise<ApplicationActionResponse> {
  return apiClient.post<ApplicationActionResponse>(
    `/applications/${applicationId}/approve`,
    data,
    true
  );
}

/**
 * Reject an application (Coordinator only)
 */
export async function rejectApplication(
  applicationId: number,
  data: ApplicationReject
): Promise<ApplicationActionResponse> {
  return apiClient.post<ApplicationActionResponse>(
    `/applications/${applicationId}/reject`,
    data,
    true
  );
}

/**
 * Request additional information (Coordinator only)
 */
export async function requestAdditionalInfo(
  applicationId: number,
  data: ApplicationRequestInfo
): Promise<ApplicationActionResponse> {
  return apiClient.post<ApplicationActionResponse>(
    `/applications/${applicationId}/request-info`,
    data,
    true
  );
}
