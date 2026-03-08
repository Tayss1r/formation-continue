import { apiClient } from "./api";
import { API_BASE_URL } from "./config";

export interface NewsItem {
  id: number;
  title: string;
  excerpt: string | null;
  content?: string;
  image_path: string | null;
  is_featured: boolean;
  is_published?: boolean;
  published_at: string;
  created_at?: string;
  updated_at?: string;
  author: string;
}

export interface NewsListResponse {
  news: NewsItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface CreateNewsData {
  title: string;
  content: string;
  excerpt?: string;
  is_published: boolean;
  is_featured: boolean;
}

// ========================
// PUBLIC (no auth needed — use simple fetch to avoid CORS credential issues)
// ========================

export async function getPublicNews(
  page: number = 1,
  perPage: number = 6,
  featuredOnly: boolean = false
): Promise<NewsListResponse> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });
  
  if (featuredOnly) {
    params.append("featured_only", "true");
  }

  const response = await fetch(
    `${API_BASE_URL}/news/public?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch news: ${response.status}`);
  }

  return response.json();
}

export async function getNewsDetails(newsId: number): Promise<NewsItem> {
  const response = await fetch(`${API_BASE_URL}/news/public/${newsId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch news details: ${response.status}`);
  }

  return response.json();
}

// ========================
// STAFF CRUD
// ========================

export async function getStaffNews(
  page: number = 1,
  perPage: number = 10
): Promise<NewsListResponse> {
  return apiClient.get<NewsListResponse>(
    `/news/staff/list?page=${page}&per_page=${perPage}`,
    true
  );
}

export async function createNews(data: CreateNewsData): Promise<NewsItem> {
  return apiClient.post<NewsItem>("/news/staff/create-json", data, true);
}

export async function updateNews(
  newsId: number,
  data: Partial<CreateNewsData>
): Promise<NewsItem> {
  return apiClient.put<NewsItem>(`/news/staff/${newsId}`, data, true);
}

export async function deleteNews(newsId: number): Promise<void> {
  return apiClient.delete(`/news/staff/${newsId}`, true);
}
