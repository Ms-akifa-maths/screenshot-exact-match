DROP POLICY IF EXISTS "settings public read" ON public.payment_settings;
REVOKE SELECT ON public.payment_settings FROM anon;
CREATE POLICY "signed-in settings read" ON public.payment_settings FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "product images readable" ON storage.objects;
CREATE POLICY "admin product images read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));