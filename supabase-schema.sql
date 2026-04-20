-- Schema for Supabase (PostgreSQL)

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT UNIQUE NOT NULL, -- Keep for compatibility or use UUID
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('admin', 'employee', 'client')) DEFAULT 'employee',
  department TEXT,
  position TEXT,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  access_key TEXT, -- Field for the Access Key system
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Evaluations Table
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluator_id TEXT NOT NULL,
  evaluator_name TEXT,
  evaluated_id TEXT NOT NULL,
  evaluated_name TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  status TEXT CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- Policies for Users
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own profile' AND tablename = 'users') THEN
        CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid()::text = uid);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all users' AND tablename = 'users') THEN
        CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (
            EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND role = 'admin')
        );
    END IF;
END $$;

-- Policies for Evaluations
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Evaluators can view their evaluations' AND tablename = 'evaluations') THEN
        CREATE POLICY "Evaluators can view their evaluations" ON evaluations FOR SELECT USING (evaluator_id = auth.uid()::text);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all evaluations' AND tablename = 'evaluations') THEN
        CREATE POLICY "Admins can view all evaluations" ON evaluations FOR SELECT USING (
            EXISTS (SELECT 1 FROM users WHERE uid = auth.uid()::text AND role = 'admin')
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Evaluators can update pending evaluations' AND tablename = 'evaluations') THEN
        CREATE POLICY "Evaluators can update pending evaluations" ON evaluations FOR UPDATE USING (
            evaluator_id = auth.uid()::text AND status = 'pending'
        );
    END IF;
END $$;

-- 3. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default Settings
INSERT INTO settings (key, value) 
VALUES ('evaluation_frequency', '90') 
ON CONFLICT (key) DO NOTHING;

-- 4. Forms Table
CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Form Questions Table
CREATE TABLE IF NOT EXISTS form_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type TEXT NOT NULL,
  options JSONB,
  required BOOLEAN DEFAULT true,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Modify Evaluations Table
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS form_id UUID REFERENCES forms(id) ON DELETE SET NULL;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS answers JSONB;

-- 6. Complaints Table (Ombudsman)
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

-- Policies for Complaints
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
