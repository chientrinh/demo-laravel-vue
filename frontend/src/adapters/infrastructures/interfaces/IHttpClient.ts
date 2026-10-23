export interface IHttpClient {
  get<T>(url: string, config?: unknown): Promise<{ data: T }>;
  post<T>(url: string, body?: unknown, config?: unknown): Promise<{ data: T }>;
  put<T>(url: string, body?: unknown, config?: unknown): Promise<{ data: T }>;
  patch<T>(url: string, body?: unknown, config?: unknown): Promise<{ data: T }>;
  delete<T>(url: string, config?: unknown): Promise<{ data: T }>;
}