import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { adminOptions, pageMeta } from '@/lib/queries';
import { PageHeader, Container } from '@/components/page-shell';
import { StatusBadge } from '@/components/status-badge';
import { StoreError, StoreNotFound, StorePending } from '@/components/load-state';

export const Route = createFileRoute('/_authenticated/admin')({
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(adminOptions); },
  head: () => pageMeta('Administration', 'Axiom worksheet inventory and order overview.'),
  component: Admin, errorComponent: StoreError, notFoundComponent: StoreNotFound, pendingComponent: StorePending,
});
function Admin() {
  const { data } = useSuspenseQuery(adminOptions);
  return <main><PageHeader eyebrow="Administration" title="Store overview" /><Container className="py-10"><div className="flex flex-wrap gap-8 border-b border-border pb-8"><p>{data.products.length} worksheets</p><p>{data.orders.length} orders</p><p>{data.profiles.length} customers</p></div><h2 className="mt-8 text-3xl">Orders</h2>{data.orders.length === 0 ? <p className="mt-6 text-muted-foreground">No orders yet.</p> : data.orders.map(order => <article key={order.id} className="flex flex-wrap justify-between gap-4 border-b border-border py-6"><h3>{order.order_number}</h3><p>{order.customer_name}</p><StatusBadge status={order.status} /></article>)}</Container></main>;
}