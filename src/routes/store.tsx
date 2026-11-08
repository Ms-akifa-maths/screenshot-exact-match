import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { z } from 'zod';
import { PageHeader, Container } from '@/components/page-shell';
import { ProductCard } from '@/components/product-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import GlassFolder from '@/components/ui/glass-folder-cards';
import { catalogOptions, pageMeta } from '@/lib/queries';
import { CATEGORIES, DIFFICULTIES, GRADES } from '@/lib/store';
import { useCart } from '@/lib/cart';
import { StoreError, StoreNotFound, StorePending } from '@/components/load-state';
import { ClientOnly } from '@tanstack/react-router';
const Orbit = lazy(() => import('@/components/ui/worksheet-orbit-carousel'));
const filters = z.object({ q: z.string().optional().catch(''), category: z.string().optional().catch(''), difficulty: z.string().optional().catch(''), grade: z.string().optional().catch(''), max: z.coerce.number().optional().catch(undefined), sort: z.string().optional().catch('featured') });
export const Route = createFileRoute('/store')({
  validateSearch: (search) => filters.parse(search),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogOptions),
  head: () => pageMeta('Explore Worksheets', 'Browse maths worksheets by grade, category, difficulty and price. Find your next breakthrough.'),
  component: Store, errorComponent: StoreError, notFoundComponent: StoreNotFound, pendingComponent: StorePending,
});
function Store() {
  const { data } = useSuspenseQuery(catalogOptions);
  const search = Route.useSearch();
  const navigate = useNavigate({ from: '/store' });
  const cart = useCart();
  const update = (key: string, value: string | number | undefined) => navigate({ search: prev => ({ ...prev, [key]: value }), replace: true });
  const selected = data.products.filter(p => (!search.q || `${p.title} ${p.short_description}`.toLowerCase().includes(search.q.toLowerCase())) && (!search.category || p.category === search.category) && (!search.difficulty || p.difficulty === search.difficulty) && (!search.grade || p.grade === search.grade) && (search.max === undefined || p.price <= search.max)).sort((a,b) => search.sort === 'price-low' ? a.price - b.price : search.sort === 'price-high' ? b.price - a.price : search.sort === 'name' ? a.title.localeCompare(b.title) : Number(b.featured) - Number(a.featured));
  const featured = data.products.filter(p => p.featured);
  return <main><PageHeader eyebrow="The worksheet collection" title={<>A fresh page.<br /><span className="text-primary">A brighter understanding.</span></>}>Find the right practice for every stage of the journey.</PageHeader>
    {featured.length > 0 && <section aria-label="Featured worksheet carousel" className="overflow-hidden border-y border-border"><ClientOnly><Suspense fallback={<div className="h-96 bg-card" />}><Orbit fontSrc={null} height="560px" loop={false} dishes={featured.map(p => ({ title: p.category, subtitle: p.title.replace(' Practice Worksheet','').replace(' Worksheet',''), image: p.image_url ?? '', alt: p.title, eyebrow: 'Featured worksheet', label: p.title, rating: p.rating, chef: p.grade, kitchen: p.difficulty, description: p.short_description, likes: p.learners, ingredients: p.includes, accent: p.accent }))} onPlay={(_, i) => { const p = featured[i]; if (p) navigate({ to: '/store/$slug', params: { slug: p.slug } }); }} onOrder={(_, i) => { const p = featured[i]; if (p) void cart.add(p.id, p.title); }} /></Suspense></ClientOnly></section>}
    <Container className="py-12"><div className="mb-6"><p className="mb-2 font-mono text-xs text-accent uppercase">Organised for curious minds</p><h2 className="text-3xl">Open a new subject.</h2></div><div className="flex flex-wrap justify-center gap-6">{CATEGORIES.map((category,i) => <GlassFolder key={category} width={190} label={category} tone="dark" art="none" image={data.products.find(p => p.category === category)?.image_url ?? undefined} meta={`${data.products.filter(p => p.category === category).length} worksheets`} action="none" files={data.products.filter(p => p.category === category).map(p => ({ name: p.title, meta: p.grade, image: p.image_url ?? undefined }))} onFileSelect={(_, index) => { const p = data.products.filter(p => p.category === category)[index]; if(p) navigate({ to: '/store/$slug', params: { slug: p.slug } }); }} appearDelay={i*70} />)}</div></Container>
    <Container className="pb-12"><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><h2 className="text-3xl">All worksheets</h2><span className="font-mono text-xs text-muted-foreground">{selected.length} worksheets</span></div><div className="mb-8 grid gap-3 rounded-lg border border-border bg-secondary/30 p-4 sm:grid-cols-2 lg:grid-cols-6"><div className="relative lg:col-span-2"><Search className="absolute top-3 left-3 size-4 text-muted-foreground" /><Input aria-label="Search worksheets" placeholder="Search worksheets…" className="pl-9" value={search.q ?? ''} onChange={e => update('q',e.target.value)} /></div>{[['category',CATEGORIES,'All categories'],['difficulty',DIFFICULTIES,'All difficulties'],['grade',GRADES,'All grades']].map(([key,options,label]) => <select key={String(key)} aria-label={String(label)} className="h-9 min-w-0 rounded-md border border-input bg-background px-2 text-sm" value={search[key as 'category'|'difficulty'|'grade'] ?? ''} onChange={e => update(String(key),e.target.value)}><option value="">{String(label)}</option>{(options as readonly string[]).map(o => <option key={o}>{o}</option>)}</select>)}<select aria-label="Sort worksheets" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={search.sort ?? 'featured'} onChange={e => update('sort',e.target.value)}><option value="featured">Featured first</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name: A–Z</option></select><div className="flex items-center gap-3 sm:col-span-2 lg:col-span-6"><SlidersHorizontal className="size-4 text-accent" /><label className="text-xs" htmlFor="max-price">Maximum price</label><Input id="max-price" type="number" min="0" placeholder="Any price" className="w-32" value={search.max ?? ''} onChange={e => update('max',e.target.value === '' ? undefined : Number(e.target.value))} /><Button variant="ghost" size="sm" onClick={() => navigate({ search: {} })}>Clear filters</Button></div></div><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{selected.map(p => <ProductCard key={p.id} product={p} />)}</div>{selected.length === 0 && <div className="py-20 text-center"><h3 className="text-2xl">No worksheets found</h3><p className="mt-3 text-muted-foreground">Try a different search or clear your filters.</p></div>}</Container>
  </main>;
}
