/**
 * Calls for Applicants API Library
 */

import { apiClient } from "./api";
import type {
  Call,
  CallPublic,
  CallResults,
  CallCreate,
  CallUpdate,
  CallListResponse,
  CallPublicListResponse,
  CallResultsListResponse,
  CallCreateResponse,
  CallActionResponse,
  Department,
} from "@/types/call";

// =============================================================================
// PUBLIC ENDPOINTS
// =============================================================================

/**
 * Get all published calls (for landing page)
 */
export async function getPublicCalls(
  department?: Department
): Promise<CallPublicListResponse> {
  const params = new URLSearchParams();
  if (department) {
    params.append("department", department);
  }
  const queryString = params.toString();
  const url = queryString ? `/calls/public?${queryString}` : "/calls/public";
  return apiClient.get<CallPublicListResponse>(url);
}

/**
 * Get currently active calls (open for applications)
 */
export async function getActiveCalls(
  department?: Department
): Promise<CallPublicListResponse> {
  const params = new URLSearchParams();
  if (department) {
    params.append("department", department);
  }
  const queryString = params.toString();
  const url = queryString ? `/calls/active?${queryString}` : "/calls/active";
  return apiClient.get<CallPublicListResponse>(url);
}

/**
 * Get calls with published results
 */
export async function getPublishedResults(
  department?: Department
): Promise<CallResultsListResponse> {
  const params = new URLSearchParams();
  if (department) {
    params.append("department", department);
  }
  const queryString = params.toString();
  const url = queryString ? `/calls/results?${queryString}` : "/calls/results";
  return apiClient.get<CallResultsListResponse>(url);
}

/**
 * Get public details of a specific call
 */
export async function getPublicCallDetails(callId: number): Promise<CallPublic> {
  return apiClient.get<CallPublic>(`/calls/public/${callId}`);
}

/**
 * Get all published calls for a specific department
 */
export async function getCallsByDepartment(
  department: Department
): Promise<CallPublicListResponse> {
  return apiClient.get<CallPublicListResponse>(`/calls/department/${department}`);
}

// =============================================================================
// COORDINATOR ENDPOINTS
// =============================================================================

/**
 * Create a new call for applicants (Coordinator only)
 */
export async function createCall(data: CallCreate): Promise<CallCreateResponse> {
  return apiClient.post<CallCreateResponse>("/calls", data, true);
}

/**
 * Get call details (Coordinator only)
 */
export async function getCallDetails(callId: number): Promise<Call> {
  return apiClient.get<Call>(`/calls/${callId}`, true);
}

/**
 * Update a call (Coordinator only)
 */
export async function updateCall(
  callId: number,
  data: CallUpdate
): Promise<CallActionResponse> {
  return apiClient.put<CallActionResponse>(`/calls/${callId}`, data, true);
}

/**
 * Delete a call (Coordinator only, draft only)
 */
export async function deleteCall(callId: number): Promise<void> {
  return apiClient.delete<void>(`/calls/${callId}`, true);
}

/**
 * Publish a call (Coordinator only)
 */
export async function publishCall(callId: number): Promise<CallActionResponse> {
  return apiClient.post<CallActionResponse>(`/calls/${callId}/publish`, {}, true);
}

/**
 * Close applications for a call (Coordinator only)
 */
export async function closeCall(callId: number): Promise<CallActionResponse> {
  return apiClient.post<CallActionResponse>(`/calls/${callId}/close`, {}, true);
}

/**
 * Start reviewing applications (Coordinator only)
 */
export async function startCallReview(callId: number): Promise<CallActionResponse> {
  return apiClient.post<CallActionResponse>(`/calls/${callId}/start-review`, {}, true);
}

/**
 * Publish results (Coordinator only)
 */
export async function publishCallResults(callId: number): Promise<CallActionResponse> {
  return apiClient.post<CallActionResponse>(`/calls/${callId}/publish-results`, {}, true);
}

/**
 * Reopen a call (Coordinator only)
 */
export async function reopenCall(callId: number): Promise<CallActionResponse> {
  return apiClient.post<CallActionResponse>(`/calls/${callId}/reopen`, {}, true);
}
