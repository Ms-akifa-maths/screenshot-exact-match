import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { catalogOptions, pageMeta } from '@/lib/queries';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/store';
import { PageHeader, Container } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { StoreError, StoreNotFound, StorePending } from '@/components/load-state';

export const Route = createFileRoute('/_authenticated/checkout')({
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(catalogOptions); },
  head: () => pageMeta('Checkout', 'Review your Axiom worksheet purchase and payment details.'),
  component: Checkout, errorComponent: StoreError, notFoundComponent: StoreNotFound, pendingComponent: StorePending,
});
function Checkout() {
  const { data } = useSuspenseQuery(catalogOptions);
  const cart = useCart();
  const products = data.products.filter(product => cart.has(product.id));
  return <main><PageHeader eyebrow="Checkout" title="Your worksheet order" /><Container className="max-w-2xl py-10">{!cart.ready ? <p>Loading your cart…</p> : products.length === 0 ? <><p>Your cart is empty.</p><Button asChild className="mt-6"><Link to="/store">Explore worksheets</Link></Button></> : <>{products.map(product => <div key={product.id} className="flex justify-between gap-4 border-b border-border py-5"><p>{product.title}</p><p>{formatPrice(product.price)}</p></div>)}<p className="mt-6 text-xl">Total: {formatPrice(products.reduce((sum, product) => sum + product.price, 0))}</p><p role="status" className="mt-6 text-muted-foreground">Ordering is not available yet. No payment has been taken.</p></>}</Container></main>;
}