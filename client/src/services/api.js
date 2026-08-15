// Support both VITE_API_BASE_URL and VITE_API_URL, automatically normalize trailing slash or /api
const rawUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
export const API_BASE_URL = rawUrl ? rawUrl.replace(/\/api\/?$/, '').replace(/\/$/, '') : (typeof window !== 'undefined' ? '' : 'http://localhost:5000');
