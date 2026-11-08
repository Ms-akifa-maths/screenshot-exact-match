import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ArrowRight, BookOpen, CheckCheck, Download, Sparkles } from 'lucide-react';
import { HorizonHero } from '@/components/horizon-hero';
import { ProductCard } from '@/components/product-card';
import { Container } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { catalogOptions, pageMeta } from '@/lib/queries';
import { StoreError, StoreNotFound, StorePending } from '@/components/load-state';
export const Route = createFileRoute('/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogOptions),
  head: () => pageMeta('Maths made clearer', 'Practice, master and improve with beautifully designed printable mathematics worksheets.'),
  component: Index, errorComponent: StoreError, notFoundComponent: StoreNotFound, pendingComponent: StorePending,
});
function Index() {
  const { data } = useSuspenseQuery(catalogOptions);
  return <main>
    <HorizonHero><Container className="w-full pt-16"><p className="hz-sub mb-6 flex items-center gap-2 font-mono text-xs text-primary uppercase"><Sparkles className="size-4" /> A little practice. A world of possibility.</p><h1 className="max-w-3xl text-5xl leading-[1.08] font-medium md:text-7xl">Maths made clearer.<br /><span className="text-primary">Worksheets made smarter.</span></h1><p className="hz-sub mt-6 max-w-lg text-base leading-relaxed text-foreground/75 md:text-lg">Big ideas start with small steps. Thoughtfully designed maths practice for curious students, inspiring teachers, and supportive parents.</p><div className="hz-sub mt-8 flex flex-wrap gap-3"><Button asChild variant="hero" size="xl"><Link to="/store">Explore Worksheets <ArrowRight /></Link></Button><Button asChild variant="glass" size="xl"><Link to="/how-it-works">How it works</Link></Button></div><div className="hz-sub mt-10 flex flex-wrap gap-5 text-xs text-foreground/70"><span className="flex items-center gap-2"><CheckCheck className="size-4 text-accent" /> Answer keys included</span><span className="flex items-center gap-2"><Download className="size-4 text-accent" /> Printable PDFs</span><span className="flex items-center gap-2"><BookOpen className="size-4 text-accent" /> Grades 1–10</span></div></Container></HorizonHero>
    <Container className="pt-12"><div className="mb-8 flex items-end justify-between gap-4"><div><p className="mb-2 font-mono text-xs text-accent uppercase">Good practice starts here</p><h2 className="text-4xl">Small steps. Big breakthroughs.</h2></div><Button asChild variant="link"><Link to="/store">View all <ArrowRight /></Link></Button></div><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{data.products.filter(p => p.featured).slice(0,4).map(p => <ProductCard key={p.id} product={p} />)}</div></Container>
    <section className="mt-20 border-y border-border bg-secondary/40 py-16"><Container><div className="grid gap-10 md:grid-cols-3">{[{ icon: BookOpen, title: 'Understanding, not memorising', text: 'Clear examples and progressive practice bring tricky ideas into focus.' }, { icon: CheckCheck, title: 'Confidence on every page', text: 'Answer keys and self-checks make independent practice feel rewarding.' }, { icon: Download, title: 'Ready when you are', text: 'Print at home, practise in class, or keep a digital copy for later.' }].map(x => <div key={x.title}><x.icon className="mb-5 size-7 text-accent" /><h3 className="mb-3 text-2xl">{x.title}</h3><p className="text-sm leading-relaxed text-muted-foreground">{x.text}</p></div>)}</div></Container></section>
    <Container className="py-16"><p className="font-mono text-xs text-primary uppercase">Find your next aha moment</p><h2 className="mt-3 text-4xl">One worksheet closer.</h2><p className="mt-4 max-w-xl text-muted-foreground">From first fractions to algebra challenges, find the right practice for your next step.</p><Button asChild size="lg" className="mt-6"><Link to="/store">Browse the collection <ArrowRight /></Link></Button></Container>
  </main>;
}
