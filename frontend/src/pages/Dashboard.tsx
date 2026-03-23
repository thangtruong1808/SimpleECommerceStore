import { useAppSelector } from '../hooks/redux';

export function Dashboard() {
  const { user } = useAppSelector((state) => state.auth);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600 mb-8">This page is protected and available only for Admin users.</p>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Signed in as:</span> {user?.email}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Roles:</span> {user?.roles?.join(', ') || 'N/A'}
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Name:</span>{' '}
            {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'N/A'}
          </p>
        </div>
      </main>
    </div>
  );
}
