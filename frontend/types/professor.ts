// Professor-related types

import { Department } from "./course";

export interface ProfessorDashboardStats {
  total_courses: number;
  total_sessions: number;
  total_enrolled_employees: number;
  upcoming_sessions: number;
}

export interface ProfessorCourse {
  id: number;
  title: string;
  description: string;
  short_description?: string;
  type: string;
  department?: Department;
  department_display?: string;
  duration_hours?: number;
  max_seats: number;
  image_path?: string;
  is_published: boolean;
  enrolled_count: number;
  upcoming_sessions: number;
  materials_count: number;
  created_at: string;
}

export interface ProfessorDashboard {
  professor_id: number;
  fullname: string;
  email: string;
  specialization: string;
  department?: Department;
  department_display?: string;
  stats: ProfessorDashboardStats;
  recent_courses: ProfessorCourse[];
}

export interface ProfessorCourseListResponse {
  courses: ProfessorCourse[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CourseMaterial {
  id: number;
  course_id: number;
  course_title?: string;
  title: string;
  description?: string;
  file_name: string;
  file_path?: string;
  file_size: number;
  file_type: string;
  uploaded_by_id?: number;
  uploaded_by_name?: string;
  created_at: string;
}

export interface CourseMaterialListResponse {
  materials: CourseMaterial[];
  total: number;
}

export interface EnrolledEmployee {
  id: number;
  fullname: string;
  email: string;
  company_name?: string;
  session_date?: string;
  enrolled_at: string;
  document_status?: string;
}

export interface EnrolledEmployeeListResponse {
  employees: EnrolledEmployee[];
  total: number;
}
