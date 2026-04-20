-- 1. Adicionar coluna de anexos na tabela de denúncias
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}';

-- 2. Configuração de Storage (Bucket 'ombudsman')
-- Nota: O bucket deve ser criado via Interface do Supabase ou CLI.
-- As políticas de RLS abaixo assumem que o bucket se chama 'ombudsman'.

-- Permitir que qualquer pessoa leia arquivos do bucket (Público)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Public Access' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'ombudsman');
    END IF;
END $$;

-- Permitir uploads anônimos (Para o formulário de Ouvidoria)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Anonymous Upload' AND tablename = 'objects' AND schemaname = 'storage'
    ) THEN
        CREATE POLICY "Anonymous Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'ombudsman');
    END IF;
END $$;
