/**
 * Invitation Workflow Types
 */

// Company invitation page info
export interface CompanyInvitePageInfo {
  application_id: number;
  call_title: string;
  call_reference: string;
  company_name: string;
  proposed_employee_count: number;
  invited_employees: InvitedEmployee[];
  token: string;
}

export interface InvitedEmployee {
  id: number;
  name: string;
  email: string;
  is_used: boolean;
  created_at?: string;
}

// Employee invitation info
export interface EmployeeInvitationInfo {
  employee_name: string;
  employee_email: string;
  company_name: string;
  call_title: string;
  call_reference: string;
  token: string;
  is_used: boolean;
}

// Employee registration request
export interface EmployeeRegisterRequest {
  token: string;
  fullname: string;
  email: string;
  password: string;
}

// Coordinator: application employees view
export interface ApplicationEmployeesData {
  application_id: number;
  call_id?: number;
  call_title: string;
  call_reference: string;
  call_status?: string;
  company_name: string;
  proposed_employee_count: number;
  invited_count: number;
  registered_count: number;
  employee_invitations: InvitedEmployee[];
  submissions: EmployeeSubmissionInfo[];
  employee_required_documents: { type: string; label: string; required: boolean }[];
}

export interface EmployeeSubmissionInfo {
  id: number;
  status: string;
  employee: {
    id: number;
    fullname: string;
    email: string;
  } | null;
  documents: EmployeeDocInfo[];
  created_at?: string;
  reviewed_at?: string;
  review_notes?: string;
}

export interface EmployeeDocInfo {
  id: number;
  document_type: string;
  document_label: string;
  file_path: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  review_status: string;
  uploaded_at?: string;
}

// Results data
export interface CallResultsData {
  call_id: number;
  call_title: string;
  call_reference: string;
  department: string;
  companies: ResultCompany[];
  total_approved_companies: number;
  total_approved_employees: number;
}

export interface ResultCompany {
  id: number;
  name: string;
  industry_sector: string;
  proposed_employee_count: number;
  employees: ResultEmployee[];
  approved_employees: number;
}

export interface ResultEmployee {
  name: string;
  email: string;
  status: string;
}
