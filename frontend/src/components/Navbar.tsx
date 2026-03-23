import { UserProfile } from './UserProfile';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';

export function Navbar() {
  const { user, isAuthenticated, isRefreshing, pendingRequests } = useAppSelector((state) => state.auth);
  const isAdmin = user?.roles?.includes('Admin');

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-bold text-gray-900">
            Simple E-Commerce Store
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/" className="text-gray-700 hover:text-indigo-600">
              Home
            </Link>
            <Link to="/products" className="text-gray-700 hover:text-indigo-600">
              Products
            </Link>
            {isAuthenticated && isAdmin && (
              <Link to="/dashboard" className="text-gray-700 hover:text-indigo-600">
                Dashboard
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              {(isRefreshing || pendingRequests > 0) && (
                <span className="ml-2 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-700 shadow-sm">
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                  Loading...
                </span>
              )}
              <UserProfile />
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-500">
                Sign in
              </Link>
              <Link to="/register" className="text-sm text-indigo-600 hover:text-indigo-500">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
