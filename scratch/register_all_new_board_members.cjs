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
    name: 'Dr. Panneerselvam Ponnusamy',
    email: 'pponnusamy@swin.edu.au',
    affiliation: 'Swinburne University of Technology'
  },
  {
    name: 'Prof. Ali Wagdy Mohamed',
    email: 'awagdy@zewailcity.edu.eg',
    affiliation: 'Zewail City of Science, Technology and Innovation'
  },
  {
    name: 'Prof. Mario Versaci',
    email: 'mario.versaci@unirc.it',
    affiliation: 'Università Mediterranea degli Studi di Reggio Calabria'
  },
  {
    name: 'Prof. Pascal Lorenz',
    email: 'pascal.lorenz@uha.fr',
    affiliation: 'University of Haute Alsace'
  },
  {
    name: 'Dr. Yelleti Vivek',
    email: 'yelleti.vivek@iimranchi.ac.in',
    affiliation: 'Indian Institute of Management Ranchi (IIM Ranchi)'
  },
  {
    name: 'Dr. Veera Venkata Subrahmanya Kumar Bhajana',
    email: 'bvvs.kumarfet@kiit.ac.in',
    affiliation: 'Kalinga Institute of Industrial Technology (KIIT) Deemed to be University'
  },
  {
    name: 'Dr. Amrit Mukherjee',
    email: 'amukherjee@jcu.cz',
    affiliation: 'University of South Bohemia'
  },
  {
    name: 'Dr. A. Pramod Kumar',
    email: 'a.pramodkumar@cmrec.ac.in',
    affiliation: 'NIT Andhra Pradesh'
  },
  {
    name: 'Dr. Abdul Aleem',
    email: 'aleemece@vjit.ac.in',
    affiliation: 'Vidya Jyothi Institute of Technology'
  }
];

const tempPassword = 'TJASF@Associate2026!';

async function setupAuthAccounts() {
  console.log("Registering Auth accounts in Supabase...");

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

    if (authErr) {
      if (authErr.message.includes('already registered')) {
        console.log(`ℹ️ Account already exists for ${member.email}`);
      } else {
        console.error(`⚠️ Auth error for ${member.email}:`, authErr.message);
      }
    } else {
      console.log(`✅ Auth account created successfully for ${member.email}`);
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
        console.log(`✅ Profile created with role 'associate_editor' for ${member.name}`);
      }
    }
  }

  console.log("\n🎉 Done registering all Editorial Board Auth accounts!");
}

setupAuthAccounts();
