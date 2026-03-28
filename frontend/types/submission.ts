/**
 * Employee Submission Types
 */

import type { DocumentReviewStatus, EmployeeSubmissionStatus, RequiredDocumentSpec } from './call';

// Submission document interface (matches backend SubmissionDocumentOut)
export interface SubmissionDocument {
  id: number;
  document_type: string;
  document_label: string;
  file_path: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  review_status: DocumentReviewStatus;
  review_notes?: string;
  uploaded_at: string;
  reviewed_at?: string;
}

// Employee info (partial)
export interface SubmissionEmployee {
  id: number;
  user_id: number;
  fullname?: string;
  email?: string;
  position?: string;
}

// Company info for submission context
export interface SubmissionCompany {
  id: number;
  name: string;
}

// Call info for submission context
export interface SubmissionCall {
  id: number;
  title: string;
  reference_number: string;
  department: string;
  employee_required_documents?: RequiredDocumentSpec[];
}

// Application info nested in submission (matches backend SubmissionApplicationInfo)
export interface SubmissionApplication {
  id: number;
  status: string;
  company?: SubmissionCompany;
  call?: SubmissionCall;
}

// Submission interface (matches backend SubmissionOut)
export interface Submission {
  id: number;
  company_application_id: number;
  employee_id: number;
  status: EmployeeSubmissionStatus;
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  review_notes?: string;
  application?: SubmissionApplication;
  employee?: SubmissionEmployee;
  documents: SubmissionDocument[];
  documents_complete: boolean;
  can_submit: boolean;
}

// Available submission (for employees to see what they can apply to)
export interface AvailableSubmission {
  application_id: number;
  call_id: number;
  call_title: string;
  call_reference: string;
  department: string;
  application_deadline?: string;
  employee_required_documents: RequiredDocumentSpec[];
  has_submitted: boolean;
  submission_id?: number;
  submission_status?: string;
}

// Create interface
export interface SubmissionCreate {
  company_application_id: number;
}

// Action interfaces
export interface SubmissionApprove {
  review_notes?: string;
}

export interface SubmissionReject {
  review_notes?: string;
}

export interface SubmissionDocumentReview {
  review_status: 'approved' | 'rejected' | 'revision_required';
  review_notes?: string;
}

// Response interfaces
export interface SubmissionListResponse {
  submissions: Submission[];
  total: number;
}

export interface AvailableSubmissionsResponse {
  available: AvailableSubmission[];
  total: number;
}

export interface SubmissionActionResponse {
  message: string;
  submission: Submission;
}

export interface SubmissionDocumentActionResponse {
  message: string;
  document: SubmissionDocument;
}

// Status display helpers
export const SUBMISSION_STATUS_LABELS: Record<EmployeeSubmissionStatus, string> = {
  pending: 'En attente',
  submitted: 'Soumise',
  under_review: 'En révision',
  approved: 'Approuvée',
  rejected: 'Rejetée',
};

export const SUBMISSION_STATUS_COLORS: Record<EmployeeSubmissionStatus, string> = {
  pending: 'gray',
  submitted: 'blue',
  under_review: 'purple',
  approved: 'green',
  rejected: 'red',
};
