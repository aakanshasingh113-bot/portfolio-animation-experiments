import Link from "next/link";

/** Temporary landing for routes that arrive in Phase 2/3. */
export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[680px] flex-col justify-center gap-4 px-4 py-16 sm:px-6">
      <Link href="/" className="font-mono text-xs uppercase tracking-[0.14em] text-muted hover:text-accent-ink">
        ← Back to the bag
      </Link>
      <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="text-lg text-muted">{note}</p>
    </main>
  );
}
