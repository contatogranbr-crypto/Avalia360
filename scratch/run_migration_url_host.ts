import pg from 'pg';

// Trying host from the URL directly
const connectionString = 'postgresql://postgres:paragran2026@twxdjqsggoavycuudwzt.supabase.co:5432/postgres';

async function migrate() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database (URL Host)...');
    await client.connect();
    console.log('Connected!');

    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT');
    console.log('Success!');
    
  } catch (err) {
    console.error('Migration Error:', err);
  } finally {
    await client.end();
  }
}

migrate();
