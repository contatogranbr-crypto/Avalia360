const pg = require('pg');

const connectionString = 'postgresql://postgres.twxdjqsggoavycuudwzt:paragran2026@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function apply() {
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    console.log('Creating forms table...');
    await client.query(`CREATE TABLE IF NOT EXISTS forms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`);
    console.log('Success 1');

    console.log('Creating form_questions table...');
    await client.query(`CREATE TABLE IF NOT EXISTS form_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL,
      options JSONB,
      required BOOLEAN DEFAULT true,
      order_index INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`);
    console.log('Success 2');

    console.log('Altering evaluations table 1...');
    await client.query(`ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS form_id UUID REFERENCES forms(id) ON DELETE SET NULL`);
    console.log('Success 3');

    console.log('Altering evaluations table 2...');
    await client.query(`ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS answers JSONB`);
    console.log('Success 4');

  } catch(e) {
    console.error(e);
  }

  await client.end();
}
apply();
