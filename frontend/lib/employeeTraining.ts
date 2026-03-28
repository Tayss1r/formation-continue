import { apiClient } from "./api";

export interface EmployeeTrainingSession {
  id: number;
  cohort_id: number;
  cohort_name: string;
  call_title: string;
  course_title: string;
  title: string;
  session_date: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  professor_name: string;
}

export interface EmployeeTrainingMaterial {
  id: number;
  cohort_id: number;
  cohort_name: string;
  course_id: number;
  course_title: string;
  title: string;
  description?: string | null;
  file_name: string;
  file_size: number;
  file_type: string;
  created_at: string;
}

export interface EmployeeTrainingCalendarResponse {
  sessions: EmployeeTrainingSession[];
  total: number;
}

export interface EmployeeTrainingMaterialsResponse {
  materials: EmployeeTrainingMaterial[];
  total: number;
}

export type EmployeeAttendanceStatus = "present" | "absent" | "late";

export interface EmployeeAttendanceHistoryItem {
  session_id: number;
  session_title: string;
  session_date?: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  cohort_id: number;
  cohort_name: string;
  course_title: string;
  professor_name: string;
  status: EmployeeAttendanceStatus;
  notes?: string | null;
  marked_at: string;
}

export interface EmployeeAttendanceHistoryResponse {
  attendance: EmployeeAttendanceHistoryItem[];
  total: number;
}

export async function getEmployeeTrainingCalendar(): Promise<EmployeeTrainingCalendarResponse> {
  return apiClient.get<EmployeeTrainingCalendarResponse>("/employee/training/calendar", true);
}

export async function getEmployeeTrainingMaterials(): Promise<EmployeeTrainingMaterialsResponse> {
  return apiClient.get<EmployeeTrainingMaterialsResponse>("/employee/training/materials", true);
}

export async function getEmployeeAttendanceHistory(): Promise<EmployeeAttendanceHistoryResponse> {
  return apiClient.get<EmployeeAttendanceHistoryResponse>("/employee/training/attendance", true);
}
