import { createFileRoute } from '@tanstack/react-router';
import { AuthForm } from '@/components/auth-form';
import { PageHeader, Container } from '@/components/page-shell';
import { pageMeta } from '@/lib/queries';
export const Route = createFileRoute('/admin-login')({ head: () => pageMeta('Admin sign in','Secure administrator access for managing worksheets, orders and payments.'), component: () => <main><PageHeader eyebrow="Administrator access" title="Manage the collection." /><Container className="max-w-md py-10"><AuthForm mode="login" admin /><p className="mt-5 text-xs text-muted-foreground">Admin access is checked securely from your account role.</p></Container></main> });
