import { apiClient } from "./api";

// Types
export interface EnrollmentCodeInfo {
  valid: boolean;
  message: string;
  session_info?: {
    course_title: string;
    start_date: string;
    end_date: string;
    schedule?: string;
  };
  company_name?: string;
  remaining_spots?: number;
}

export interface EnrollmentResponse {
  id: number;
  employee_id: number;
  availability_slot_id: number;
  enrolled_at: string;
  session_info?: {
    course_title: string;
    start_date: string;
    end_date: string;
    schedule?: string;
  };
  company_name?: string;
  document_status?: string;
}

export interface MyEnrollment {
  id: number;
  enrolled_at: string;
  session: {
    course_title: string;
    start_date: string;
    end_date: string;
    schedule?: string;
    slot_id: number;
  };
  company_name: string;
  document_status?: string;
  document_id?: number;
}

export interface DocumentUploadResponse {
  id: number;
  document_type: string;
  original_filename: string;
  status: string;
  uploaded_at: string;
}

export interface EnrolleeDocument {
  id: number;
  enrollment_id: number;
  document_type: string;
  original_filename: string;
  file_path: string;
  status: string;
  uploaded_at: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

export interface SessionEnrollee {
  enrollment_id: number;
  employee_name: string;
  employee_email: string;
  company_name: string;
  enrolled_at: string;
  document?: EnrolleeDocument;
}

export interface EnrollmentCode {
  id: number;
  code: string;
  company_name: string;
  max_usage: number;
  used_count: number;
  remaining: number;
  expires_at: string;
  created_at: string;
}

// Employee API functions

/**
 * Validate an enrollment code before enrolling
 */
export async function validateEnrollmentCode(code: string): Promise<EnrollmentCodeInfo> {
  return apiClient.post<EnrollmentCodeInfo>("/enrollment/validate-code", { code }, true);
}

/**
 * Get info about an enrollment code
 */
export async function getEnrollmentCodeInfo(code: string): Promise<EnrollmentCodeInfo> {
  return apiClient.get<EnrollmentCodeInfo>(`/enrollment/code-info/${code}`, true);
}

/**
 * Enroll with a code
 */
export async function enrollWithCode(code: string): Promise<EnrollmentResponse> {
  return apiClient.post<EnrollmentResponse>("/enrollment/enroll", { code }, true);
}

/**
 * Get my enrollments
 */
export async function getMyEnrollments(): Promise<MyEnrollment[]> {
  return apiClient.get<MyEnrollment[]>("/enrollment/my-enrollments", true);
}

/**
 * Upload document for an enrollment
 */
export async function uploadDocument(
  enrollmentId: number,
  documentType: string,
  file: File
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("document_type", documentType);
  formData.append("file", file);

  return apiClient.post<DocumentUploadResponse>(
    `/enrollment/enrollments/${enrollmentId}/document`,
    formData,
    true
  );
}

/**
 * Get documents for an enrollment
 */
export async function getEnrollmentDocuments(enrollmentId: number): Promise<EnrolleeDocument[]> {
  return apiClient.get<EnrolleeDocument[]>(
    `/enrollment/enrollments/${enrollmentId}/documents`,
    true
  );
}

// Staff API functions

/**
 * Get all enrollees for a session (staff only)
 */
export async function getSessionEnrollees(slotId: number): Promise<SessionEnrollee[]> {
  return apiClient.get<SessionEnrollee[]>(`/enrollment/staff/sessions/${slotId}/enrollees`, true);
}

/**
 * Review a document (staff only)
 */
export async function reviewDocument(
  documentId: number,
  status: "verified" | "rejected",
  reviewerNotes?: string
): Promise<EnrolleeDocument> {
  return apiClient.post<EnrolleeDocument>(
    `/enrollment/staff/documents/${documentId}/review`,
    { status, reviewer_notes: reviewerNotes },
    true
  );
}

/**
 * Get enrollment codes for a session (staff only)
 */
export async function getSessionEnrollmentCodes(slotId: number): Promise<EnrollmentCode[]> {
  return apiClient.get<EnrollmentCode[]>(`/enrollment/staff/sessions/${slotId}/codes`, true);
}
