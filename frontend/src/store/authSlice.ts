import { createSlice } from '@reduxjs/toolkit';

export interface UserInfo {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  roles: string[];
}

interface AuthState {
  user: UserInfo | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  pendingRequests: number;
}

const AUTH_STORAGE_KEY = 'se_store_auth';

function loadPersistedAuth(): Pick<AuthState, 'user' | 'accessToken' | 'isAuthenticated'> {
  if (typeof window === 'undefined') {
    return { user: null, accessToken: null, isAuthenticated: false };
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return { user: null, accessToken: null, isAuthenticated: false };
    }

    const parsed = JSON.parse(raw) as { user: UserInfo; accessToken: string };
    if (!parsed?.user || !parsed?.accessToken) {
      return { user: null, accessToken: null, isAuthenticated: false };
    }

    return {
      user: parsed.user,
      accessToken: parsed.accessToken,
      isAuthenticated: true,
    };
  } catch {
    return { user: null, accessToken: null, isAuthenticated: false };
  }
}

function persistAuth(user: UserInfo, accessToken: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, accessToken }));
}

function clearPersistedAuth() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

const persistedAuth = loadPersistedAuth();

const initialState: AuthState = {
  user: persistedAuth.user,
  accessToken: persistedAuth.accessToken,
  isAuthenticated: persistedAuth.isAuthenticated,
  isLoading: true,
  isRefreshing: false,
  pendingRequests: 0,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: { payload: { user: UserInfo; accessToken: string } }) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      state.isLoading = false;
      persistAuth(action.payload.user, action.payload.accessToken);
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      clearPersistedAuth();
    },
    setLoading: (state, action: { payload: boolean }) => {
      state.isLoading = action.payload;
    },
    setRefreshing: (state, action: { payload: boolean }) => {
      state.isRefreshing = action.payload;
    },
    beginRequest: (state) => {
      state.pendingRequests += 1;
    },
    endRequest: (state) => {
      state.pendingRequests = Math.max(0, state.pendingRequests - 1);
    },
  },
});

export const { setCredentials, logout, setLoading, setRefreshing, beginRequest, endRequest } = authSlice.actions;
export default authSlice.reducer;
