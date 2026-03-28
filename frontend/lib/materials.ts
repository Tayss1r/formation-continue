import { apiClient, API_BASE_URL, getAccessToken, refreshAccessToken } from "./api";

export interface CourseMaterial {
  id: number;
  title: string;
  description: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by_name: string;
  course_id?: number;
  course_title?: string;
  created_at?: string;
}

export interface MaterialListResponse {
  materials: CourseMaterial[];
  total: number;
}

/**
 * Get all materials available to the current employee (from all enrolled courses)
 */
export async function getEmployeeMaterials(): Promise<MaterialListResponse> {
  return apiClient.get<MaterialListResponse>("/materials/my-materials", true);
}

/**
 * Get materials for a specific course the employee is enrolled in
 */
export async function getCourseMaterialsForEmployee(
  courseId: number
): Promise<MaterialListResponse> {
  return apiClient.get<MaterialListResponse>(
    `/materials/course/${courseId}/materials`,
    true
  );
}

/**
 * Generate download URL for a material (requires auth token in header)
 */
export function getMaterialDownloadUrl(materialId: number): string {
  return `${API_BASE_URL}/materials/download/${materialId}`;
}

/**
 * Download a material with authentication
 * Uses fetch with auth headers and creates a blob download
 */
export async function downloadMaterial(materialId: number, fileName?: string): Promise<void> {
  const url = getMaterialDownloadUrl(materialId);

  let token = getAccessToken();
  if (!token) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      throw new Error("Not authenticated");
    }
    token = getAccessToken();
  }

  let response = await fetch(url, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });

  // Retry once if token is expired.
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) {
      throw new Error("Not authenticated");
    }
    token = getAccessToken();
    response = await fetch(url, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Download error:", response.status, errorText);
    throw new Error("Failed to download material");
  }
  
  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = fileName || "download";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}
