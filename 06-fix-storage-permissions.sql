-- 1. Garante que os buckets existem e são públicos
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('ombudsman', 'ombudsman', true),
  ('system', 'system', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Limpa políticas antigas para evitar conflitos (Opcional, mas recomendado)
-- DROP POLICY IF EXISTS "Public Access" ON storage.objects;
-- DROP POLICY IF EXISTS "Anonymous Upload" ON storage.objects;

-- 3. Política: Acesso Público de Leitura (Para ver a logo e anexos)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow Public Select' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Allow Public Select" ON storage.objects FOR SELECT USING (bucket_id IN ('ombudsman', 'system'));
    END IF;
END $$;

-- 4. Política: Upload Anônimo (Essencial para a Ouvidoria)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow Anonymous Inserts' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Allow Anonymous Inserts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ombudsman');
    END IF;
END $$;

-- 5. Política: Permissões Especiais (Service Role ou Admin)
-- Geralmente o Supabase lida com isso, mas se quiser garantir:
-- CREATE POLICY "Admin Full Access" ON storage.objects FOR ALL USING (auth.role() = 'service_role');
