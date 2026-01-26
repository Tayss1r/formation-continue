// Course types matching backend schemas

export type CourseType = "public" | "private";

export interface CourseCreator {
  id: number;
  fullname: string;
  email: string;
}

export interface CourseProfessor {
  id: number;
  specialization: string;
  hourly_rate: number;
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
  is_published?: boolean;
}

export interface CourseUpdateData extends Partial<CourseCreateData> {}

export interface CourseEditability {
  can_edit_price: boolean;
  can_edit_seats: boolean;
  has_bookings: boolean;
  reason?: string;
}
