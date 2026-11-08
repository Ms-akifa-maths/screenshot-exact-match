import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { Button } from './ui/button';
export function StoreError({ error }: ErrorComponentProps) {
  const router = useRouter();
  return <main className="mx-auto min-h-[65vh] max-w-xl px-5 pt-40"><h1 className="text-3xl">We couldn't load this page</h1><p role="alert" className="my-5 text-muted-foreground">{error.message}</p><Button onClick={() => router.invalidate()}>Try again</Button></main>;
}
export function StoreNotFound() { return <main className="mx-auto min-h-[65vh] max-w-xl px-5 pt-40"><h1 className="text-3xl">Worksheet not found</h1><p className="mt-4 text-muted-foreground">This worksheet may no longer be available.</p></main>; }
export function StorePending() { return <div className="mx-auto min-h-[65vh] max-w-6xl px-5 pt-40" role="status">Loading your worksheets…</div>; }
