import axios from 'axios';

const api = axios.create({
  baseURL: '/v3',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // Never suppress errors for auth endpoints — login/refresh need real errors
    if (err.config?.url?.includes('/auth/')) {
      return Promise.reject(err);
    }

    // For other endpoints, suppress auth errors gracefully so pages don't crash
    if (err.response?.status === 401 || err.response?.status === 403) {
      return Promise.resolve({ data: {}, status: 200 });
    }
    if (err.response?.status === 404) {
      return Promise.resolve({ data: {}, status: 200 });
    }
    return Promise.reject(err);
  }
);

export default api;
