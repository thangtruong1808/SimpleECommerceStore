import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { logout, setCredentials } from '../store/authSlice';
import { authApi } from '../api/auth';

export function UserProfile() {
  const { user, isAuthenticated, accessToken } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastLoadedTokenRef = useRef<string | null>(null);

  const firstInitial = user?.firstName?.trim().charAt(0).toUpperCase() ?? '';
  const lastInitial = user?.lastName?.trim().charAt(0).toUpperCase() ?? '';
  const initials = `${firstInitial}${lastInitial}` || 'NA';

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Always refresh profile once per token so role/name/email updates in DB reflect immediately.
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    if (lastLoadedTokenRef.current === accessToken) return;
    lastLoadedTokenRef.current = accessToken;

    authApi
      .getMe()
      .then((res) => {
        dispatch(setCredentials({ user: res.data, accessToken }));
      })
      .catch(() => {
        dispatch(logout());
        setIsOpen(false);
      });
  }, [accessToken, dispatch, isAuthenticated]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      dispatch(logout());
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1 h-8 rounded-full pl-2 pr-1 bg-indigo-600 text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Open user profile"
      >
        <span className="h-6 w-6 rounded-full bg-indigo-500 text-white text-[10px] font-semibold flex items-center justify-center">
          {initials}
        </span>
        <span className="text-[10px] leading-none pr-1">{isOpen ? '▴' : '▾'}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-max min-w-[16rem] max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white shadow-lg z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">User Profile</p>
          </div>
          <div className="px-4 py-3 space-y-2 text-sm">
            <div className="grid grid-cols-[90px_1fr] gap-2">
              <span className="text-gray-500">Role:</span>
              <span className="text-gray-800 break-words">{user?.roles?.join(', ') || 'Customer'}</span>
            </div>
            <div className="grid grid-cols-[90px_1fr] gap-2">
              <span className="text-gray-500">Email:</span>
              <span className="text-gray-800 break-all">{user?.email ?? 'N/A'}</span>
            </div>
            <div className="grid grid-cols-[90px_1fr] gap-2">
              <span className="text-gray-500">Firstname:</span>
              <span className="text-gray-800 break-words">{user?.firstName?.trim() || 'N/A'}</span>
            </div>
            <div className="grid grid-cols-[90px_1fr] gap-2">
              <span className="text-gray-500">Lastname:</span>
              <span className="text-gray-800 break-words">{user?.lastName?.trim() || 'N/A'}</span>
            </div>
            <div className="grid grid-cols-[90px_1fr] gap-2">
              <span className="text-gray-500">User ID:</span>
              <span className="text-gray-700 break-all text-xs">{user?.id ?? 'N/A'}</span>
            </div>
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <button
              onClick={handleLogout}
              className="w-full rounded-md bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
