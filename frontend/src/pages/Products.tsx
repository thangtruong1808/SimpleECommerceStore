export function Products() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Products</h1>
        <p className="text-gray-600 mb-8">
          This is a public products page for testing navigation and authentication flows.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { id: 1, name: 'Wireless Mouse', price: '$24.99' },
            { id: 2, name: 'Mechanical Keyboard', price: '$79.99' },
            { id: 3, name: 'USB-C Hub', price: '$39.99' },
          ].map((product) => (
            <article key={product.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">{product.name}</h2>
              <p className="mt-2 text-indigo-600 font-medium">{product.price}</p>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
