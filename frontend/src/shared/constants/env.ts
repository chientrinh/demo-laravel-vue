export const env = {
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  VITE_USE_MOCK: import.meta.env.VITE_USE_MOCK ?? 'true',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
}