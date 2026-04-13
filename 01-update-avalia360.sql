CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS form_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options JSONB,
  required BOOLEAN DEFAULT true,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS form_id UUID REFERENCES forms(id) ON DELETE SET NULL;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS answers JSONB;
