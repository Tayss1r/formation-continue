import { apiClient } from "./api";
import type { Course, CourseListResponse, CourseCreateData, CourseUpdateData } from "@/types/course";

// Public endpoints (no auth required)
export async function getPublicCourses(
  page = 1,
  perPage = 12,
  courseType?: string
): Promise<CourseListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });
  
  if (courseType) {
    params.append("course_type", courseType);
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
  if (data.schedule) {
    formData.append("schedule", data.schedule);
  }
  if (data.start_date) {
    formData.append("start_date", data.start_date);
  }
  if (data.end_date) {
    formData.append("end_date", data.end_date);
  }
  if (data.professor_id) {
    formData.append("professor_id", data.professor_id.toString());
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
  if (data.schedule) formData.append("schedule", data.schedule);
  if (data.start_date) formData.append("start_date", data.start_date);
  if (data.end_date) formData.append("end_date", data.end_date);
  if (data.professor_id) formData.append("professor_id", data.professor_id.toString());
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
