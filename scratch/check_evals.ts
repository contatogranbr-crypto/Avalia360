
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkEvals() {
  console.log('Checking Evaluations...');
  
  // 1. Get all evaluations
  const { data: evals, error: evalError } = await supabaseAdmin
    .from('evaluations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (evalError) {
    console.error('Error fetching evaluations:', evalError);
  } else {
    console.log('Last 10 Evaluations:', JSON.stringify(evals, null, 2));
  }

  // 2. Get all active users
  const { data: users, error: userError } = await supabaseAdmin
    .from('users')
    .select('uid, email, role, status')
    .eq('status', 'active');

  if (userError) {
    console.error('Error fetching users:', userError);
  } else {
    console.log('Active Users Count:', users?.length);
    console.log('Active Users:', JSON.stringify(users, null, 2));
  }
}

checkEvals();
