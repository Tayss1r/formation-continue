import { apiClient } from "./api";
import type { 
  Course, 
  CourseListResponse, 
  CourseCreateData, 
  CourseUpdateData, 
  CourseEditability,
  Department,
  ProfessorListItem,
  ProfessorListResponse
} from "@/types/course";

// Department types for API responses
export interface DepartmentInfo {
  value: Department;
  label: string;
}

export interface DepartmentListResponse {
  departments: DepartmentInfo[];
}

// Get all departments
export async function getDepartments(): Promise<DepartmentListResponse> {
  return apiClient.get<DepartmentListResponse>("/courses/departments");
}

// Get professors list, optionally filtered by department
export async function getProfessors(department?: Department): Promise<ProfessorListResponse> {
  const params = new URLSearchParams();
  if (department) {
    params.append("department", department);
  }
  const queryString = params.toString();
  const url = queryString ? `/courses/professors?${queryString}` : "/courses/professors";
  return apiClient.get<ProfessorListResponse>(url);
}

// Public endpoints (no auth required)
export async function getPublicCourses(
  page = 1,
  perPage = 12,
  courseType?: string,
  department?: Department
): Promise<CourseListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });
  
  if (courseType) {
    params.append("course_type", courseType);
  }
  
  if (department) {
    params.append("department", department);
  }

  return apiClient.get<CourseListResponse>(`/courses/public?${params.toString()}`);
}

export async function getCourseDetails(courseId: number): Promise<Course> {
  return apiClient.get<Course>(`/courses/${courseId}`);
}

// Staff endpoints (auth required)
export async function getStaffCourses(
  page = 1,
  perPage = 10
): Promise<CourseListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });

  return apiClient.get<CourseListResponse>(
    `/courses/staff/my-courses?${params.toString()}`,
    true
  );
}

export async function getStaffCourseDetails(courseId: number): Promise<Course> {
  return apiClient.get<Course>(`/courses/staff/course/${courseId}`, true);
}

/**
 * Check if a course's price and seats can be edited
 * Returns editability status and reason if not editable
 */
export async function getCourseEditability(courseId: number): Promise<CourseEditability> {
  return apiClient.get<CourseEditability>(`/courses/staff/course/${courseId}/editability`, true);
}

export async function createCourse(
  data: CourseCreateData,
  image?: File
): Promise<Course> {
  const formData = new FormData();
  
  // Add all course data fields
  formData.append("title", data.title);
  formData.append("description", data.description);
  formData.append("price", data.price.toString());
  formData.append("max_seats", data.max_seats.toString());
  formData.append("type", data.type);
  
  if (data.short_description) {
    formData.append("short_description", data.short_description);
  }
  if (data.duration_hours) {
    formData.append("duration_hours", data.duration_hours.toString());
  }
  if (data.sector) {
    formData.append("sector", data.sector);
  }
  if (data.professor_id) {
    formData.append("professor_id", data.professor_id.toString());
  }
  if (data.department) {
    formData.append("department", data.department);
  }
  if (data.learning_outcomes && data.learning_outcomes.length > 0) {
    formData.append("learning_outcomes", JSON.stringify(data.learning_outcomes));
  }
  if (data.is_published !== undefined) {
    formData.append("is_published", data.is_published.toString());
  }
  
  // Add image if provided
  if (image) {
    formData.append("image", image);
  }

  return apiClient.post<Course>("/courses", formData, true);
}

export async function updateCourse(
  courseId: number,
  data: CourseUpdateData,
  image?: File
): Promise<Course> {
  const formData = new FormData();
  
  // Add only provided fields
  if (data.title) formData.append("title", data.title);
  if (data.description) formData.append("description", data.description);
  if (data.price !== undefined) formData.append("price", data.price.toString());
  if (data.max_seats !== undefined) formData.append("max_seats", data.max_seats.toString());
  if (data.type) formData.append("type", data.type);
  if (data.short_description) formData.append("short_description", data.short_description);
  if (data.duration_hours) formData.append("duration_hours", data.duration_hours.toString());
  if (data.sector) formData.append("sector", data.sector);
  if (data.professor_id) formData.append("professor_id", data.professor_id.toString());
  if (data.department) formData.append("department", data.department);
  if (data.learning_outcomes && data.learning_outcomes.length > 0) {
    formData.append("learning_outcomes", JSON.stringify(data.learning_outcomes));
  }
  if (data.is_published !== undefined) formData.append("is_published", data.is_published.toString());
  
  // Add image if provided
  if (image) {
    formData.append("image", image);
  }

  return apiClient.put<Course>(`/courses/${courseId}`, formData, true);
}

export async function deleteCourse(courseId: number): Promise<{ message: string; course_id: number }> {
  return apiClient.delete(`/courses/${courseId}`, true);
}

// Admin endpoints
export async function getAllCoursesAdmin(
  page = 1,
  perPage = 10
): Promise<CourseListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });

  return apiClient.get<CourseListResponse>(
    `/courses/admin/all?${params.toString()}`,
    true
  );
}
