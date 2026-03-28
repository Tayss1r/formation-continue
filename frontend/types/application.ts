/**
 * Company Application Types
 */

import type { ApplicationStatus, DocumentReviewStatus, RequiredDocumentSpec } from './call';

// Document interfaces
export interface ApplicationDocument {
  id: number;
  document_type: string;
  file_path: string;
  original_filename: string;
  review_status: DocumentReviewStatus;
  review_notes?: string;
  uploaded_at: string;
  reviewed_at?: string;
}

// Company info (partial)
export interface ApplicationCompany {
  id: number;
  name: string;
  trade_register_number?: string;
  industry_sector?: string;
}

// Call info (partial, for application context)
export interface ApplicationCall {
  id: number;
  title: string;
  reference_number: string;
  department: string;
  required_documents: RequiredDocumentSpec[];
}

// Application interfaces
export interface Application {
  id: number;
  call_id: number;
  company_id: number;
  status: ApplicationStatus;
  motivation_letter?: string;
  proposed_employee_count?: number;
  additional_notes?: string;
  submitted_at?: string;
  reviewed_at?: string;
  coordinator_decision?: string;
  decision_notes?: string;
  call?: ApplicationCall;
  company?: ApplicationCompany;
  documents: ApplicationDocument[];
}

export interface ApplicationWithCall extends Application {
  call?: ApplicationCall;
}

// Create interfaces
export interface ApplicationCreate {
  call_id: number;
  proposed_employee_count: number;
  motivation_letter?: string;
}

export interface ApplicationUpdate {
  proposed_employee_count?: number;
  motivation_letter?: string;
}

// Action interfaces
export interface ApplicationApprove {
  decision_notes?: string;
}

export interface ApplicationReject {
  rejection_reason: string;
  decision_notes?: string;
}

export interface ApplicationRequestInfo {
  message: string;
}

export interface DocumentReview {
  review_status: 'approved' | 'rejected' | 'revision_required';
  review_notes?: string;
}

// Response interfaces
export interface ApplicationListResponse {
  applications: Application[];
  total: number;
}

export interface ApplicationActionResponse {
  message: string;
  application: Application;
}

export interface DocumentActionResponse {
  message: string;
  document: ApplicationDocument;
}

export interface CompanyAttendanceEmployee {
  employee_id: number;
  employee_name: string;
  employee_email: string;
  company_name: string;
  present_count: number;
  late_count: number;
  absent_count: number;
  total_sessions_marked: number;
  presence_percentage: number;
  course_titles: string[];
  cohort_titles: string[];
  session_titles: string[];
}

export interface CompanyAttendanceSummaryResponse {
  attendance: CompanyAttendanceEmployee[];
  total: number;
}

// Status display helpers
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: 'En attente',
  submitted: 'Soumise',
  under_review: 'En cours d\'examen',
  additional_info_requested: 'Informations supplémentaires demandées',
  approved: 'Approuvée',
  rejected: 'Rejetée',
  withdrawn: 'Retirée',
};

export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {
  pending: 'gray',
  submitted: 'blue',
  under_review: 'yellow',
  additional_info_requested: 'orange',
  approved: 'green',
  rejected: 'red',
  withdrawn: 'gray',
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentReviewStatus, string> = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Rejeté',
  revision_required: 'Révision demandée',
};

export const DOCUMENT_STATUS_COLORS: Record<DocumentReviewStatus, string> = {
  pending: 'gray',
  approved: 'green',
  rejected: 'red',
  revision_required: 'orange',
};
