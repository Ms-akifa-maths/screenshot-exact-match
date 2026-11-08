import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { CheckCircle2, Copy, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { accountOptions, pageMeta } from '@/lib/queries';
import { formatPrice, whatsappLink } from '@/lib/store';
import { PageHeader, Container } from '@/components/page-shell';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { StoreError, StoreNotFound, StorePending } from '@/components/load-state';

export const Route = createFileRoute('/_authenticated/orders/$id')({
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(accountOptions); },
  head: () => pageMeta('Your order', 'Payment instructions and status for your Axiom worksheet order.'),
  component: OrderPage, errorComponent: StoreError, notFoundComponent: StoreNotFound, pendingComponent: StorePending,
});

const STEPS = ['pending_payment', 'payment_submitted', 'payment_verified', 'completed'] as const;
const STEP_LABEL = ['Order placed', 'Payment sent', 'Payment verified', 'Delivered'];

function OrderPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(accountOptions);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const order = data.orders.find((o) => o.id === id);
  const s = data.settings;
  if (!order) return <main><PageHeader title="Order not found" /><Container className="py-10"><Button asChild><Link to="/account">Back to your account</Link></Button></Container></main>;
  const stepIndex = order.status === 'processing' ? 2 : STEPS.indexOf(order.status as (typeof STEPS)[number]);

  const markPaid = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('mark_payment_submitted', { _order_id: order.id });
    setBusy(false);
    if (error) return toast.error("Couldn't update", { description: error.message });
    toast.success("Thanks! We'll verify your payment shortly.");
    await qc.invalidateQueries({ queryKey: accountOptions.queryKey });
  };
  const copy = (v: string) => { void navigator.clipboard.writeText(v); toast.success('Copied'); };

  return (
    <main>
      <PageHeader eyebrow={`Order ${order.order_number}`} title={order.status === 'pending_payment' ? 'Complete your payment.' : 'Your order is on its way.'}>
        <StatusBadge status={order.status} />
      </PageHeader>
      <Container className="grid gap-10 py-10 lg:grid-cols-[1fr_340px]">
        <div>
          {order.status !== 'cancelled' && (
            <ol className="mb-10 grid grid-cols-4 gap-2">
              {STEP_LABEL.map((l, i) => (
                <li key={l} className={`border-t-2 pt-3 text-xs ${i <= stepIndex ? 'border-primary text-foreground' : 'border-border text-muted-foreground'}`}>{i <= stepIndex && <CheckCircle2 className="mb-1 size-4 text-primary" />}{l}</li>
              ))}
            </ol>
          )}
          {s && (order.status === 'pending_payment' || order.status === 'payment_submitted') && (
            <section className="rounded-lg border border-border bg-secondary/30 p-6">
              <h2 className="text-2xl">Bank transfer details</h2>
              <p className="mt-2 text-sm text-muted-foreground">Transfer <strong className="text-foreground">{formatPrice(order.total_amount, s.currency)}</strong> and use <strong className="font-mono text-foreground">{order.order_number}</strong> as the reference.</p>
              <dl className="mt-6 grid gap-3 text-sm">
                {[['Bank', s.bank_name], ['Account title', s.account_title], ['Account number', s.account_number], ['IBAN', s.iban]].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3 border-b border-border pb-3"><dt className="text-muted-foreground">{k}</dt><dd className="flex items-center gap-2 font-mono">{v}<Button type="button" variant="ghost" size="icon" aria-label={`Copy ${k}`} onClick={() => copy(v)}><Copy className="size-3" /></Button></dd></div>
                ))}
              </dl>
              {s.instructions && <p className="mt-5 text-sm whitespace-pre-line text-muted-foreground">{s.instructions}</p>}
              {s.is_temporary && <p className="mt-4 text-xs text-warning">These payment details are being finalised — please confirm on WhatsApp before sending money.</p>}
              <div className="mt-6 flex flex-wrap gap-3">
                {s.whatsapp_number && <Button asChild variant="glass"><a href={whatsappLink(s.whatsapp_number, `Hi! Payment proof for order ${order.order_number} (${formatPrice(order.total_amount, s.currency)}).`)} target="_blank" rel="noreferrer"><MessageCircle /> Send proof on WhatsApp</a></Button>}
                {order.status === 'pending_payment' && <Button onClick={markPaid} disabled={busy}>{busy ? 'Saving…' : "I've sent the payment"}</Button>}
              </div>
            </section>
          )}
          {['payment_verified', 'processing', 'completed'].includes(order.status) && (
            <section className="rounded-lg border border-success/30 bg-success/10 p-6"><h2 className="text-2xl">Your worksheets are ready</h2><p className="mt-2 text-sm text-muted-foreground">Download them anytime from your account.</p><Button asChild className="mt-5"><Link to="/account">Go to downloads</Link></Button></section>
          )}
        </div>
        <aside className="h-fit rounded-lg border border-border p-6">
          <h2 className="text-xl">Items</h2>
          {order.order_items.map((i) => <div key={i.id} className="mt-3 flex justify-between gap-3 text-sm"><span>{i.title}</span><span>{formatPrice(i.price)}</span></div>)}
          <div className="mt-5 flex justify-between border-t border-border pt-4 font-semibold"><span>Total</span><span>{formatPrice(order.total_amount)}</span></div>
          <p className="mt-4 text-xs text-muted-foreground">Placed {new Date(order.created_at).toLocaleString()}</p>
        </aside>
      </Container>
    </main>
  );
}
