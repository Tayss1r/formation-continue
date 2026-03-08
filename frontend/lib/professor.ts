// Professor API functions

import { apiClient } from "./api";
import type {
  ProfessorDashboard,
  ProfessorCourse,
  ProfessorCourseListResponse,
  CourseMaterial,
  CourseMaterialListResponse,
  EnrolledEmployeeListResponse,
} from "@/types/professor";

// Dashboard
export async function getProfessorDashboard(): Promise<ProfessorDashboard> {
  return apiClient.get<ProfessorDashboard>("/professor/dashboard", true);
}

// Courses
export async function getProfessorCourses(
  page = 1,
  perPage = 10
): Promise<ProfessorCourseListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });
  return apiClient.get<ProfessorCourseListResponse>(
    `/professor/my-courses?${params.toString()}`,
    true
  );
}

export async function getProfessorCourseDetails(
  courseId: number
): Promise<ProfessorCourse> {
  return apiClient.get<ProfessorCourse>(`/professor/course/${courseId}`, true);
}

// Materials
export async function getCourseMaterials(
  courseId: number
): Promise<CourseMaterialListResponse> {
  return apiClient.get<CourseMaterialListResponse>(
    `/professor/course/${courseId}/materials`,
    true
  );
}

export async function uploadCourseMaterial(
  courseId: number,
  title: string,
  file: File,
  description?: string
): Promise<CourseMaterial> {
  const formData = new FormData();
  formData.append("file", file);
  
  const params = new URLSearchParams({
    title,
  });
  if (description) {
    params.append("description", description);
  }
  
  return apiClient.post<CourseMaterial>(
    `/professor/course/${courseId}/materials?${params.toString()}`,
    formData,
    true
  );
}

export async function deleteCourseMaterial(
  materialId: number
): Promise<{ message: string; material_id: number }> {
  return apiClient.delete(`/professor/materials/${materialId}`, true);
}

// Enrolled Employees
export async function getEnrolledEmployees(
  courseId: number,
  sessionId?: number
): Promise<EnrolledEmployeeListResponse> {
  const params = new URLSearchParams();
  if (sessionId) {
    params.append("session_id", sessionId.toString());
  }
  const queryString = params.toString();
  const url = queryString
    ? `/professor/course/${courseId}/employees?${queryString}`
    : `/professor/course/${courseId}/employees`;
  
  return apiClient.get<EnrolledEmployeeListResponse>(url, true);
}

// Download material (returns URL)
export function getMaterialDownloadUrl(materialId: number): string {
  return `/materials/download/${materialId}`;
}
