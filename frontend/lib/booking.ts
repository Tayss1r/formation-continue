/**
 * API functions for availability slots and company bookings
 */

import { API_BASE_URL } from "./config";
import { getAccessToken } from "./api";
import type {
  AvailabilitySlot,
  AvailabilityListResponse,
  AvailabilityWithBookingStatusResponse,
  AvailabilityCreateData,
  AvailabilityUpdateData,
  SlotStatusUpdate,
  SlotConfirmResponse,
  Booking,
  BookingListResponse,
  BookingCreateData,
  BookingUpdateData,
  BookingCreateResponse,
  BookingCancelResponse,
  SlotBookingSummary,
} from "@/types/booking";

const AVAILABILITY_API = `${API_BASE_URL}/availability`;
const BOOKING_API = `${API_BASE_URL}/bookings`;

/**
 * Extract error message from API response
 * Handles both string and object error formats from FastAPI
 */
function extractErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  
  const err = error as Record<string, unknown>;
  
  // Handle our custom error format with "message" field first
  if (typeof err.message === "string") return err.message;
  
  // Handle FastAPI detail field (can be string or array of validation errors)
  if (err.detail) {
    if (typeof err.detail === "string") return err.detail;
    if (Array.isArray(err.detail)) {
      // Validation errors array
      return err.detail
        .map((e: { msg?: string; message?: string }) => e.msg || e.message || "")
        .filter(Boolean)
        .join(", ") || fallback;
    }
    // Object detail with message field
    if (typeof err.detail === "object" && err.detail !== null) {
      const detail = err.detail as Record<string, unknown>;
      if (typeof detail.message === "string") return detail.message;
      return JSON.stringify(err.detail);
    }
  }
  
  return fallback;
}

// ==================== Availability API ====================

/**
 * Get available date slots for a course (public)
 */
export async function getCourseAvailability(
  courseId: number,
  page: number = 1,
  perPage: number = 20,
  onlyBookable: boolean = true
): Promise<AvailabilityListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    only_bookable: onlyBookable.toString(),
  });

  const response = await fetch(
    `${AVAILABILITY_API}/course/${courseId}?${params}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(extractErrorMessage(error, "Failed to fetch availability"));
  }

  return response.json();
}

/**
 * Get ALL availability slots for a course (staff only)
 * Returns all slots regardless of status or deadline
 */
export async function getStaffCourseAvailability(
  courseId: number,
  page: number = 1,
  perPage: number = 20,
  statusFilter?: string
): Promise<AvailabilityListResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required");

  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });
  
  if (statusFilter) {
    params.append("status", statusFilter);
  }

  const response = await fetch(
    `${AVAILABILITY_API}/staff/course/${courseId}?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(extractErrorMessage(error, "Failed to fetch availability"));
  }

  return response.json();
}

/**
 * Get details of a specific availability slot (public)
 */
export async function getAvailabilitySlot(
  slotId: number
): Promise<AvailabilitySlot> {
  const response = await fetch(`${AVAILABILITY_API}/slot/${slotId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(extractErrorMessage(error, "Failed to fetch slot details"));
  }

  return response.json();
}

/**
 * Get available date slots for a course with user's booking status (authenticated)
 * Returns whether the logged-in company has already booked each slot
 */
export async function getCourseAvailabilityWithBookingStatus(
  courseId: number,
  page: number = 1,
  perPage: number = 20,
  onlyBookable: boolean = true
): Promise<AvailabilityWithBookingStatusResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required");

  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
    only_bookable: onlyBookable.toString(),
  });

  const response = await fetch(
    `${AVAILABILITY_API}/course/${courseId}/with-booking-status?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(extractErrorMessage(error, "Failed to fetch availability"));
  }

  return response.json();
}

/**
 * Get staff's availability slots
 */
