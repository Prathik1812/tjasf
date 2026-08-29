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

async function runUpdate() {
  console.log("Adding Launch Announcement & Updating APC Policy in Supabase...");

  // 1. Insert new pinned announcement
  const { data: annData, error: annErr } = await supabase
    .from('announcements')
    .insert({
      title: 'Launch Offer: First 2 Issues Published Free of Cost',
      body: 'To celebrate the launch of The Journal of Advanced Scientific Frontiers (TJASF), all manuscript submissions accepted for publication in the first 2 inaugural issues (Volume 1, Issues 1 & 2) will be published completely free of cost with zero article processing charges (APCs) or publication fees across both Regular and Fast-Track submission options. Authors retain full CC BY 4.0 open-access copyright. We invite researchers, scholars, and engineers worldwide to submit their original work today!',
      date: new Date().toISOString(),
      pinned: true
    })
    .select();

  if (annErr) {
    console.error("❌ Announcement error:", annErr.message);
  } else {
    console.log("✅ Pinned announcement created:", annData[0]?.title);
  }

  // 2. Update Article Processing Charges policy content
  const apcContent = 'TJASF offers two submission tracks: Regular Track (completely free of charge with standard 12-16 week review) and Fast-Track ($49 USD fee for expedited 4-8 week peer review). However, to celebrate the official launch of TJASF, publication in the first 2 inaugural issues (Volume 1, Issues 1 & 2) is completely free of cost for all accepted manuscripts across both tracks!';

  const { error: polErr } = await supabase
    .from('policies')
    .update({ content: apcContent })
    .eq('slug', 'article-processing-charges');

  if (polErr) {
    console.error("❌ Policy update error:", polErr.message);
  } else {
    console.log("✅ Article Processing Charges policy updated with $49 USD Fast-Track & Free First 2 Issues announcement!");
  }
}

runUpdate();
