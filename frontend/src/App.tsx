import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { useAppDispatch, useAppSelector } from './hooks/redux';
import { setCredentials, setLoading } from './store/authSlice';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Products } from './pages/Products';
import { Dashboard } from './pages/Dashboard';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { authApi } from './api/auth';
import './App.css';

const REFRESH_MARKER_COOKIE = 'hasRefreshToken=1';

function AppRoutes() {
  const dispatch = useAppDispatch();
  const { isLoading, isAuthenticated } = useAppSelector((state) => state.auth);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initAuth = async () => {
      if (isAuthenticated) {
        dispatch(setLoading(false));
        return;
      }

      if (!document.cookie.includes(REFRESH_MARKER_COOKIE)) {
        dispatch(setLoading(false));
        return;
      }

      try {
        const { data } = await authApi.refresh();
        dispatch(setCredentials({ user: data.user, accessToken: data.accessToken }));
      } catch {
        // No valid session
      } finally {
        dispatch(setLoading(false));
      }
    };
    initAuth();
  }, [dispatch, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm text-gray-700">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRoles={['Admin']}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
