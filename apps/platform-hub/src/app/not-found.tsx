import Link from 'next/link';

// Force dynamic rendering since we use AuthProvider in layout
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50"
      role="main"
      aria-labelledby="not-found-title"
    >
      <div className="max-w-md text-center">
        {/* 404 Icon */}
        <div className="mb-6">
          <svg
            className="w-24 h-24 mx-auto text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" fill="#f3f4f6" stroke="#9ca3af" strokeWidth="2" />
            <path
              d="M9 9l6 6m0-6l-6 6"
              stroke="#6b7280"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Title */}
        <h1
          id="not-found-title"
          className="text-4xl font-bold text-gray-800 mb-4"
        >
          Page Not Found
        </h1>

        {/* Message */}
        <p className="text-xl text-gray-600 mb-6 leading-relaxed">
          We could not find the page you were looking for.
          It may have been moved or no longer exists.
        </p>

        {/* Help text */}
        <p className="text-lg text-gray-500 mb-8">
          Let us get you back to the games!
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-8 py-4 text-lg font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 focus:outline-none min-h-[52px] transition-colors inline-flex items-center justify-center"
          >
            Browse Games
          </Link>
        </div>

        {/* Game links */}
        <nav className="mt-10 pt-6 border-t border-gray-200" aria-label="Available games">
          <p className="text-base text-gray-500 mb-4">Or jump directly to a game:</p>
          <ul className="flex flex-col gap-2">
            <li>
              <a
                href="http://localhost:3000"
                className="text-lg text-indigo-600 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
              >
                Beak Bingo
              </a>
            </li>
            <li>
              <a
                href="http://localhost:3001"
                className="text-lg text-indigo-600 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1"
              >
                Trivia Night
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
