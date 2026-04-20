-- Migration: Ombudsman System
-- 1. Update user roles
DO $$ 
BEGIN 
    -- Drop old constraint if exists
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    -- Add new constraint
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'employee', 'client'));
END $$;

-- 2. Create Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('reclamacao', 'sugestao', 'elogio', 'denuncia')) NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('pendente', 'em_analise', 'resolvido', 'arquivado')) DEFAULT 'pendente',
  response TEXT,
  is_anonymous BOOLEAN DEFAULT true,
  user_id TEXT, -- Optional reference to uid
  contact_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS and Policies
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can create a complaint' AND tablename = 'complaints') THEN
        CREATE POLICY "Anyone can create a complaint" ON complaints FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view a complaint by protocol' AND tablename = 'complaints') THEN
        CREATE POLICY "Anyone can view a complaint by protocol" ON complaints FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all complaints' AND tablename = 'complaints') THEN
        CREATE POLICY "Admins can view all complaints" ON complaints FOR ALL USING (
            EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND role = 'admin')
        );
    END IF;
END $$;
