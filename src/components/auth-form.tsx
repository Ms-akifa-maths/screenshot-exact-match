import { Link, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { safeNext } from '@/lib/auth';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
export function AuthForm({ mode, next, admin = false }: { mode: 'login' | 'signup'; next?: string | undefined; admin?: boolean }) {
  const navigate = useNavigate(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const target = safeNext(next, admin ? '/admin' : '/account');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); const f = new FormData(e.currentTarget); const email = String(f.get('email')).trim(); const password = String(f.get('password')); const name = String(f.get('name') ?? '').trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');
    if (password.length < 8) return setError('Use at least 8 characters for your password.');
    if (mode === 'signup' && name.length < 2) return setError('Enter your full name.');
    setBusy(true);
    const result = mode === 'login' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: `${window.location.origin}/login` } });
    setBusy(false);
    if (result.error) return setError(result.error.message);
    if (mode === 'signup' && !result.data.session) { toast.success('Check your email', { description: 'Confirm your address, then sign in.' }); return navigate({ to: '/login', search: { next: target } }); }
    toast.success(mode === 'login' ? 'Welcome back' : 'Your account is ready'); navigate({ to: target, replace: true });
  }
  async function google() { setError(''); const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: window.location.origin }); if(result.error) setError(result.error.message); else if(!result.redirected) navigate({ to: target }); }
  return <form onSubmit={submit} className="space-y-5" noValidate>{mode === 'signup' && <div className="space-y-2"><Label htmlFor="name">Full name</Label><Input id="name" name="name" autoComplete="name" required /></div>}<div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div><div className="space-y-2"><div className="flex justify-between"><Label htmlFor="password">Password</Label>{mode === 'login' && <Link to="/reset-password" className="text-xs text-primary">Forgot password?</Link>}</div><Input id="password" name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</Button>{!admin && <Button type="button" variant="outline" size="lg" className="w-full" onClick={google}>Continue with Google</Button>}</form>;
}
