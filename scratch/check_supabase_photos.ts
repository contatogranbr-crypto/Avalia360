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

async function checkPhotos() {
  try {
    console.log('--- Checking Users and Photos ---');
    const { data: users, error } = await supabase
      .from('users')
      .select('uid, name, email, photo_url')
      .limit(20);

    if (error) {
      console.error('Supabase Error:', error);
      return;
    }

    console.table(users);

    const withPhotos = users?.filter(u => u.photo_url).length || 0;
    console.log(`\nUsers with photos: ${withPhotos} out of ${users?.length || 0}`);

    if (users && users.length > 0) {
        users.filter(u => u.photo_url).forEach(u => {
            console.log(`User ${u.name} has photo URL: ${u.photo_url}`);
        });
    }

  } catch (err) {
    console.error('Catch Error:', err);
  }
}

checkPhotos();
