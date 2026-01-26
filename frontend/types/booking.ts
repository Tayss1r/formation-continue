// Availability and Booking types matching backend schemas

export type AvailabilityStatus = "open" | "pending_review" | "confirmed" | "cancelled";
export type BookingStatus = "reserved" | "confirmed" | "cancelled";

// ==================== Availability Types ====================

export interface AvailabilityCourseInfo {
  id: number;
  title: string;
  price: number;
  duration_hours?: number;
}

export interface AvailabilitySlot {
  id: number;
  course_id: number;
  start_date: string;
  end_date: string;
  schedule?: string;
  max_seats: number;
  min_seats: number;
  reserved_seats: number;
  remaining_seats: number;
  booking_deadline: string;
  status: AvailabilityStatus;
  created_at?: string;
  updated_at?: string;
  course?: AvailabilityCourseInfo;
}

export interface AvailabilityListResponse {
  slots: AvailabilitySlot[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// Availability slot with user's booking status
export interface AvailabilitySlotWithBookingStatus extends AvailabilitySlot {
  user_booking_id?: number;
  user_booking_status?: BookingStatus;
}

export interface AvailabilityWithBookingStatusResponse {
  slots: AvailabilitySlotWithBookingStatus[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface AvailabilityCreateData {
  course_id: number;
  start_date: string;
  end_date: string;
  schedule?: string;
  max_seats: number;
  min_seats?: number;
  booking_deadline: string;
}

// Alias for consistency
export type CreateAvailabilityRequest = AvailabilityCreateData;

export interface AvailabilityUpdateData {
  start_date?: string;
  end_date?: string;
  schedule?: string;
  max_seats?: number;
  min_seats?: number;
  booking_deadline?: string;
}

// Alias for consistency
export type UpdateAvailabilityRequest = AvailabilityUpdateData;

export interface SlotStatusUpdate {
  status: "confirmed" | "cancelled";
  staff_notes?: string;
}

export interface SlotConfirmResponse {
  message: string;
  slot_id: number;
  status: AvailabilityStatus;
  affected_bookings: number;
}

// ==================== Booking Types ====================

export interface BookingCompanyInfo {
  id: number;
  company_name: string;
  email: string;
  phone?: string;
  industry_sector?: string;
}

export interface BookingSlotInfo {
  id: number;
  start_date: string;
  end_date: string;
  schedule?: string;
  status: string;
}

export interface BookingCourseInfo {
  id: number;
  title: string;
  price: number;
}

export interface Booking {
  id: number;
  company_id: number;
  availability_slot_id: number;
  employee_count: number;
  status: BookingStatus;
  notes?: string;
  staff_notes?: string;
  created_at: string;
  updated_at: string;
  company?: BookingCompanyInfo;
  availability_slot?: BookingSlotInfo;
  course?: BookingCourseInfo;
}

export interface BookingListItem {
  id: number;
  company_id: number;
  availability_slot_id: number;
  employee_count: number;
  status: BookingStatus;
  created_at: string;
  company?: BookingCompanyInfo;
}

export interface BookingListResponse {
  bookings: BookingListItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface BookingCreateData {
  availability_slot_id: number;
  employee_count: number;
  notes?: string;
}

export interface BookingUpdateData {
  notes?: string;
}

export interface BookingCreateResponse {
  message: string;
  booking: Booking;
}

export interface BookingCancelResponse {
  message: string;
  booking_id: number;
  seats_released: number;
}

export interface SlotBookingSummary {
  slot_id: number;
  slot_status: AvailabilityStatus;
  start_date: string;
  end_date: string;
  booking_deadline: string;
  total_reserved: number;
  max_seats: number;
  min_seats: number;
  remaining_seats: number;
  booking_count: number;
  bookings: Booking[];
  is_above_minimum: boolean;
  deadline_passed: boolean;
}
