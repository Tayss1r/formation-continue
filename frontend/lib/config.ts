// API configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
export const UPLOADS_BASE_URL = process.env.NEXT_PUBLIC_UPLOADS_URL || "http://localhost:8000";

// Build full URL for uploaded images
export function getImageUrl(imagePath?: string): string {
  if (!imagePath) {
    return "/placeholder-course.jpg"; // Fallback image
  }
  // If already a full URL, return as-is
  if (imagePath.startsWith("http")) {
    return imagePath;
  }
  // Build full URL from relative path
  return `${UPLOADS_BASE_URL}/${imagePath}`;
}
