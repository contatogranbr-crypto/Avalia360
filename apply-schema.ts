import pg from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = 'postgresql://postgres.twxdjqsggoavycuudwzt:paragran2026@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function applySchema() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    const schemaPath = path.join(process.cwd(), 'supabase-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Applying schema...');
    // Split by semicolon to execute multiple statements if needed, 
    // although pg.Client.query can handle some multiple statements depending on driver settings.
    // However, some SQL files have comments and complex structures.
    await client.query(schemaSql);
    
    console.log('Schema applied successfully!');
  } catch (err) {
    console.error('Error applying schema:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applySchema();
