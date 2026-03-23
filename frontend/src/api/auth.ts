import { apiClient } from './client';

export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    roles: string[];
  };
}

export interface UserInfo {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  roles: string[];
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { email, password }),

  register: (email: string, password: string, firstName?: string, lastName?: string) =>
    apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
      firstName: firstName || null,
      lastName: lastName || null,
    }),

  refresh: () =>
    apiClient.post<AuthResponse>('/auth/refresh'),

  logout: () => apiClient.post('/auth/logout'),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, userId: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, userId, newPassword }),

  getMe: () => apiClient.get<UserInfo>('/auth/me'),
};
