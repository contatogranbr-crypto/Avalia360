import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('--- Checking self-evaluations ---');
  const { data, error } = await supabase.from('evaluations').select('id, evaluator_id, evaluated_id, evaluator_name, evaluated_name, status');
  
  if (error) {
    console.error('Error fetching evaluations:', error);
    return;
  }

  const selfEvals = data.filter(e => e.evaluator_id === e.evaluated_id);
  console.log(`Total evaluations: ${data.length}`);
  console.log(`Total self-evaluations: ${selfEvals.length}`);

  if (selfEvals.length > 0) {
    console.log('\nUsers with self-evaluations:');
    selfEvals.forEach(e => {
        console.log(`- ${e.evaluator_name} (${e.status})`);
    });
  } else {
    console.log('\nNo self-evaluations found in the entire database.');
    
    // Check one user specifically
    const userEmail = 'Alexandra@granbernardo.com';
    const { data: users } = await supabase.from('users').select('uid, name').eq('email', userEmail);
    if (users && users.length > 0) {
        const uid = users[0].uid;
        console.log(`\nChecking specific user: ${users[0].name} (UID: ${uid})`);
        const { data: userEvals } = await supabase.from('evaluations').select('*').eq('evaluator_id', uid);
        console.log(`Total evaluations for this user: ${userEvals?.length || 0}`);
        userEvals?.forEach(e => {
            console.log(` -> To: ${e.evaluated_name} (ID: ${e.evaluated_id})`);
        });
    }
  }
}

check();