export async function getStaffAvailabilitySlots(
  page: number = 1,
  perPage: number = 20,
  status?: string
): Promise<AvailabilityListResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required");

  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });
  if (status) params.append("status", status);

  const response = await fetch(`${AVAILABILITY_API}/staff/my-slots?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(extractErrorMessage(error, "Failed to fetch availability slots"));
  }

  return response.json();
}

/**
 * Get slots pending staff review
 */
export async function getPendingReviewSlots(
  page: number = 1,
  perPage: number = 20
): Promise<AvailabilityListResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required");

  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });

  const response = await fetch(
    `${AVAILABILITY_API}/staff/pending-review?${params}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(extractErrorMessage(error, "Failed to fetch pending slots"));
  }

  return response.json();
}

/**
 * Create a new availability slot (staff only)
 */
export async function createAvailabilitySlot(
  data: AvailabilityCreateData
): Promise<AvailabilitySlot> {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required");

  const response = await fetch(AVAILABILITY_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(extractErrorMessage(error, "Failed to create availability slot"));
  }

  return response.json();
}

/**
 * Update an availability slot (staff only)
 */
export async function updateAvailabilitySlot(
  slotId: number,
  data: AvailabilityUpdateData
): Promise<AvailabilitySlot> {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required");

  const response = await fetch(`${AVAILABILITY_API}/slot/${slotId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(extractErrorMessage(error, "Failed to update availability slot"));
  }

  return response.json();
}

/**
 * Delete an availability slot (staff only)
 */
export async function deleteAvailabilitySlot(slotId: number): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required");

  const response = await fetch(`${AVAILABILITY_API}/slot/${slotId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(extractErrorMessage(error, "Failed to delete availability slot"));
  }
}

/**
 * Confirm or cancel an availability slot (staff decision)
 */
export async function confirmOrCancelSlot(
  slotId: number,
  statusOrData: "confirmed" | "cancelled" | SlotStatusUpdate
): Promise<SlotConfirmResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required");

  // Allow passing just the status string for convenience
  const data: SlotStatusUpdate = typeof statusOrData === "string" 
    ? { status: statusOrData } 
    : statusOrData;

  const response = await fetch(`${AVAILABILITY_API}/slot/${slotId}/confirm`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(extractErrorMessage(error, "Failed to update slot status"));
  }

  return response.json();
}

// ==================== Booking API ====================

/**
 * Create a new booking (company only)
 */
export async function createBooking(
  data: BookingCreateData
): Promise<BookingCreateResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required");

  const response = await fetch(BOOKING_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(extractErrorMessage(error, "Failed to create booking"));
  }

  return response.json();
}

/**
 * Get company's bookings
 */
export async function getMyBookings(
  page: number = 1,
  perPage: number = 20,
  status?: string
): Promise<BookingListResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required");

  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });
  if (status) params.append("status_filter", status);

  const response = await fetch(`${BOOKING_API}/my-bookings?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(extractErrorMessage(error, "Failed to fetch bookings"));
  }

  return response.json();
}

/**
 * Get booking details
 */
export async function getBookingDetails(bookingId: number): Promise<Booking> {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required");

  const response = await fetch(`${BOOKING_API}/${bookingId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(extractErrorMessage(error, "Failed to fetch booking details"));
  }

  return response.json();
}

/**
 * Update a booking (company can update notes)
 */
export async function updateBooking(
  bookingId: number,
  data: BookingUpdateData
): Promise<Booking> {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required");

  const response = await fetch(`${BOOKING_API}/${bookingId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(extractErrorMessage(error, "Failed to update booking"));
  }

  return response.json();
}

/**
 * Cancel a booking (company only, before confirmation)
 */
export async function cancelBooking(
  bookingId: number
): Promise<BookingCancelResponse> {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required");

  const response = await fetch(`${BOOKING_API}/${bookingId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(extractErrorMessage(error, "Failed to cancel booking"));
  }

  return response.json();
}

/**
 * Get all bookings for a slot (staff only)
 */
export async function getSlotBookings(
  slotId: number
): Promise<SlotBookingSummary> {
  const token = getAccessToken();
  if (!token) throw new Error("Authentication required");

  const response = await fetch(`${BOOKING_API}/slot/${slotId}/bookings`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(extractErrorMessage(error, "Failed to fetch slot bookings"));
  }

  return response.json();
}
