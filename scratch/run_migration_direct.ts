import pg from 'pg';

// Trying direct connection instead of pooler
const connectionString = 'postgresql://postgres:paragran2026@db.twxdjqsggoavycuudwzt.supabase.co:5432/postgres';

async function migrate() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database (Direct)...');
    await client.connect();
    console.log('Connected!');

    console.log('Adding photo_url column...');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT');
    console.log('Column added successfully.');
    
  } catch (err) {
    console.error('Migration Error:', err);
  } finally {
    await client.end();
  }
}

migrate();
