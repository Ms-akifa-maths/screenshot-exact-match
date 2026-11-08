import { createFileRoute, Link } from '@tanstack/react-router';
import { z } from 'zod';
import { AuthForm } from '@/components/auth-form';
import { PageHeader, Container } from '@/components/page-shell';
import { pageMeta } from '@/lib/queries';
export const Route = createFileRoute('/login')({ validateSearch: z.object({ next: z.string().optional() }), head: () => pageMeta('Sign in','Sign in to view your worksheet orders, payment status and downloads.'), component: Login });
function Login() { const { next } = Route.useSearch(); return <main><PageHeader eyebrow="Welcome back" title="Ready for the next page?" /><Container className="max-w-md py-10"><AuthForm mode="login" next={next} /><p className="mt-6 text-center text-sm text-muted-foreground">New to Axiom? <Link to="/signup" search={{ next }} className="text-primary">Create an account</Link></p></Container></main>; }
