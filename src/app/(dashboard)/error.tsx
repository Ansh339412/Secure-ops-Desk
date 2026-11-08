'use client';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="panel mx-auto mt-16 max-w-md p-6 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink-soft">
        The page could not be loaded. Your data has not been changed.
      </p>
      <button onClick={reset} className="btn btn-primary mt-4">
        Try again
      </button>
    </div>
  );
}
