import { createFileRoute, Link } from '@tanstack/react-router';
import { z } from 'zod';
import { AuthForm } from '@/components/auth-form';
import { PageHeader, Container } from '@/components/page-shell';
import { pageMeta } from '@/lib/queries';
export const Route = createFileRoute('/signup')({ validateSearch: z.object({ next: z.string().optional() }), head: () => pageMeta('Create account','Create an account to order maths worksheets and track your purchases.'), component: Signup });
function Signup() { const { next } = Route.useSearch(); return <main><PageHeader eyebrow="Start something wonderful" title="Every expert was once a beginner." /><Container className="max-w-md py-10"><AuthForm mode="signup" next={next} /><p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link to="/login" search={{ next }} className="text-primary">Sign in</Link></p></Container></main>; }
