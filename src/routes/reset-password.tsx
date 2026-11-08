import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader, Container } from '@/components/page-shell';
import { Input } from '@/components/ui/input'; import { Label } from '@/components/ui/label'; import { Button } from '@/components/ui/button';
import { pageMeta } from '@/lib/queries';
export const Route = createFileRoute('/reset-password')({ head: () => pageMeta('Reset password','Reset the password for your Axiom Worksheets account.'), component: Reset });
function Reset() { const [recovery,setRecovery]=useState(false); const [busy,setBusy]=useState(false); const navigate=useNavigate(); useEffect(()=>{ setRecovery(window.location.hash.includes('type=recovery')); const {data}=supabase.auth.onAuthStateChange(e=>{ if(e==='PASSWORD_RECOVERY') setRecovery(true); }); return()=>data.subscription.unsubscribe(); },[]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const v=String(new FormData(e.currentTarget).get('value'));setBusy(true);const r=recovery?await supabase.auth.updateUser({password:v}):await supabase.auth.resetPasswordForEmail(v,{redirectTo:`${window.location.origin}/reset-password`});setBusy(false);if(r.error)return toast.error(r.error.message);if(recovery){toast.success('Password updated');navigate({to:'/account'});}else toast.success('Check your email for a reset link');}
 return <main><PageHeader eyebrow="Account help" title={recovery?'Choose a new password.':'Let’s get you back in.'}/><Container className="max-w-md py-10"><form onSubmit={submit} className="space-y-5"><Label htmlFor="value">{recovery?'New password':'Email address'}</Label><Input id="value" name="value" type={recovery?'password':'email'} minLength={recovery?8:undefined} required/><Button className="w-full" disabled={busy}>{busy?'Please wait…':recovery?'Update password':'Send reset link'}</Button></form></Container></main>; }
