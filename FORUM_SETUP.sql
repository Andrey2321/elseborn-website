-- Elseborn forum migration. Execute ONCE in Supabase SQL Editor after deploying the website.
-- Existing topics and applications remain intact.
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_kind_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_kind_check CHECK (kind IN ('topic','application','rules','professions','races','guide'));

-- Administrative roles are read from public.profiles.role, never from browser-supplied data.
CREATE OR REPLACE FUNCTION public.elseborn_can_publish(section text, author uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT auth.uid() = author AND (
  section IN ('topic','application') OR
  (section IN ('rules','professions','races','guide') AND EXISTS (
   SELECT 1 FROM public.profiles p WHERE p.id=auth.uid()
   AND p.role IN ('owner','creator','technical_admin','tech_admin','ic_admin','ic_administrator','admin')
  ))
 );
$$;
REVOKE ALL ON FUNCTION public.elseborn_can_publish(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.elseborn_can_publish(text,uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can create own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
DROP POLICY IF EXISTS "Elseborn insert posts" ON public.posts;
DROP POLICY IF EXISTS "Elseborn update posts" ON public.posts;
DROP POLICY IF EXISTS "Elseborn delete posts" ON public.posts;
CREATE POLICY "Elseborn insert posts" ON public.posts FOR INSERT TO authenticated
 WITH CHECK (public.elseborn_can_publish(kind,author_id));
CREATE POLICY "Elseborn update posts" ON public.posts FOR UPDATE TO authenticated
 USING (public.elseborn_can_publish(kind,author_id))
 WITH CHECK (public.elseborn_can_publish(kind,author_id));
CREATE POLICY "Elseborn delete posts" ON public.posts FOR DELETE TO authenticated
 USING (public.elseborn_can_publish(kind,author_id));
