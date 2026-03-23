import { useAppSelector } from '../hooks/redux';

export function Home() {
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome</h2>
        <p className="text-gray-600">
          {isAuthenticated
            ? `You are logged in as ${user?.email}.`
            : 'Sign in or create an account to get started.'}
        </p>
      </main>
    </div>
  );
}
