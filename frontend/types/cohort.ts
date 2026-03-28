export interface CohortProfessor {
  id: number;
  user_id: number;
  fullname: string;
  email: string;
  specialization: string;
  department?: string | null;
}

export interface Cohort {
  id: number;
  name: string;
  call_id: number;
  call_title: string;
  call_reference_number: string;
  course_id: number;
  course_title: string;
  training_start_date: string;
  training_end_date: string;
  daily_start_hour: string;
  daily_end_hour: string;
  created_at: string;
  professors: CohortProfessor[];
}

export interface CohortListResponse {
  cohorts: Cohort[];
  total: number;
}

export interface CohortFormCallOption {
  id: number;
  title: string;
  reference_number: string;
  results_publication_date?: string | null;
}

export interface CohortFormCourseOption {
  id: number;
  title: string;
}

export interface CohortFormOptionsResponse {
  calls: CohortFormCallOption[];
  courses: CohortFormCourseOption[];
}

export interface CreateCohortPayload {
  name: string;
  call_id: number;
  course_id: number;
  training_start_date: string;
  training_end_date: string;
  daily_start_hour: string;
  daily_end_hour: string;
}

export interface AssignProfessorsPayload {
  professor_ids: number[];
}

export interface AssignProfessorsResponse {
  message: string;
  cohort_id: number;
  assigned_professors: number;
  professors: CohortProfessor[];
}

export interface ProfessorAssignedCohort {
  id: number;
  name: string;
  call_id: number;
  call_title: string;
  course_id: number;
  course_title: string;
  training_start_date: string;
  training_end_date: string;
  daily_start_hour: string;
  daily_end_hour: string;
}

export interface ProfessorAssignedCohortsResponse {
  cohorts: ProfessorAssignedCohort[];
  total: number;
}

export interface CohortSession {
  id: number;
  cohort_id: number;
  professor_id: number;
  professor_name: string;
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  created_at: string;
}

export interface CohortSessionListResponse {
  sessions: CohortSession[];
  total: number;
}

export interface CohortSessionPayload {
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location?: string;
}

export interface CohortMaterial {
  id: number;
  cohort_id: number;
  cohort_name: string;
  course_id: number;
  course_title: string;
  title: string;
  description?: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by_id?: number;
  uploaded_by_name?: string;
  created_at: string;
}

export interface CohortMaterialListResponse {
  materials: CohortMaterial[];
  total: number;
}

export type AttendanceStatus = "present" | "absent" | "late";

export interface SessionAttendanceRecord {
  employee_id: number;
  employee_name: string;
  employee_email: string;
  company_name?: string | null;
  status?: AttendanceStatus | null;
  notes?: string | null;
  marked_at?: string | null;
}

export interface SessionAttendanceListResponse {
  attendance: SessionAttendanceRecord[];
  total: number;
}

export interface AttendanceBulkUpsertPayload {
  records: Array<{
    employee_id: number;
    status: AttendanceStatus;
    notes?: string;
  }>;
}
