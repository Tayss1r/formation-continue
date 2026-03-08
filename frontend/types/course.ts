// Course types matching backend schemas

export type CourseType = "public" | "private";

// Department enum values matching backend
export type Department = 
  | "informatique" 
  | "mecanique" 
  | "electrique" 
  | "civil" 
  | "gestion";

// Department display names for UI
export const DEPARTMENT_DISPLAY_NAMES: Record<Department, string> = {
  informatique: "Informatique",
  mecanique: "Mécanique",
  electrique: "Électrique",
  civil: "Génie Civil",
  gestion: "Gestion"
};

export interface DepartmentOption {
  value: Department;
  label: string;
}

export interface CourseCreator {
  id: number;
  fullname: string;
  email: string;
}

export interface CourseProfessor {
  id: number;
  name: string;
  specialization: string;
  hourly_rate: number;
  department?: Department;
}

export interface ProfessorListItem {
  id: number;
  user_id: number;
  fullname: string;
  email: string;
  specialization: string;
  department?: Department;
  department_display?: string;
  courses_taught: number;
  courses_in_department: number;
  relevance_score: number;
  is_recommended: boolean;
}

export interface ProfessorListResponse {
  professors: ProfessorListItem[];
  total: number;
}

/**
 * Course represents a training template/offering.
 * Dates and scheduling are handled via availability slots.
 */
export interface Course {
  id: number;
  title: string;
  description: string;
  short_description?: string;
  type: CourseType;
  price: number;
  max_seats: number;
  image_path?: string;
  duration_hours?: number;
  sector?: string;
  department?: Department;
  department_display?: string;
  learning_outcomes?: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
  created_by?: CourseCreator;
  professor?: CourseProfessor;
}

export interface CourseListItem {
  id: number;
  title: string;
  short_description?: string;
  type: CourseType;
  price: number;
  max_seats: number;
  image_path?: string;
  duration_hours?: number;
  sector?: string;
  department?: Department;
  department_display?: string;
  start_date?: string;
  available_slots?: number;
  is_published?: boolean;
}

export interface CourseListResponse {
  courses: CourseListItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CourseCreateData {
  title: string;
  description: string;
  short_description?: string;
  type: CourseType;
  price: number;
  max_seats: number;
  duration_hours?: number;
  sector?: string;
  professor_id?: number;
  department?: Department;
  learning_outcomes?: string[];
  is_published?: boolean;
}

export interface CourseUpdateData extends Partial<CourseCreateData> {}

export interface CourseEditability {
  can_edit_price: boolean;
  can_edit_seats: boolean;
  has_bookings: boolean;
  reason?: string;
}

// Course materials for document uploads
export interface CourseMaterial {
  id: number;
  course_id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_by_id: number;
  created_at: string;
}
