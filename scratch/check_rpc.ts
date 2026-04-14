import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRPC() {
  try {
    console.log('Testing exec_sql RPC...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
    if (error) {
      console.log('exec_sql not found or failed:', error.message);
    } else {
      console.log('exec_sql exists! Result:', data);
      
      console.log('Running migration via exec_sql...');
      const { error: migError } = await supabase.rpc('exec_sql', { sql: 'ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT' });
      if (migError) console.error('Migration via RPC failed:', migError);
      else console.log('Migration via RPC succeeded!');
      return;
    }

    console.log('Testing run_sql RPC...');
    const { data: data2, error: error2 } = await supabase.rpc('run_sql', { sql: 'SELECT 1' });
     if (error2) {
      console.log('run_sql not found or failed:', error2.message);
    } else {
        console.log('run_sql exists!');
    }

  } catch (err) {
    console.error('Catch Error:', err);
  }
}

checkRPC();
