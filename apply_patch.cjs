const pg = require('pg');

const connectionString = 'postgresql://postgres.twxdjqsggoavycuudwzt:paragran2026@aws-0-sa-east-1.pooler.supabase.com:5432/postgres';

async function apply() {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const queries = [
    `CREATE TABLE IF NOT EXISTS forms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS form_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      type TEXT NOT NULL,
      options JSONB,
      required BOOLEAN DEFAULT true,
      order_index INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    `ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS form_id UUID REFERENCES forms(id) ON DELETE SET NULL;`,
    `ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS answers JSONB;`
  ];

  for (const q of queries) {
    try {
      console.log('Running:', q.trim());
      await client.query(q);
    } catch(e) {
      console.error(e);
    }
  }

  await client.end();
}
apply();
