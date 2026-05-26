import { notFound } from 'next/navigation';

// Marker page used to exercise the step 4(j) PR-media capture pipeline
// (Playwright screenshot + recorded video → @vercel/blob upload → inline
// render in PR markdown). Gated to non-production environments so it
// never appears on the live site.
export default function PrMediaTestPage() {
  if (process.env.VERCEL_ENV === 'production') notFound();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-zinc-50 p-8 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="rounded-xl border border-zinc-200 bg-white px-6 py-5 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs uppercase tracking-wide text-zinc-500">pr-media capture target</p>
        <p className="mt-1 text-lg font-semibold">blob test v5</p>
        <p className="mt-3 max-w-sm text-xs text-zinc-500">
          Non-prod test surface for the PR-media pipeline. Returns 404 in production.
        </p>
      </div>
    </main>
  );
}
