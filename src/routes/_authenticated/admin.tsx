import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { adminOptions, catalogOptions, pageMeta } from '@/lib/queries';
import { PageHeader, Container } from '@/components/page-shell';
import { StatusBadge } from '@/components/status-badge';
import { CATEGORIES, DIFFICULTIES, GRADES, ORDER_STATUSES, ORDER_STATUS_LABEL, formatPrice, slugify, type OrderStatus, type Product } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StoreError, StoreNotFound, StorePending } from '@/components/load-state';

export const Route = createFileRoute('/_authenticated/admin')({
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(adminOptions); },
  head: () => pageMeta('Administration', 'Manage Axiom worksheets, orders, customers and payment settings.'),
  component: Admin, errorComponent: StoreError, notFoundComponent: StoreNotFound, pendingComponent: StorePending,
});

const sel = 'h-9 rounded-md border border-input bg-background px-2 text-sm';
function useRefresh() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: adminOptions.queryKey }), qc.invalidateQueries({ queryKey: catalogOptions.queryKey })]);
}
const fail = (e: { message: string } | null) => { if (e) { toast.error('Something went wrong', { description: e.message }); return true; } return false; };

function Admin() {
  const { data } = useSuspenseQuery(adminOptions);
  const revenue = data.orders.filter((o) => ['payment_verified', 'processing', 'completed'].includes(o.status)).reduce((s, o) => s + Number(o.total_amount), 0);
  const pending = data.orders.filter((o) => o.status === 'payment_submitted').length;
  return (
    <main>
      <PageHeader eyebrow="Administration" title="Store overview" />
      <Container className="py-10">
        <div className="grid gap-4 sm:grid-cols-4">
          {[['Verified revenue', formatPrice(revenue)], ['Awaiting verification', pending], ['Orders', data.orders.length], ['Worksheets', data.products.length]].map(([k, v]) => <div key={k} className="rounded-lg border border-border p-5"><p className="text-xs text-muted-foreground">{k}</p><p className="mt-2 font-display text-3xl">{v}</p></div>)}
        </div>
        <Tabs defaultValue="orders" className="mt-10">
          <TabsList className="flex-wrap"><TabsTrigger value="orders">Orders</TabsTrigger><TabsTrigger value="products">Worksheets</TabsTrigger><TabsTrigger value="customers">Customers</TabsTrigger><TabsTrigger value="payment">Payment settings</TabsTrigger></TabsList>
          <TabsContent value="orders"><Orders /></TabsContent>
          <TabsContent value="products"><Products /></TabsContent>
          <TabsContent value="customers"><Customers /></TabsContent>
          <TabsContent value="payment"><Payment /></TabsContent>
        </Tabs>
      </Container>
    </main>
  );
}

