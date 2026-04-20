-- 1. Create storage bucket for system assets (logo, etc)
INSERT INTO storage.buckets (id, name, public)
VALUES ('system', 'system', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public access to read system files
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public System Assets' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Public System Assets" ON storage.objects FOR SELECT USING (bucket_id = 'system');
    END IF;
END $$;

-- 3. In case you want to allow manual uploads via service role later
-- But usually the user will do this via the Dashboard.
