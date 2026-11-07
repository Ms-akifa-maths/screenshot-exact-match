
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');
CREATE TYPE public.order_status AS ENUM ('pending_payment','payment_submitted','payment_verified','processing','completed','cancelled');
CREATE TYPE public.payment_status AS ENUM ('unpaid','submitted','verified','refunded');

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- New user: profile + customer role; first account ever becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.email,''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer') ON CONFLICT DO NOTHING;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Admin role management
CREATE OR REPLACE FUNCTION public.set_admin(_user_id uuid, _make_admin boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF _make_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id,'admin') ON CONFLICT DO NOTHING;
  ELSE
    IF _user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot remove your own admin access'; END IF;
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  short_description text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  category text NOT NULL DEFAULT 'Mixed',
  grade text NOT NULL DEFAULT 'Grade 5',
  difficulty text NOT NULL DEFAULT 'Beginner',
  image_url text,
  includes text[] NOT NULL DEFAULT '{}',
  pages int NOT NULL DEFAULT 10,
  rating numeric(2,1) NOT NULL DEFAULT 4.8,
  learners int NOT NULL DEFAULT 0,
  accent text NOT NULL DEFAULT '#f5d26a',
  featured boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active products public" ON public.products FOR SELECT TO anon, authenticated USING (active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- PRODUCT FILES (protected reference, admin only)
CREATE TABLE public.product_files (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_files TO authenticated;
GRANT ALL ON public.product_files TO service_role;
ALTER TABLE public.product_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage files" ON public.product_files FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ORDERS
CREATE SEQUENCE public.order_number_seq START 1001;
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT ('MW-' || nextval('public.order_number_seq')::text),
  user_id uuid NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending_payment',
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  payment_method text NOT NULL DEFAULT 'Bank Transfer / Manual Payment',
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  customer_name text NOT NULL DEFAULT '',
  customer_email text NOT NULL DEFAULT '',
  customer_phone text,
  customer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT USAGE ON SEQUENCE public.order_number_seq TO authenticated, service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin orders read" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete orders" ON public.orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  title text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  price numeric(10,2) NOT NULL
);
GRANT SELECT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin items read" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TABLE public.order_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  author_id uuid,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.order_notes TO authenticated;
GRANT ALL ON public.order_notes TO service_role;
ALTER TABLE public.order_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin notes" ON public.order_notes FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- CART
CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cart" ON public.cart_items FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- PAYMENT SETTINGS (single row)
CREATE TABLE public.payment_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bank_name text NOT NULL DEFAULT '',
  account_title text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  iban text NOT NULL DEFAULT '',
  whatsapp_number text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT '',
  is_temporary boolean NOT NULL DEFAULT true,
  currency text NOT NULL DEFAULT 'PKR',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_settings TO anon;
GRANT SELECT, UPDATE ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.payment_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin update settings" ON public.payment_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER settings_updated BEFORE UPDATE ON public.payment_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.payment_settings (bank_name, account_title, account_number, iban, whatsapp_number, instructions)
VALUES ('Example Bank','Maths Worksheets Store','000000000000','PK00 XXXX 0000 0000 0000 0000','+92 300 0000000',
'Transfer the exact amount to the account below. After completing the transfer, send your payment screenshot and order number to our WhatsApp. We verify payments manually and deliver your worksheets within a few hours.');