function Orders() {
  const { data } = useSuspenseQuery(adminOptions);
  const refresh = useRefresh();
  const [filter, setFilter] = useState<'' | OrderStatus>('');
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const list = data.orders.filter((o) => !filter || o.status === filter);
  const setStatus = async (id: string, status: OrderStatus) => {
    const payment_status = status === 'pending_payment' ? 'unpaid' : status === 'payment_submitted' ? 'submitted' : status === 'cancelled' ? 'unpaid' : 'verified';
    if (fail((await supabase.from('orders').update({ status, payment_status }).eq('id', id)).error)) return;
    toast.success(`Marked ${ORDER_STATUS_LABEL[status]}`); await refresh();
  };
  const addNote = async (order_id: string) => {
    if (!note.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (fail((await supabase.from('order_notes').insert({ order_id, note: note.trim().slice(0, 2000), author_id: u.user?.id ?? null })).error)) return;
    setNote(''); await refresh();
  };
  return (
    <div className="mt-6">
      <select aria-label="Filter by status" className={sel} value={filter} onChange={(e) => setFilter(e.target.value as OrderStatus | '')}><option value="">All statuses</option>{ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}</select>
      {list.length === 0 && <p className="mt-6 text-muted-foreground">No orders.</p>}
      {list.map((o) => (
        <article key={o.id} className="border-b border-border py-5">
          <button type="button" className="flex w-full flex-wrap items-center justify-between gap-4 text-left" onClick={() => setOpen(open === o.id ? null : o.id)}>
            <div><p className="font-mono">{o.order_number}</p><p className="text-xs text-muted-foreground">{o.customer_name} · {o.customer_email} · {new Date(o.created_at).toLocaleString()}</p></div>
            <StatusBadge status={o.status} /><span className="font-semibold">{formatPrice(o.total_amount)}</span>
          </button>
          {open === o.id && (
            <div className="mt-4 grid gap-6 rounded-lg bg-secondary/30 p-4 md:grid-cols-2">
              <div className="text-sm">
                {o.order_items.map((i) => <p key={i.id}>{i.title} — {formatPrice(i.price)}</p>)}
                {o.customer_phone && <p className="mt-3">Phone: {o.customer_phone}</p>}
                {o.customer_notes && <p className="mt-1 text-muted-foreground">“{o.customer_notes}”</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  {o.status !== 'payment_verified' && o.status !== 'completed' && <Button size="sm" onClick={() => setStatus(o.id, 'payment_verified')}>Verify payment</Button>}
                  <select aria-label="Change status" className={sel} value={o.status} onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)}>{ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABEL[s]}</option>)}</select>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold">Internal notes</p>
                {data.notes.filter((n) => n.order_id === o.id).map((n) => <p key={n.id} className="mt-2 text-xs"><span className="text-muted-foreground">{new Date(n.created_at).toLocaleString()}:</span> {n.note}</p>)}
                <div className="mt-3 flex gap-2"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note" /><Button size="sm" variant="glass" onClick={() => addNote(o.id)}>Add</Button></div>
              </div>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}

const blank = { title: '', short_description: '', description: '', price: 0, category: 'Mixed', grade: 'Grade 5', difficulty: 'Beginner', image_url: '', includes: '', pages: 10, featured: false, active: true };
type Draft = typeof blank;

function Products() {
  const { data } = useSuspenseQuery(adminOptions);
  const refresh = useRefresh();
  const [editing, setEditing] = useState<{ id: string | null; d: Draft } | null>(null);
  const edit = (p: Product) => setEditing({ id: p.id, d: { ...p, image_url: p.image_url ?? '', includes: p.includes.join('\n'), price: Number(p.price) } });
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editing) return;
    const { d, id } = editing;
    const row = { title: d.title.trim(), short_description: d.short_description, description: d.description, price: Number(d.price), category: d.category, grade: d.grade, difficulty: d.difficulty, image_url: d.image_url || null, includes: d.includes.split('\n').map((s) => s.trim()).filter(Boolean), pages: Number(d.pages), featured: d.featured, active: d.active };
    const res = id ? await supabase.from('products').update(row).eq('id', id) : await supabase.from('products').insert({ ...row, slug: `${slugify(d.title)}-${Math.random().toString(36).slice(2, 6)}` });
    if (fail(res.error)) return;
    toast.success('Worksheet saved'); setEditing(null); await refresh();
  };
  const upload = async (p: Product, file: File) => {
    const path = `${p.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
    if (fail((await supabase.storage.from('worksheet-files').upload(path, file)).error)) return;
    if (fail((await supabase.from('product_files').upsert({ product_id: p.id, file_path: path, file_name: file.name }, { onConflict: 'product_id' })).error)) return;
    toast.success('File attached'); await refresh();
  };
  const set = (k: keyof Draft, v: unknown) => setEditing((s) => s && { ...s, d: { ...s.d, [k]: v } });
  return (
    <div className="mt-6">
      <Button onClick={() => setEditing({ id: null, d: blank })}><Plus /> New worksheet</Button>
      {editing && (
        <form onSubmit={save} className="mt-6 grid gap-4 rounded-lg border border-border p-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2"><Label>Title</Label><Input required value={editing.d.title} onChange={(e) => set('title', e.target.value)} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Short description</Label><Input value={editing.d.short_description} onChange={(e) => set('short_description', e.target.value)} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Description</Label><Textarea value={editing.d.description} onChange={(e) => set('description', e.target.value)} /></div>
          <div className="space-y-2"><Label>Price (PKR)</Label><Input type="number" min="0" required value={editing.d.price} onChange={(e) => set('price', e.target.value)} /></div>
          <div className="space-y-2"><Label>Pages</Label><Input type="number" min="1" value={editing.d.pages} onChange={(e) => set('pages', e.target.value)} /></div>
          <div className="flex flex-wrap gap-3 md:col-span-2">
            <select aria-label="Category" className={sel} value={editing.d.category} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            <select aria-label="Grade" className={sel} value={editing.d.grade} onChange={(e) => set('grade', e.target.value)}>{GRADES.map((c) => <option key={c}>{c}</option>)}</select>
            <select aria-label="Difficulty" className={sel} value={editing.d.difficulty} onChange={(e) => set('difficulty', e.target.value)}>{DIFFICULTIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div className="space-y-2 md:col-span-2"><Label>Image URL</Label><Input value={editing.d.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="/images/ws-algebra.jpg" /></div>
          <div className="space-y-2 md:col-span-2"><Label>What's included (one per line)</Label><Textarea value={editing.d.includes} onChange={(e) => set('includes', e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={editing.d.featured} onCheckedChange={(v) => set('featured', v)} /> Featured</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={editing.d.active} onCheckedChange={(v) => set('active', v)} /> Visible in store</label>
          <div className="flex gap-2 md:col-span-2"><Button type="submit">Save</Button><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button></div>
        </form>
      )}
      <div className="mt-6">
        {data.products.map((p) => {
          const f = data.files.find((x) => x.product_id === p.id);
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-4 border-b border-border py-4">
              {p.image_url && <img src={p.image_url} alt="" className="size-14 rounded object-cover" />}
              <div className="min-w-0 flex-1"><p className="font-semibold">{p.title} {!p.active && <span className="text-xs text-muted-foreground">(hidden)</span>}</p><p className="text-xs text-muted-foreground">{p.category} · {p.grade} · {formatPrice(p.price)} · {f ? `File: ${f.file_name}` : 'No file yet'}</p></div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary"><Upload className="size-3" /> {f ? 'Replace file' : 'Upload file'}<input type="file" className="sr-only" accept=".pdf,.zip,.docx" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(p, file); }} /></label>
              <Button size="sm" variant="glass" onClick={() => edit(p)}>Edit</Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Customers() {
  const { data } = useSuspenseQuery(adminOptions);
  const refresh = useRefresh();
  const toggle = async (id: string, make: boolean) => { if (fail((await supabase.rpc('set_admin', { _user_id: id, _make_admin: make })).error)) return; toast.success('Updated'); await refresh(); };
  return (
    <div className="mt-6">
      {data.profiles.map((p) => {
        const admin = data.roles.some((r) => r.user_id === p.id && r.role === 'admin');
        const orders = data.orders.filter((o) => o.user_id === p.id);
        return <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-4"><div><p className="font-semibold">{p.name || '—'} {admin && <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">Admin</span>}</p><p className="text-xs text-muted-foreground">{p.email} · {orders.length} orders</p></div><Button size="sm" variant="ghost" onClick={() => toggle(p.id, !admin)}>{admin ? 'Remove admin' : 'Make admin'}</Button></div>;
      })}
    </div>
  );
}

function Payment() {
  const { data } = useSuspenseQuery(adminOptions);
  const refresh = useRefresh();
  const [s, setS] = useState(data.settings);
  if (!s) return <p className="mt-6">No payment settings found.</p>;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id: _id, updated_at: _u, ...rest } = s;
    if (fail((await supabase.from('payment_settings').update(rest).eq('id', 1)).error)) return;
    toast.success('Payment settings saved'); await refresh();
  };
  const field = (k: 'bank_name' | 'account_title' | 'account_number' | 'iban' | 'whatsapp_number' | 'currency', label: string) => <div className="space-y-2"><Label>{label}</Label><Input value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>;
  return (
    <form onSubmit={save} className="mt-6 grid max-w-2xl gap-4 md:grid-cols-2">
      {field('bank_name', 'Bank name')}{field('account_title', 'Account title')}{field('account_number', 'Account number')}{field('iban', 'IBAN')}{field('whatsapp_number', 'WhatsApp number')}{field('currency', 'Currency')}
      <div className="space-y-2 md:col-span-2"><Label>Instructions for customers</Label><Textarea value={s.instructions} onChange={(e) => setS({ ...s, instructions: e.target.value })} /></div>
      <label className="flex items-center gap-2 text-sm md:col-span-2"><Switch checked={s.is_temporary} onCheckedChange={(v) => setS({ ...s, is_temporary: v })} /> Show "details being finalised" warning to customers</label>
      <Button type="submit" className="w-fit">Save settings</Button>
    </form>
  );
}
