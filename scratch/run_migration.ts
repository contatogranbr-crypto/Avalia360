import pg from 'pg';

const connectionString = 'postgresql://postgres.twxdjqsggoavycuudwzt:paragran2026@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function migrate() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');

    console.log('Adding photo_url column...');
    await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT');
    console.log('Column added (or already exists).');

    console.log('Adding evaluated_photo_url logic (Wait, it is already joined in the API, so no column needed in Evaluations table if we use Joins).');
    
  } catch (err) {
    console.error('Migration Error:', err);
  } finally {
    await client.end();
  }
}

migrate();
