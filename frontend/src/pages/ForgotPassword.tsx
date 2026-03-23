import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const { data } = await authApi.forgotPassword(email);
      if (data && typeof data === 'object' && 'resetToken' in data) {
        const d = data as { resetToken: string; userId: string };
        setMessage(`For development: Use the reset link with token. Redirecting to reset page...`);
        setTimeout(() => {
          window.location.href = `/reset-password?token=${encodeURIComponent(d.resetToken)}&userId=${encodeURIComponent(d.userId)}`;
        }, 1500);
      } else {
        setMessage('If the email exists, a reset link has been sent.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">Forgot password</h2>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}
          {message && (
            <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">{message}</div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </div>
          <div className="text-center text-sm">
            <Link to="/login" className="text-indigo-600 hover:text-indigo-500">Back to sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
