const fs = require('fs');
const path = require('path');

const members = [
  { name: 'Dr. A. Pramod Kumar', filename: 'dr_a_pramod_kumar_invitation.html' },
  { name: 'Dr. Yelleti Vivek', filename: 'dr_yelleti_vivek_invitation.html' },
  { name: 'Dr. Amrit Mukherjee', filename: 'dr_amrit_mukherjee_invitation.html' },
  { name: 'Dr. Abdul Aleem', filename: 'dr_abdul_aleem_invitation.html' },
  { name: 'Dr. Veera Venkata Subbaraju', filename: 'dr_veera_venkata_subbaraju_invitation.html' }
];

const outputDir = path.join(__dirname, 'board_invitations');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function generateHtml(name) {
  return `<div style="font-family: sans-serif; line-height: 1.6; color: #27334a; max-width: 600px; margin: 0 auto; border: 1px solid #e6e5e0; border-radius: 8px; overflow: hidden;">
  <div style="background-color: #102342; padding: 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">TJASF</h1>
    <p style="color: #eb5526; margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase;">Official Appointment</p>
  </div>
  <div style="padding: 32px 24px; background-color: #ffffff;">
    <h2 style="color: #102342; font-size: 18px; margin-top: 0;">Editorial Board Membership</h2>
    <p>Dear <strong>${name}</strong>,</p>
    <p>On behalf of the Executive Committee and Editorial Office of <strong>The Journal of Advanced Scientific Frontiers (TJASF)</strong>, we are honored to formally invite you to serve as an esteemed Member of the Editorial Board.</p>
    <p>In recognition of your distinguished academic contributions and expertise, your guidance will be invaluable in upholding the highest standards of double-blind peer review, shaping special issues, and driving scientific advancement across frontier research disciplines.</p>
    <div style="background-color: #fbfaf8; border: 1px solid #e6e5e0; border-left: 4px solid #eb5526; padding: 16px; border-radius: 6px; margin: 24px 0;">
      <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #667082; font-weight: bold;">Appointment Details</p>
      <p style="margin: 0 0 4px 0; font-size: 14px; color: #102342;"><strong>Appointee:</strong> ${name}</p>
      <p style="margin: 0 0 4px 0; font-size: 14px; color: #102342;"><strong>Role:</strong> Editorial Board Member & Reviewer Panel</p>
      <p style="margin: 0; font-size: 14px; color: #102342;"><strong>Journal:</strong> The Journal of Advanced Scientific Frontiers (TJASF)</p>
    </div>
    <p>Please click the button below to complete your registration and activate your Editorial Workspace:</p>
    <div style="margin: 28px 0; text-align: center;">
      <a href="https://www.tjasf.com/register" style="display: inline-block; padding: 12px 28px; background-color: #eb5526; color: #ffffff; text-decoration: none; font-weight: bold; border-radius: 6px; font-size: 14px;">Activate Editorial Account</a>
    </div>
    <p style="font-size: 13px; color: #667082;">If you already have an account, you can sign in directly at <a href="https://www.tjasf.com/login" style="color: #eb5526; text-decoration: none;">www.tjasf.com/login</a> and select the Editor workspace role.</p>
    <hr style="border: none; border-top: 1px solid #e6e5e0; margin: 24px 0;" />
    <p style="font-size: 13px; color: #667082; margin: 0;">Kind regards,<br /><strong style="color: #102342;">Dr. Rajesh Thumma & Prathik Kumar</strong><br /><strong style="color: #102342;">TJASF Editorial Office</strong><br /><a href="https://www.tjasf.com" style="color: #eb5526; text-decoration: none;">www.tjasf.com</a></p>
  </div>
</div>`;
}

members.forEach(member => {
  const content = generateHtml(member.name);
  const filePath = path.join(outputDir, member.filename);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Generated: ${filePath}`);
});

console.log("All 5 HTML invitation files generated successfully!");
