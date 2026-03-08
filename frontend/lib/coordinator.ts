/**
 * Coordinator Dashboard API Library
 */

import { apiClient } from "./api";
import type {
  DashboardResponse,
  PendingReviewsResponse,
  RecentActivityResponse,
  AnalyticsResponse,
  CoordinatorCallsResponse,
} from "@/types/coordinator";
import type { CallStatus } from "@/types/call";

/**
 * Get coordinator dashboard statistics
 */
export async function getDashboard(): Promise<DashboardResponse> {
  return apiClient.get<DashboardResponse>("/coordinator/dashboard", true);
}

/**
 * Get items pending review
 */
export async function getPendingReviews(
  limit: number = 20
): Promise<PendingReviewsResponse> {
  const params = new URLSearchParams({ limit: limit.toString() });
  return apiClient.get<PendingReviewsResponse>(
    `/coordinator/pending-reviews?${params.toString()}`,
    true
  );
}

/**
 * Get recent activity from audit logs
 */
export async function getRecentActivity(
  days: number = 7,
  limit: number = 50
): Promise<RecentActivityResponse> {
  const params = new URLSearchParams({
    days: days.toString(),
    limit: limit.toString(),
  });
  return apiClient.get<RecentActivityResponse>(
    `/coordinator/recent-activity?${params.toString()}`,
    true
  );
}

/**
 * Get analytics data for charts/reports
 */
export async function getAnalytics(
  periodDays: number = 30
): Promise<AnalyticsResponse> {
  const params = new URLSearchParams({
    period_days: periodDays.toString(),
  });
  return apiClient.get<AnalyticsResponse>(
    `/coordinator/analytics?${params.toString()}`,
    true
  );
}

/**
 * Get all calls created by current coordinator
 */
export async function getMyCalls(
  status?: CallStatus
): Promise<CoordinatorCallsResponse> {
  const params = new URLSearchParams();
  if (status) {
    params.append("status", status);
  }
  const queryString = params.toString();
  const url = queryString
    ? `/coordinator/my-calls?${queryString}`
    : "/coordinator/my-calls";
  return apiClient.get<CoordinatorCallsResponse>(url, true);
}