-- PLACE ORDER: prices computed server-side from products
CREATE OR REPLACE FUNCTION public.place_order(_product_ids uuid[], _name text, _phone text, _notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _order_id uuid;
  _total numeric(10,2);
  _count int;
  _email text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Please sign in to place an order'; END IF;
  IF _product_ids IS NULL OR array_length(_product_ids,1) IS NULL THEN RAISE EXCEPTION 'Your cart is empty'; END IF;
  IF length(coalesce(_name,'')) < 2 OR length(_name) > 120 THEN RAISE EXCEPTION 'Please enter your full name'; END IF;
  IF length(coalesce(_phone,'')) > 30 OR length(coalesce(_notes,'')) > 1000 THEN RAISE EXCEPTION 'Input too long'; END IF;
  SELECT count(*), coalesce(sum(price),0) INTO _count, _total FROM public.products WHERE id = ANY(_product_ids) AND active;
  IF _count = 0 THEN RAISE EXCEPTION 'None of these worksheets are available'; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  INSERT INTO public.orders (user_id, total_amount, customer_name, customer_email, customer_phone, customer_notes)
  VALUES (_uid, _total, trim(_name), coalesce(_email,''), nullif(trim(coalesce(_phone,'')),''), nullif(trim(coalesce(_notes,'')),''))
  RETURNING id INTO _order_id;
  INSERT INTO public.order_items (order_id, product_id, title, quantity, price)
  SELECT _order_id, p.id, p.title, 1, p.price FROM public.products p WHERE p.id = ANY(_product_ids) AND p.active;
  UPDATE public.profiles SET name = trim(_name), phone = coalesce(nullif(trim(coalesce(_phone,'')),''), phone) WHERE id = _uid;
  DELETE FROM public.cart_items WHERE user_id = _uid;
  RETURN _order_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.place_order(uuid[], text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.place_order(uuid[], text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_payment_submitted(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.orders SET status = 'payment_submitted', payment_status = 'submitted'
  WHERE id = _order_id AND user_id = auth.uid() AND status = 'pending_payment';
END $$;
REVOKE EXECUTE ON FUNCTION public.mark_payment_submitted(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.mark_payment_submitted(uuid) TO authenticated;

-- Which product files has the current user unlocked?
CREATE OR REPLACE FUNCTION public.my_downloads()
RETURNS TABLE (product_id uuid, title text, file_path text, file_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT oi.product_id, oi.title, pf.file_path, pf.file_name
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  JOIN public.product_files pf ON pf.product_id = oi.product_id
  WHERE o.user_id = auth.uid() AND o.status IN ('payment_verified','processing','completed')
$$;
REVOKE EXECUTE ON FUNCTION public.my_downloads() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_downloads() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_download(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.my_downloads() d WHERE d.file_path = _path)
$$;

-- STORAGE POLICIES
CREATE POLICY "product images readable" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'product-images');
CREATE POLICY "admin write product images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update product images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete product images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "worksheet files read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'worksheet-files' AND public.can_download(name));
CREATE POLICY "admin write worksheet files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'worksheet-files' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update worksheet files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'worksheet-files' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete worksheet files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'worksheet-files' AND public.has_role(auth.uid(),'admin'));

-- SEED PRODUCTS
INSERT INTO public.products (slug,title,short_description,description,price,category,grade,difficulty,image_url,includes,pages,rating,learners,accent,featured) VALUES
('maths-worksheet-1','Maths Worksheet 1','Number sense warm-ups: place value, rounding and comparing.','A confidence-building starter pack covering place value up to 10,000, rounding to the nearest 10 and 100, and comparing numbers with < and > symbols. Each page builds on the last, ending with a short self-check quiz.',350,'Arithmetic','Grade 3','Beginner','/images/ws-number-sense.jpg','{"12 practice pages","Answer key","Self-check quiz","Printable A4 PDF"}',12,4.8,214,'#f5d26a',true),
('maths-worksheet-2','Maths Worksheet 2','Multiplication tables 2–12 with timed drills and puzzles.','Master the times tables with progressive drills, multiplication grids, pattern spotting and fun number puzzles. Includes timed challenge pages to track speed and accuracy.',400,'Arithmetic','Grade 4','Beginner','/images/ws-multiplication.jpg','{"16 practice pages","Timed drill sheets","Answer key","Progress tracker"}',16,4.9,302,'#9fcbe8',false),
('maths-worksheet-3','Maths Worksheet 3','Decimals and percentages in real-life contexts.','Shopping bills, discounts and measurements turn decimals and percentages into something students actually understand. Covers converting between fractions, decimals and percentages.',450,'Mixed','Grade 6','Intermediate','/images/ws-decimals.jpg','{"14 practice pages","Worked examples","Answer key","Word problems"}',14,4.7,168,'#bcd98e',false),
('algebra-practice-worksheet','Algebra Practice Worksheet','Linear equations, expressions and substitution, step by step.','From simplifying expressions to solving two-step linear equations, this pack walks students through algebra with clear worked examples, scaffolded practice and challenge questions.',550,'Algebra','Grade 8','Intermediate','/images/ws-algebra.jpg','{"20 practice pages","Worked examples","Challenge section","Full solutions"}',20,4.9,389,'#f6a37c',true),
('fractions-practice-worksheet','Fractions Practice Worksheet','Equivalent fractions, adding, subtracting and simplifying.','Visual fraction bars and pie models make fractions click. Students move from equivalent fractions to adding and subtracting with unlike denominators, then simplifying answers.',400,'Fractions','Grade 5','Beginner','/images/ws-fractions.jpg','{"15 practice pages","Visual models","Answer key","Mini assessment"}',15,4.8,276,'#f2a6c6',true),
('geometry-worksheet','Geometry Worksheet','Angles, triangles, area and perimeter with diagrams.','Clear labelled diagrams cover angle rules, properties of triangles and quadrilaterals, and calculating area and perimeter of compound shapes.',500,'Geometry','Grade 7','Intermediate','/images/ws-geometry.jpg','{"18 practice pages","Diagram exercises","Answer key","Formula sheet"}',18,4.8,241,'#9fcbe8',true),
('arithmetic-challenge-worksheet','Arithmetic Challenge Worksheet','Mental maths and multi-step problems for fast thinkers.','A challenge pack for students who are ready for more: long division, order of operations, multi-step word problems and olympiad-style puzzles.',600,'Arithmetic','Grade 6','Advanced','/images/ws-arithmetic.jpg','{"20 challenge pages","Olympiad puzzles","Full solutions","Speed rounds"}',20,4.9,133,'#f5d26a',false),
('mixed-maths-practice','Mixed Maths Practice','Exam-style revision across every core topic.','A balanced revision pack mixing algebra, geometry, fractions, graphs and arithmetic in exam-style questions. Perfect for end-of-term preparation.',650,'Mixed','Grade 9','Advanced','/images/ws-graphs.jpg','{"24 revision pages","Exam-style questions","Mark scheme","Topic checklist"}',24,4.8,197,'#bcd98e',true);
