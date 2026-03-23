import axios from 'axios';
import { store } from '../store/store';
import { beginRequest, endRequest, logout, setCredentials, setRefreshing } from '../store/authSlice';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  (config as { __tracked?: boolean }).__tracked = true;
  store.dispatch(beginRequest());
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if ((response.config as { __tracked?: boolean }).__tracked) {
      store.dispatch(endRequest());
      (response.config as { __tracked?: boolean }).__tracked = false;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (originalRequest && (originalRequest as { __tracked?: boolean }).__tracked) {
      store.dispatch(endRequest());
      (originalRequest as { __tracked?: boolean }).__tracked = false;
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;
      store.dispatch(setRefreshing(true));

      try {
        const response = await axios.post(baseURL + '/auth/refresh', {}, { withCredentials: true });
        const { accessToken, user } = response.data;
        store.dispatch(setCredentials({ user, accessToken }));
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        store.dispatch(logout());
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
        store.dispatch(setRefreshing(false));
      }
    }

    return Promise.reject(error);
  }
);
