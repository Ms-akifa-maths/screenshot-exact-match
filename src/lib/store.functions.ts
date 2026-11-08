import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const readCatalog = createServerFn({ method: 'GET' }).handler(async () => {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  const url = process.env['SUPABASE_URL'];
  if (!key || !url) throw new Error('The store connection is unavailable.');
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
      headers.set('apikey', key);
      return fetch(input, { ...init, headers });
    } },
  });
  const products = await client.from('products').select('*').eq('active', true).order('featured', { ascending: false }).order('created_at');
  if (products.error) throw new Error(products.error.message);
  return { products: products.data, settings: null };
});

export const readAccount = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [orders, profile, downloads, settings] = await Promise.all([
    context.supabase.from('orders').select('*, order_items(*)').eq('user_id', context.userId).order('created_at', { ascending: false }),
    context.supabase.from('profiles').select('*').eq('id', context.userId).single(),
    context.supabase.rpc('my_downloads'),
    context.supabase.from('payment_settings').select('*').eq('id', 1).maybeSingle(),
  ]);
  if (settings.error) throw new Error(settings.error.message);
  if (orders.error) throw new Error(orders.error.message);
  if (profile.error) throw new Error(profile.error.message);
  if (downloads.error) throw new Error(downloads.error.message);
  return { orders: orders.data, profile: profile.data, downloads: downloads.data ?? [], settings: settings.data };
});

export const readAdmin = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const role = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (role.error || !role.data) throw new Error('Administrator access required.');
  const [products, orders, profiles, settings, roles, files, notes] = await Promise.all([
    context.supabase.from('products').select('*').order('created_at'),
    context.supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
    context.supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    context.supabase.from('payment_settings').select('*').eq('id', 1).single(),
    context.supabase.from('user_roles').select('*'),
    context.supabase.from('product_files').select('*'),
    context.supabase.from('order_notes').select('*').order('created_at', { ascending: false }),
  ]);
  for (const result of [products, orders, profiles, settings, roles, files, notes]) if (result.error) throw new Error(result.error.message);
  return { products: products.data ?? [], orders: orders.data ?? [], profiles: profiles.data ?? [], settings: settings.data, roles: roles.data ?? [], files: files.data ?? [], notes: notes.data ?? [] };
});
