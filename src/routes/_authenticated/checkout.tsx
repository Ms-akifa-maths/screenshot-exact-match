import { useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { ArrowRight, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { catalogOptions, accountOptions, pageMeta } from '@/lib/queries';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/store';
import { PageHeader, Container } from '@/components/page-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StoreError, StoreNotFound, StorePending } from '@/components/load-state';

export const Route = createFileRoute('/_authenticated/checkout')({
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(catalogOptions); },
  head: () => pageMeta('Checkout', 'Review your Axiom worksheet purchase and payment details.'),
  component: Checkout, errorComponent: StoreError, notFoundComponent: StoreNotFound, pendingComponent: StorePending,
});

function Checkout() {
  const { data } = useSuspenseQuery(catalogOptions);
  const cart = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState((user?.user_metadata?.['name'] as string) ?? '');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const products = data.products.filter((p) => cart.has(p.id));
  const total = products.reduce((s, p) => s + Number(p.price), 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data: orderId, error } = await supabase.rpc('place_order', { _product_ids: products.map((p) => p.id), _name: name, _phone: phone, _notes: notes });
    setBusy(false);
    if (error || !orderId) { toast.error("Couldn't place your order", { description: error?.message }); return; }
    cart.clearLocal();
    await qc.invalidateQueries({ queryKey: accountOptions.queryKey });
    toast.success('Order placed', { description: 'Follow the payment steps to receive your worksheets.' });
    navigate({ to: '/orders/$id', params: { id: orderId } });
  };

  return (
    <main>
      <PageHeader eyebrow="Checkout" title="Almost there." />
      <Container className="py-10">
        {!cart.ready ? <p>Loading your cart…</p> : products.length === 0 ? (
          <div className="py-10"><p>Your cart is empty.</p><Button asChild className="mt-6"><Link to="/store">Explore worksheets</Link></Button></div>
        ) : (
          <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1fr_360px]">
            <div className="space-y-5">
              <h2 className="text-2xl">Your details</h2>
              <div className="space-y-2"><Label htmlFor="name">Full name</Label><Input id="name" required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" value={user?.email ?? ''} disabled /></div>
              <div className="space-y-2"><Label htmlFor="phone">WhatsApp / phone (optional)</Label><Input id="phone" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 3xx xxxxxxx" /></div>
              <div className="space-y-2"><Label htmlFor="notes">Notes (optional)</Label><Textarea id="notes" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything we should know?" /></div>
              <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground"><p className="font-semibold text-foreground">Payment: Bank transfer / manual payment</p><p className="mt-1">After placing your order you'll see our bank details. Send proof of payment and your worksheets unlock once we verify it.</p></div>
            </div>
            <aside className="h-fit rounded-lg border border-border p-6">
              <h2 className="text-2xl">Order summary</h2>
              {products.map((p) => <div key={p.id} className="mt-4 flex justify-between gap-4 text-sm"><span>{p.title}</span><span>{formatPrice(p.price)}</span></div>)}
              <div className="my-6 flex justify-between border-t border-border pt-5 text-lg font-semibold"><span>Total</span><span>{formatPrice(total)}</span></div>
              <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Placing order…' : <>Place order <ArrowRight /></>}</Button>
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Lock className="size-3" /> Prices are confirmed securely when you order.</p>
            </aside>
          </form>
        )}
      </Container>
    </main>
  );
}
