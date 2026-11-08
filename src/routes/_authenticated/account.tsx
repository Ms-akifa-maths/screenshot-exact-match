import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { accountOptions, pageMeta } from '@/lib/queries';
import { PageHeader, Container } from '@/components/page-shell';
import { StatusBadge } from '@/components/status-badge';
import { formatPrice } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StoreError, StoreNotFound, StorePending } from '@/components/load-state';

export const Route = createFileRoute('/_authenticated/account')({
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(accountOptions); },
  head: () => pageMeta('Your account', 'Your Axiom worksheet orders, downloads and profile.'),
  component: Account, errorComponent: StoreError, notFoundComponent: StoreNotFound, pendingComponent: StorePending,
});

function Account() {
  const { data } = useSuspenseQuery(accountOptions);
  const qc = useQueryClient();
  const [name, setName] = useState(data.profile.name);
  const [phone, setPhone] = useState(data.profile.phone ?? '');

  const download = async (path: string) => {
    const { data: signed, error } = await supabase.storage.from('worksheet-files').createSignedUrl(path, 60);
    if (error || !signed) return toast.error("Couldn't prepare the download", { description: error?.message });
    window.open(signed.signedUrl, '_blank', 'noopener');
  };
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('profiles').update({ name: name.trim().slice(0, 120), phone: phone.trim().slice(0, 30) || null }).eq('id', data.profile.id);
    if (error) return toast.error("Couldn't save", { description: error.message });
    toast.success('Profile saved');
    await qc.invalidateQueries({ queryKey: accountOptions.queryKey });
  };

  return (
    <main>
      <PageHeader eyebrow="Your account" title={data.profile.name ? `Hello, ${data.profile.name.split(' ')[0]}.` : 'Your worksheets'} />
      <Container className="grid gap-12 py-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-12">
          <section>
            <h2 className="text-3xl">Downloads</h2>
            {data.downloads.length === 0 ? <p className="mt-4 text-muted-foreground">Worksheets appear here once a payment is verified.</p> : (
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {data.downloads.map((d) => <li key={d.file_path} className="flex items-center gap-3 rounded-lg border border-border p-4"><FileText className="size-6 text-accent" /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{d.title}</p><p className="truncate text-xs text-muted-foreground">{d.file_name}</p></div><Button size="sm" onClick={() => download(d.file_path)}><Download /> Get</Button></li>)}
              </ul>
            )}
          </section>
          <section>
            <h2 className="text-3xl">Orders</h2>
            {data.orders.length === 0 ? <div className="mt-4"><p className="text-muted-foreground">No orders yet.</p><Button asChild className="mt-4"><Link to="/store">Explore worksheets</Link></Button></div> : data.orders.map((order) => (
              <Link key={order.id} to="/orders/$id" params={{ id: order.id }} className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-5 hover:bg-secondary/30">
                <div><p className="font-mono">{order.order_number}</p><p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()} · {order.order_items.length} worksheet(s)</p></div>
                <StatusBadge status={order.status} /><p className="font-semibold">{formatPrice(order.total_amount)}</p>
              </Link>
            ))}
          </section>
        </div>
        <form onSubmit={saveProfile} className="h-fit space-y-4 rounded-lg border border-border p-6">
          <h2 className="text-2xl">Profile</h2>
          <div className="space-y-2"><Label htmlFor="pname">Name</Label><Input id="pname" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="pphone">Phone</Label><Input id="pphone" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">{data.profile.email}</p>
          <Button type="submit" className="w-full">Save</Button>
        </form>
      </Container>
    </main>
  );
}
