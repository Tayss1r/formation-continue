/**
 * Call for Applicants Types
 */

// Enums
export type CallStatus = 'draft' | 'published' | 'closed' | 'under_review' | 'results_published';

export type ApplicationStatus = 
  | 'pending' 
  | 'submitted' 
  | 'under_review' 
  | 'additional_info_requested' 
  | 'approved' 
  | 'rejected' 
  | 'withdrawn';

export type DocumentReviewStatus = 'pending' | 'approved' | 'rejected' | 'revision_required';

export type EmployeeSubmissionStatus = 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected';

export type Department = 
  | 'informatique' 
  | 'mecanique'
  | 'electrique'
  | 'civil'
  | 'gestion';

// Department display names
export const DEPARTMENT_DISPLAY_NAMES: Record<Department, string> = {
  informatique: "Technologie de l'informatique",
  mecanique: 'Génie mécanique',
  electrique: 'Génie électrique',
  civil: 'Génie civil',
  gestion: 'Sciences Économiques et Sciences de Gestion',
};

// Document specification
export interface RequiredDocumentSpec {
  type: string;
  label: string;
  description?: string;
  required: boolean;
  max_size_mb?: number;
  allowed_extensions?: string[];
}

// Coordinator info
export interface CoordinatorInfo {
  id: number;
  fullname: string;
  email: string;
}

// Call interfaces
export interface Call {
  id: number;
  title: string;
  reference_number: string;
  department: Department;
  description?: string;
  eligibility_criteria?: string;
  required_documents: RequiredDocumentSpec[];
  employee_required_documents: RequiredDocumentSpec[];
  application_start_date: string;
  application_deadline: string;
  results_publication_date?: string;
  status: CallStatus;
  created_at: string;
  updated_at: string;
  published_at?: string;
  created_by?: CoordinatorInfo;
  application_count?: number;
}

export interface CallPublic {
  id: number;
  title: string;
  reference_number: string;
  department: Department;
  department_display: string;
  description?: string;
  eligibility_criteria?: string;
  required_documents: RequiredDocumentSpec[];
  application_start_date: string;
  application_deadline: string;
  is_open: boolean;
  is_upcoming?: boolean;
  days_remaining?: number;
  days_until_open?: number;
}

export interface CallResults {
  id: number;
  title: string;
  reference_number: string;
  department: Department;
  department_display: string;
  results_publication_date?: string;
  admitted_companies: AdmittedCompany[];
  total_admitted: number;
}

export interface AdmittedCompany {
  id: number;
  name: string;
  industry_sector?: string;
}

// Create/Update interfaces
export interface CallCreate {
  title: string;
  reference_number: string;
  department: Department;
  description?: string;
  eligibility_criteria?: string;
  required_documents?: RequiredDocumentSpec[];
  employee_required_documents?: RequiredDocumentSpec[];
  application_start_date: string;
  application_deadline: string;
  results_publication_date?: string;
}

export interface CallUpdate {
  title?: string;
  description?: string;
  eligibility_criteria?: string;
  required_documents?: RequiredDocumentSpec[];
  employee_required_documents?: RequiredDocumentSpec[];
  application_start_date?: string;
  application_deadline?: string;
  results_publication_date?: string;
}

// Response interfaces
export interface CallListResponse {
  calls: Call[];
  total: number;
}

export interface CallPublicListResponse {
  calls: CallPublic[];
  total: number;
}

export interface CallResultsListResponse {
  results: CallResults[];
  total: number;
}

export interface CallCreateResponse {
  message: string;
  call: Call;
}

export interface CallActionResponse {
  message: string;
  call: Call;
}
