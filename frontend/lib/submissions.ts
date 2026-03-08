/**
 * Employee Submissions API Library
 */

import { apiClient } from "./api";
import type {
  Submission,
  SubmissionCreate,
  SubmissionApprove,
  SubmissionReject,
  SubmissionDocumentReview,
  SubmissionListResponse,
  AvailableSubmissionsResponse,
  SubmissionActionResponse,
  SubmissionDocumentActionResponse,
} from "@/types/submission";
import type { EmployeeSubmissionStatus } from "@/types/call";

// =============================================================================
// EMPLOYEE ENDPOINTS
// =============================================================================

/**
 * Get available submissions (approved applications from employee's company)
 */
export async function getAvailableSubmissions(): Promise<AvailableSubmissionsResponse> {
  return apiClient.get<AvailableSubmissionsResponse>(
    "/submissions/available",
    true
  );
}

/**
 * Create a submission for an approved application (Employee only)
 */
export async function createSubmission(
  data: SubmissionCreate
): Promise<SubmissionActionResponse> {
  return apiClient.post<SubmissionActionResponse>("/submissions", data, true);
}

/**
 * Get all submissions for the current employee
 */
export async function getMySubmissions(
  status?: EmployeeSubmissionStatus
): Promise<SubmissionListResponse> {
  const params = new URLSearchParams();
  if (status) {
    params.append("status", status);
  }
  const queryString = params.toString();
  const url = queryString
    ? `/submissions/my-submissions?${queryString}`
    : "/submissions/my-submissions";
  return apiClient.get<SubmissionListResponse>(url, true);
}

/**
 * Get details of a specific submission (Employee only)
 */
export async function getMySubmission(submissionId: number): Promise<Submission> {
  return apiClient.get<Submission>(
    `/submissions/my-submissions/${submissionId}`,
    true
  );
}

/**
 * Upload a document for a submission (Employee only)
 */
export async function uploadSubmissionDocument(
  submissionId: number,
  documentType: string,
  file: File
): Promise<SubmissionDocumentActionResponse> {
  const formData = new FormData();
  formData.append("document_type", documentType);
  formData.append("file", file);

  return apiClient.post<SubmissionDocumentActionResponse>(
    `/submissions/${submissionId}/documents`,
    formData,
    true
  );
}

/**
 * Delete a document from a submission (Employee only)
 */
export async function deleteSubmissionDocument(
  submissionId: number,
  documentId: number
): Promise<void> {
  return apiClient.delete<void>(
    `/submissions/${submissionId}/documents/${documentId}`,
    true
  );
}

/**
 * Submit for coordinator review (Employee only)
 */
export async function submitForReview(
  submissionId: number
): Promise<SubmissionActionResponse> {
  return apiClient.post<SubmissionActionResponse>(
    `/submissions/${submissionId}/submit`,
    {},
    true
  );
}

// =============================================================================
// COORDINATOR ENDPOINTS
// =============================================================================

/**
 * Get all submissions for an application (Coordinator only)
 */
export async function getApplicationSubmissions(
  applicationId: number,
  status?: EmployeeSubmissionStatus
): Promise<SubmissionListResponse> {
  const params = new URLSearchParams();
  if (status) {
    params.append("status", status);
  }
  const queryString = params.toString();
  const url = queryString
    ? `/submissions/application/${applicationId}?${queryString}`
    : `/submissions/application/${applicationId}`;
  return apiClient.get<SubmissionListResponse>(url, true);
}

/**
 * Get detailed submission info for review (Coordinator only)
 */
export async function getSubmissionDetails(
  submissionId: number
): Promise<Submission> {
  return apiClient.get<Submission>(`/submissions/${submissionId}`, true);
}

/**
 * Review a submission document (Coordinator only)
 */
export async function reviewSubmissionDocument(
  submissionId: number,
  documentId: number,
  data: SubmissionDocumentReview
): Promise<SubmissionDocumentActionResponse> {
  return apiClient.post<SubmissionDocumentActionResponse>(
    `/submissions/${submissionId}/documents/${documentId}/review`,
    data,
    true
  );
}

/**
 * Approve an employee submission (Coordinator only)
 */
export async function approveSubmission(
  submissionId: number,
  data: SubmissionApprove
): Promise<SubmissionActionResponse> {
  return apiClient.post<SubmissionActionResponse>(
    `/submissions/${submissionId}/approve`,
    data,
    true
  );
}

/**
 * Reject an employee submission (Coordinator only)
 */
export async function rejectSubmission(
  submissionId: number,
  data: SubmissionReject
): Promise<SubmissionActionResponse> {
  return apiClient.post<SubmissionActionResponse>(
    `/submissions/${submissionId}/reject`,
    data,
    true
  );
}
