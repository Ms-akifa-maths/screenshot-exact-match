import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { accountOptions, pageMeta } from '@/lib/queries';
import { PageHeader, Container } from '@/components/page-shell';
import { StatusBadge } from '@/components/status-badge';
import { formatPrice } from '@/lib/store';
import { StoreError, StoreNotFound, StorePending } from '@/components/load-state';

export const Route = createFileRoute('/_authenticated/account')({
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(accountOptions); },
  head: () => pageMeta('Your account', 'Your Axiom worksheet orders and payment status.'),
  component: Account, errorComponent: StoreError, notFoundComponent: StoreNotFound, pendingComponent: StorePending,
});
function Account() {
  const { data } = useSuspenseQuery(accountOptions);
  return <main><PageHeader eyebrow="Your account" title={data.profile.name || 'Your worksheets'} /><Container className="py-10"><h2 className="text-3xl">Orders</h2>{data.orders.length === 0 ? <p className="mt-6 text-muted-foreground">No orders yet.</p> : data.orders.map(order => <article key={order.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-6"><h3>{order.order_number}</h3><StatusBadge status={order.status} /><p>{formatPrice(order.total_amount)}</p></article>)}</Container></main>;
}