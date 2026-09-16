const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
let supabaseUrl = '', supabaseAnonKey = '';
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach(line => {
    if (line.trim().startsWith('VITE_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.trim().startsWith('VITE_SUPABASE_ANON_KEY=')) {
      supabaseAnonKey = line.split('=')[1].trim();
    }
  });
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const emailsToRegister = [
  { email: 'awagdy@zewailcity.edu.eg', name: 'Prof. Ali Wagdy Mohamed' },
  { email: 'aliwagdy@gmail.com', name: 'Prof. Ali Wagdy Mohamed' }
];

const tempPassword = 'TJASF@Associate2026!';

async function fixProfAli() {
  console.log("Registering and fixing accounts for Prof. Ali Wagdy Mohamed...");

  for (const item of emailsToRegister) {
    console.log(`\nAttempting registration for ${item.email}...`);
    const { data, error } = await supabase.auth.signUp({
      email: item.email,
      password: tempPassword,
      options: {
        data: {
          full_name: item.name
        }
      }
    });

    if (error) {
      console.log(`Notice for ${item.email}:`, error.message);
    } else {
      console.log(`✅ Success for ${item.email}! User ID:`, data?.user?.id || 'Created');
    }
  }

  console.log("\nDone checking Prof. Ali's email registrations.");
}

fixProfAli();
