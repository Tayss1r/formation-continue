import { API_BASE_URL } from "./config";

// Re-export for convenience
export { API_BASE_URL };

// Types
export interface ApiError {
  message: string;
  error_code?: string;
  resolution?: string;
}

export interface AuthUser {
  email: string;
  uid: string;
  role: string;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface LoginResponse {
  message: string;
  access_token: string;
  user: AuthUser;
}

export interface SignupResponse {
  message: string;
  user: AuthUser;
}

export interface SignupData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: "staff" | "company" | "professor" | "employee";
  // Company fields
  company_name?: string;
  company_sector?: string;
  // Professor fields
  field_of_study?: string;
  institution?: string;
}

export interface RefreshResponse {
  access_token: string;
}

// Token management (in-memory for access token)
let accessToken: string | null = null;
let tokenRefreshPromise: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}

// API client with automatic token refresh
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async refreshToken(): Promise<string | null> {
    // Prevent multiple simultaneous refresh attempts
    if (tokenRefreshPromise) {
      return tokenRefreshPromise;
    }

    tokenRefreshPromise = this.doRefreshToken();
    const result = await tokenRefreshPromise;
    tokenRefreshPromise = null;
    return result;
  }

  private async doRefreshToken(): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include", // Include cookies
      });

      if (!response.ok) {
        clearAccessToken();
        return null;
      }

      const data: RefreshResponse = await response.json();
      setAccessToken(data.access_token);
      return data.access_token;
    } catch (error) {
      console.error("Token refresh failed:", error);
      clearAccessToken();
      return null;
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requireAuth = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      ...(options.headers || {}),
    };

    // Add auth header if we have a token
    if (accessToken) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${accessToken}`;
    }

    // Don't set Content-Type for FormData (browser sets it automatically with boundary)
    if (!(options.body instanceof FormData)) {
      (headers as Record<string, string>)["Content-Type"] = "application/json";
    }

    let response = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // Always include cookies for refresh token
    });

    // Handle 401 - try to refresh token
    if (response.status === 401 && accessToken) {
      const newToken = await this.refreshToken();
      
      if (newToken) {
        // Retry with new token
        (headers as Record<string, string>)["Authorization"] = `Bearer ${newToken}`;
        response = await fetch(url, {
          ...options,
          headers,
          credentials: "include",
        });
      } else if (requireAuth) {
        // Redirect to login if auth required and refresh failed
        window.location.href = "/login";
        throw new Error("Authentication required");
      }
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      
      // Build a proper ApiError with message
      let message = "An error occurred";
      
      if (errorBody.message) {
        message = errorBody.message;
      } else if (errorBody.detail) {
        // Handle FastAPI validation errors (422)
        if (Array.isArray(errorBody.detail)) {
          message = errorBody.detail
            .map((d: { msg?: string; loc?: string[] }) => {
              const field = d.loc ? d.loc[d.loc.length - 1] : '';
              return field ? `${field}: ${d.msg}` : d.msg;
            })
            .filter(Boolean)
            .join('; ');
        } else if (typeof errorBody.detail === 'string') {
          message = errorBody.detail;
        }
      }
      
      const error: ApiError = { message, ...errorBody };
      throw error;
    }

    // Handle empty responses (e.g. 204 No Content from DELETE)
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return {} as T;
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }
    
    return {} as T;
  }

  // Convenience methods
  async get<T>(endpoint: string, requireAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" }, requireAuth);
  }

  async post<T>(endpoint: string, body?: unknown, requireAuth = false): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "POST",
        body: body instanceof FormData ? body : JSON.stringify(body),
      },
      requireAuth
    );
  }

  async put<T>(endpoint: string, body?: unknown, requireAuth = false): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "PUT",
        body: body instanceof FormData ? body : JSON.stringify(body),
      },
      requireAuth
    );
  }

  async delete<T>(endpoint: string, requireAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" }, requireAuth);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Auth-specific functions
export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/auth/login", {
    email,
    password,
  });
  
  // Store access token in memory
  setAccessToken(response.access_token);
  
  return response;
}

export async function signup(data: SignupData): Promise<SignupResponse> {
  const response = await apiClient.post<SignupResponse>("/auth/signup", data);
  return response;
}

export async function verifyEmail(email: string, code: string): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>("/auth/verify-email-code", {
    email,
    code,
  });
}

export async function sendVerificationCode(email: string): Promise<{ message: string }> {
  return apiClient.post<{ message: string }>("/auth/send-verification-code", {
    email,
  });
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post("/auth/logout", {}, true);
  } finally {
    clearAccessToken();
  }
}

export async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      return false;
    }

    const data: RefreshResponse = await response.json();
    setAccessToken(data.access_token);
    return true;
  } catch {
    return false;
  }
}

// Check if user is authenticated (has valid access token or can refresh)
export async function checkAuth(): Promise<AuthUser | null> {
  // If we have an access token, try to get user info
  if (accessToken) {
    try {
      const response = await apiClient.get<{ user: AuthUser }>("/auth/me", true);
      return response.user;
    } catch {
      // Token might be expired, try refresh
    }
  }

  // Try to refresh token
  const refreshed = await refreshAccessToken();
  if (refreshed) {
    try {
      const response = await apiClient.get<{ user: AuthUser }>("/auth/me", true);
      return response.user;
    } catch {
      return null;
    }
  }

  return null;
}
