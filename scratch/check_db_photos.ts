import pg from 'pg';

const connectionString = 'postgresql://postgres.twxdjqsggoavycuudwzt:paragran2026@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function checkDatabase() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('--- Checking Columns in users table ---');
    const colsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    console.log(colsRes.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

    console.log('\n--- Checking Users Data (first 5) ---');
    const usersRes = await client.query('SELECT name, email, photo_url FROM users LIMIT 5');
    console.table(usersRes.rows);

    console.log('\n--- Checking for Users with photo_url ---');
    const hasPhotoRes = await client.query('SELECT count(*) FROM users WHERE photo_url IS NOT NULL');
    console.log(`Users with photo_url: ${hasPhotoRes.rows[0].count}`);

  } catch (err) {
    console.error('Database Error:', err);
  } finally {
    await client.end();
  }
}

checkDatabase();
