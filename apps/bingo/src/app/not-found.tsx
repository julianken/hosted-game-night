import Link from 'next/link';

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
            className="w-24 h-24 mx-auto text-muted-foreground"
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
        <p className="text-lg text-muted-foreground mb-8">
          Let us get you back to the game!
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/play"
            className="px-8 py-4 text-lg font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 focus:ring-4 focus:ring-primary/30 focus:outline-none min-h-[52px] transition-colors inline-flex items-center justify-center"
          >
            Start Playing
          </Link>
          <Link
            href="/"
            className="px-8 py-4 text-lg font-semibold text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:ring-4 focus:ring-gray-300 focus:outline-none min-h-[52px] transition-colors inline-flex items-center justify-center"
          >
            Go to Home
          </Link>
        </div>

        {/* Helpful links */}
        <nav className="mt-10 pt-6 border-t border-gray-200" aria-label="Quick links">
          <p className="text-base text-muted-foreground mb-4">Or try one of these:</p>
          <ul className="flex flex-col gap-2">
            <li>
              <Link
                href="/play"
                className="text-lg text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded px-2 py-1"
              >
                Presenter View (Game Controls)
              </Link>
            </li>
            <li>
              <Link
                href="/display"
                className="text-lg text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded px-2 py-1"
              >
                Audience Display (Big Screen)
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
