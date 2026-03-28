import { apiClient } from "./api";

export interface ContactMessagePayload {
  name: string;
  email: string;
  message: string;
}

export interface ContactMessageResponse {
  message: string;
}

export async function submitContactMessage(
  payload: ContactMessagePayload
): Promise<ContactMessageResponse> {
  return apiClient.post<ContactMessageResponse>("/contact", payload);
}
