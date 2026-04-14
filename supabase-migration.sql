-- 1. Adicionar coluna para URL da foto na tabela de usuários
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Instruções para o Supabase Storage (Execute manualmente ou verifique):
--    a) Vá para a aba "Storage" no painel do Supabase.
--    b) Crie um novo bucket chamado "avatars".
--    c) Marque a opção "Public bucket" para que as fotos possam ser lidas sem autenticação extra.
--    d) Adicione as políticas de segurança (RLS) se necessário para permitir upload por administradores.
