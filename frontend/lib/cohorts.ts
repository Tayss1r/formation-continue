import { apiClient } from "./api";
import type {
  AttendanceBulkUpsertPayload,
  AssignProfessorsPayload,
  AssignProfessorsResponse,
  CohortMaterial,
  CohortMaterialListResponse,
  CohortSession,
  CohortSessionListResponse,
  CohortSessionPayload,
  CohortFormOptionsResponse,
  CohortListResponse,
  CohortProfessor,
  CreateCohortPayload,
  ProfessorAssignedCohortsResponse,
  SessionAttendanceListResponse,
} from "@/types/cohort";

export async function getCoordinatorCohorts(): Promise<CohortListResponse> {
  return apiClient.get<CohortListResponse>("/coordinator/cohorts", true);
}

export async function getCohortFormOptions(): Promise<CohortFormOptionsResponse> {
  return apiClient.get<CohortFormOptionsResponse>("/coordinator/cohorts/form-options", true);
}

export async function createCohort(payload: CreateCohortPayload) {
  return apiClient.post("/coordinator/cohorts", payload, true);
}

export async function getAvailableProfessorsForCohort(
  cohortId: number
): Promise<CohortProfessor[]> {
  return apiClient.get<CohortProfessor[]>(
    `/coordinator/cohorts/${cohortId}/available-professors`,
    true
  );
}

export async function assignProfessorsToCohort(
  cohortId: number,
  payload: AssignProfessorsPayload
): Promise<AssignProfessorsResponse> {
  return apiClient.put<AssignProfessorsResponse>(
    `/coordinator/cohorts/${cohortId}/professors`,
    payload,
    true
  );
}

export async function getProfessorAssignedCohorts(): Promise<ProfessorAssignedCohortsResponse> {
  return apiClient.get<ProfessorAssignedCohortsResponse>("/professor/my-cohorts", true);
}

export async function getProfessorCohortSessions(
  cohortId: number
): Promise<CohortSessionListResponse> {
  return apiClient.get<CohortSessionListResponse>(
    `/professor/my-cohorts/${cohortId}/sessions`,
    true
  );
}

export async function createProfessorCohortSession(
  cohortId: number,
  payload: CohortSessionPayload
): Promise<CohortSession> {
  return apiClient.post<CohortSession>(
    `/professor/my-cohorts/${cohortId}/sessions`,
    payload,
    true
  );
}

export async function updateProfessorCohortSession(
  cohortId: number,
  sessionId: number,
  payload: CohortSessionPayload
): Promise<CohortSession> {
  return apiClient.put<CohortSession>(
    `/professor/my-cohorts/${cohortId}/sessions/${sessionId}`,
    payload,
    true
  );
}

export async function deleteProfessorCohortSession(
  cohortId: number,
  sessionId: number
): Promise<{ message: string; session_id: number }> {
  return apiClient.delete<{ message: string; session_id: number }>(
    `/professor/my-cohorts/${cohortId}/sessions/${sessionId}`,
    true
  );
}

export async function getProfessorCohortMaterials(
  cohortId: number
): Promise<CohortMaterialListResponse> {
  return apiClient.get<CohortMaterialListResponse>(
    `/professor/my-cohorts/${cohortId}/materials`,
    true
  );
}

export async function uploadProfessorCohortMaterial(
  cohortId: number,
  title: string,
  file: File,
  description?: string
): Promise<CohortMaterial> {
  const formData = new FormData();
  formData.append("file", file);

  const params = new URLSearchParams({ title });
  if (description) {
    params.append("description", description);
  }

  return apiClient.post<CohortMaterial>(
    `/professor/my-cohorts/${cohortId}/materials?${params.toString()}`,
    formData,
    true
  );
}

export async function getProfessorSessionAttendance(
  cohortId: number,
  sessionId: number
): Promise<SessionAttendanceListResponse> {
  return apiClient.get<SessionAttendanceListResponse>(
    `/professor/my-cohorts/${cohortId}/sessions/${sessionId}/attendance`,
    true
  );
}

export async function markProfessorSessionAttendance(
  cohortId: number,
  sessionId: number,
  payload: AttendanceBulkUpsertPayload
): Promise<SessionAttendanceListResponse> {
  return apiClient.put<SessionAttendanceListResponse>(
    `/professor/my-cohorts/${cohortId}/sessions/${sessionId}/attendance`,
    payload,
    true
  );
}
