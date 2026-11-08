import { createFileRoute, Link, notFound, useNavigate } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, ShoppingBag, Zap, FileText } from 'lucide-react';
import { catalogOptions, pageMeta } from '@/lib/queries';
import { Container } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product-card';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/store';
import { StoreError, StoreNotFound, StorePending } from '@/components/load-state';
export const Route = createFileRoute('/store/$slug')({
  loader: async ({ context, params }) => { const data = await context.queryClient.ensureQueryData(catalogOptions); const product = data.products.find(p => p.slug === params.slug); if(!product) throw notFound(); return product; },
  head: ({ loaderData }) => pageMeta(loaderData?.title ?? 'Worksheet unavailable', loaderData?.short_description ?? 'This worksheet is unavailable.'),
  component: Details, errorComponent: StoreError, notFoundComponent: StoreNotFound, pendingComponent: StorePending,
});
function Details() {
  const { data } = useSuspenseQuery(catalogOptions);
  const { slug } = Route.useParams();
  const p = data.products.find(p => p.slug === slug);
  const cart = useCart(); const navigate = useNavigate();
  if(!p) return <StoreNotFound />;
  return <main><Container className="pt-32"><Button asChild variant="link" className="mb-6 px-0"><Link to="/store"><ArrowLeft /> All worksheets</Link></Button><div className="grid gap-10 lg:grid-cols-2"><div><img src={p.image_url ?? undefined} alt={`Preview of ${p.title}`} className="aspect-square w-full rounded-lg bg-paper object-cover" /><p className="mt-3 text-center font-mono text-xs text-muted-foreground">Preview only · Full worksheet supplied after payment verification</p></div><div className="py-3"><p className="font-mono text-xs text-accent uppercase">{p.category} · {p.grade} · {p.difficulty}</p><h1 className="mt-4 text-4xl leading-tight md:text-5xl">{p.title}</h1><p className="mt-5 text-lg text-muted-foreground">{p.short_description}</p><p className="mt-6 font-display text-4xl text-primary">{formatPrice(p.price)}</p><div className="mt-6 flex flex-wrap gap-3"><Button size="lg" disabled={cart.has(p.id)} onClick={() => cart.add(p.id,p.title)}><ShoppingBag />{cart.has(p.id) ? 'In your cart' : 'Add to cart'}</Button><Button size="lg" variant="outline" onClick={async () => { await cart.add(p.id,p.title); navigate({ to:'/checkout' }); }}><Zap /> Buy now</Button></div><div className="mt-8 border-t border-border pt-6"><h2 className="text-2xl">What's inside</h2><ul className="mt-4 grid gap-3">{p.includes.map(i => <li key={i} className="flex items-center gap-3 text-sm"><Check className="size-4 text-accent" />{i}</li>)}</ul></div><div className="mt-7 flex gap-3 text-sm text-muted-foreground"><FileText className="size-5 shrink-0 text-primary" />Digital product. No shipping charges. Bank transfer with manual payment verification.</div></div></div><section className="mt-14 border-t border-border pt-10"><h2 className="text-3xl">A closer look</h2><p className="mt-5 max-w-3xl leading-relaxed text-muted-foreground">{p.description}</p></section><section className="mt-14"><h2 className="mb-7 text-3xl">Keep the momentum going</h2><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{data.products.filter(x => x.id !== p.id).slice(0,3).map(x => <ProductCard key={x.id} product={x} />)}</div></section></Container></main>;
}
