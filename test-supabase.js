const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('db.js', 'utf8');
const urlMatch = envFile.match(/const\s+SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
const keyMatch = envFile.match(/const\s+SUPABASE_KEY\s*=\s*['"]([^'"]+)['"]/);

if (!urlMatch || !keyMatch) {
  console.log('Credentials not found');
  process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data: users, error: fetchErr } = await supabase.from('unilux_users').select('*').limit(1);
  if (fetchErr || !users.length) {
    console.log('Fetch error:', fetchErr);
    return;
  }
  const u = users[0];
  console.log('Trying to update user:', u.id, 'to compras_pcp');
  
  const { error } = await supabase.from('unilux_users').update({ role: 'compras_pcp' }).eq('id', u.id);
  console.log('Update result:', error);
}

run();
