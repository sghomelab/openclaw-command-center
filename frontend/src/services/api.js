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
    // On auth errors (401/403) or not found (404), return empty data
    // instead of crashing the page. Pages use .then(r => setX(r.data)).
    if (err.response?.status === 401 || err.response?.status === 403) {
      if (window.location.hash === '#/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      return Promise.resolve({ data: {}, status: 200 });
    }
    if (err.response?.status === 404) {
      return Promise.resolve({ data: {}, status: 200 });
    }
    return Promise.reject(err);
  }
);

export default api;
