import { apiClient } from "./api";

export interface FeedbackEmployee {
  id: number;
  fullname: string;
}

export interface Feedback {
  id: number;
  course_id: number;
  rating: number;
  comment: string | null;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
  employee: FeedbackEmployee | null;
}

export interface FeedbackListResponse {
  feedback: Feedback[];
  total: number;
  average_rating: number;
  rating_distribution: Record<number, number>;
}

export interface MyFeedback {
  id: number;
  course_id: number;
  course_title: string;
  rating: number;
  comment: string | null;
  is_anonymous: boolean;
  created_at: string;
}

export interface FeedbackCreateData {
  course_id: number;
  rating: number;
  comment?: string;
  is_anonymous: boolean;
}

/**
 * Submit or update feedback for a course (employee only)
 */
export async function submitFeedback(data: FeedbackCreateData): Promise<Feedback> {
  return apiClient.post<Feedback>("/feedback", data, true);
}

/**
 * Get current employee's feedback for a specific course
 */
export async function getMyCourseFeedback(courseId: number): Promise<Feedback | null> {
  try {
    return await apiClient.get<Feedback | null>(`/feedback/course/${courseId}/my-feedback`, true);
  } catch {
    return null;
  }
}

/**
 * Get all feedback submitted by current employee
 */
export async function getMyFeedbackList(): Promise<MyFeedback[]> {
  return apiClient.get<MyFeedback[]>("/feedback/my-feedback", true);
}

/**
 * Delete feedback for a course
 */
export async function deleteFeedback(courseId: number): Promise<void> {
  await apiClient.delete(`/feedback/course/${courseId}`, true);
}

/**
 * Get feedback for a course (staff only)
 */
export async function getStaffCourseFeedback(courseId: number): Promise<FeedbackListResponse> {
  return apiClient.get<FeedbackListResponse>(`/feedback/staff/courses/${courseId}`, true);
}

/**
 * Get feedback for a course (professor only - must be their course)
 */
export async function getProfessorCourseFeedback(courseId: number): Promise<FeedbackListResponse> {
  return apiClient.get<FeedbackListResponse>(`/feedback/professor/courses/${courseId}`, true);
}
