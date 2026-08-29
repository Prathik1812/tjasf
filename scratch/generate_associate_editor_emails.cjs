const fs = require('fs');
const path = require('path');

const members = [
  {
    name: 'Dr. A. Pramod Kumar',
    email: 'a.pramodkumar@cmrec.ac.in',
    filename: 'dr_a_pramod_kumar.html'
  },
  {
    name: 'Dr. Yelleti Vivek',
    email: 'yelleti.vivek@iimranchi.ac.in',
    filename: 'dr_yelleti_vivek.html'
  },
  {
    name: 'Dr. Amrit Mukherjee',
    email: 'amukherjee@jcu.cz',
    filename: 'dr_amrit_mukherjee.html'
  },
  {
    name: 'Dr. Abdul Aleem',
    email: 'aleemece@vjit.ac.in',
    filename: 'dr_abdul_aleem.html'
  },
  {
    name: 'Dr. Veera Venkata Subbaraju',
    email: 'bvvs.kumarfet@kiit.ac.in',
    filename: 'dr_veera_venkata_subbaraju.html'
  }
];

const outputDir = path.join(__dirname, 'associate_editors');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function generateHtml(name, email) {
  return `<div style="font-family: sans-serif; line-height: 1.6; color: #27334a; max-width: 600px; margin: 0 auto; border: 1px solid #e6e5e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
  <!-- Header with SVG Branding -->
  <div style="background-color: #102342; padding: 28px 24px; text-align: center; border-bottom: 3px solid #eb5526;">
    <img src="https://www.tjasf.com/assets/images/TJASF_logo_light.svg" alt="TJASF Logo" style="width: 140px; height: auto; filter: brightness(0) invert(1);" />
    <p style="color: #eb5526; margin: 8px 0 0 0; font-size: 11px; text-transform: uppercase; tracking: 1.5px; font-weight: bold;">Official Editorial Appointment</p>
  </div>

  <!-- Body Content -->
  <div style="padding: 32px 24px; background-color: #ffffff;">
    <h2 style="color: #102342; font-size: 18px; margin-top: 0;">Appointment as Associate Editor</h2>
    <p>Dear <strong>${name}</strong>,</p>
    <p>On behalf of the Executive Committee and Editorial Board of <strong>The Journal of Advanced Scientific Frontiers (TJASF)</strong>, we are honored to formally appoint you as an <strong>Associate Editor</strong>.</p>
    <p>In recognition of your distinguished research contributions, your leadership will be vital in guiding peer review, recommending editorial decisions, and shaping scientific quality across frontier disciplines.</p>

    <!-- Appointment & Pre-Configured Credentials Card -->
    <div style="background-color: #fbfaf8; border: 1px solid #e6e5e0; border-left: 4px solid #eb5526; padding: 18px 20px; border-radius: 6px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; color: #667082; font-weight: bold;">Your Editorial Credentials</p>
      <p style="margin: 0 0 4px 0; font-size: 14px; color: #102342;"><strong>Appointee:</strong> ${name}</p>
      <p style="margin: 0 0 4px 0; font-size: 14px; color: #102342;"><strong>Role:</strong> Associate Editor</p>
      <p style="margin: 0 0 4px 0; font-size: 14px; color: #102342;"><strong>Login Email:</strong> <span style="font-family: monospace; color: #eb5526;">${email}</span></p>
      <p style="margin: 0; font-size: 14px; color: #102342;"><strong>Temporary Password:</strong> <span style="font-family: monospace; font-weight: bold; background: #e6e5e0; padding: 2px 6px; border-radius: 3px;">TJASF@Associate2026!</span></p>
    </div>

    <p>We have pre-configured your portal account. Please click the button below to sign in and access your Associate Editor workspace:</p>
    
    <!-- Sign In Button -->
    <div style="margin: 28px 0; text-align: center;">
      <a href="https://www.tjasf.com/login" style="display: inline-block; padding: 12px 28px; background-color: #eb5526; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 14px;">Access Editor Workspace</a>
    </div>

    <p style="font-size: 13px; color: #667082;">When signing in at <a href="https://www.tjasf.com/login" style="color: #eb5526; text-decoration: none;">www.tjasf.com/login</a>, please select the <strong>Editor</strong> workspace role option.</p>

    <hr style="border: none; border-top: 1px solid #e6e5e0; margin: 24px 0;" />
    
    <p style="font-size: 13px; color: #667082; margin: 0;">Kind regards,<br />
      <strong style="color: #102342;">Dr. Rajesh Thumma</strong> (Editor in Chief)<br />
      <strong style="color: #102342;">Prathik Kumar</strong> (Managing Editor)<br />
      <strong style="color: #102342;">TJASF Editorial Office</strong><br />
      <a href="https://www.tjasf.com" style="color: #eb5526; text-decoration: none;">www.tjasf.com</a>
    </p>
  </div>
</div>`;
}

members.forEach(m => {
  const content = generateHtml(m.name, m.email);
  const filePath = path.join(outputDir, m.filename);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Generated: ${filePath}`);
});

console.log("All 5 Associate Editor HTML files generated successfully!");
