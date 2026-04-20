-- Execute este script no Dashboard do Supabase (SQL Editor)
-- Para habilitar a comunicação bidirecional na Ouvidoria

-- 1. Adiciona a coluna de histórico de mensagens
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb;

-- 2. (Opcional) Migra dados antigos se existirem
UPDATE complaints 
SET messages = jsonb_build_array(
    jsonb_build_object('role', 'user', 'content', description, 'timestamp', created_at)
)
WHERE messages = '[]'::jsonb;

-- 3. Adiciona comentário explicativo
COMMENT ON COLUMN complaints.messages IS 'Armazena o histórico da conversa: [{role, content, timestamp, author?}]';
