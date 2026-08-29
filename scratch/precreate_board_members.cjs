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

const members = [
  {
    name: 'Dr. A. Pramod Kumar',
    email: 'a.pramodkumar@cmrec.ac.in',
    affiliation: 'CMR Engineering College',
    domain: 'Engineering & Computing',
    sort_order: 3
  },
  {
    name: 'Dr. Yelleti Vivek',
    email: 'yelleti.vivek@iimranchi.ac.in',
    affiliation: 'Indian Institute of Management Ranchi (IIM Ranchi)',
    domain: 'Computational & Management Science',
    sort_order: 4
  },
  {
    name: 'Dr. Amrit Mukherjee',
    email: 'amukherjee@jcu.cz',
    affiliation: 'University of South Bohemia (JCU)',
    domain: 'Computer Science & AI',
    sort_order: 5
  },
  {
    name: 'Dr. Abdul Aleem',
    email: 'aleemece@vjit.ac.in',
    affiliation: 'Vidya Jyothi Institute of Technology (VJIT)',
    domain: 'Electronics & Communication Engineering',
    sort_order: 6
  },
  {
    name: 'Dr. Veera Venkata Subbaraju',
    email: 'bvvs.kumarfet@kiit.ac.in',
    affiliation: 'KIIT University',
    domain: 'Engineering & Technology',
    sort_order: 7
  }
];

const tempPassword = 'TJASF@Associate2026!';

async function setupMembers() {
  console.log("Setting up 5 Associate Editors in Supabase...");

  for (const member of members) {
    console.log(`\nProcessing: ${member.name} (${member.email})...`);

    // 1. SignUp / Register in Supabase Auth
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: member.email,
      password: tempPassword,
      options: {
        data: {
          full_name: member.name
        }
      }
    });

    if (authErr && !authErr.message.includes('already registered')) {
      console.error(`⚠️ Auth creation warning for ${member.email}:`, authErr.message);
    } else {
      console.log(`✅ Auth user registered/verified for ${member.email}`);
    }

    // 2. Upsert profile in public.profiles with associate_editor role
    if (authData?.user?.id) {
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        email: member.email,
        full_name: member.name,
        affiliation: member.affiliation,
        role: 'associate_editor',
        is_active: true,
        email_verified: true
      });
      if (profErr) {
        console.error(`❌ Profile upsert error for ${member.email}:`, profErr.message);
      } else {
        console.log(`✅ Profile updated with role 'associate_editor' for ${member.name}`);
      }
    }

    // 3. Upsert into public.editorial_board table for public site display
    const { error: boardErr } = await supabase.from('editorial_board').insert({
      name: member.name,
      role_title: 'Associate Editor',
      affiliation: member.affiliation,
      domain: member.domain,
      bio: `Associate Editor for ${member.domain} at TJASF. Affiliated with ${member.affiliation}.`,
      sort_order: member.sort_order,
      is_active: true
    });

    if (boardErr) {
      console.log(`ℹ️ Board entry notice:`, boardErr.message);
    } else {
      console.log(`✅ Added to public Editorial Board page: ${member.name}`);
    }
  }

  console.log("\n🎉 All 5 Associate Editors successfully configured in Supabase!");
}

setupMembers();
