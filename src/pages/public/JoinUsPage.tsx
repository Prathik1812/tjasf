import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronRight, ChevronLeft, Upload, Trash2, FileText, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const DOMAINS = [
  "Artificial Intelligence",
  "Computer Science",
  "Data Science",
  "Cybersecurity",
  "Electronics & Communication Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Robotics",
  "Internet of Things",
  "Physics",
  "Mathematics",
  "Environmental Science",
  "Materials Science"
];

const EXPERIENCE_OPTIONS = [
  "Less than 2 years",
  "2–5 years",
  "5–10 years",
  "10–15 years",
  "More than 15 years"
];

const ROLES = [
  {
    name: "Editorial Board Member",
    desc: "Active reviewer who evaluates submissions in their specialty, recommends decisions, and offers guidance on general journal policy."
  },
  {
    name: "Section Editor",
    desc: "Handles manuscripts for a specific scientific domain, assigns double-blind reviewers, monitors timelines, and recommends decisions."
  },
  {
    name: "Associate Editor",
    desc: "Supports the Editor-in-Chief in desk screening, quality control, handling appeals, and overseeing special issues."
  },
  {
    name: "Technical Editor",
    desc: "Reviews accepted drafts for formatting standards, math equation layouts, reference formatting, and code/data accessibility."
  }
];

const CONTRIBUTION_OPTIONS = [
  "Manuscript evaluation",
  "Peer-review coordination",
  "Reviewer recommendation",
  "Subject-area expertise",
  "Editorial decision support",
  "Special Issue development",
  "Research community outreach",
  "Journal development"
];

const STEPS = [
  { num: 1, label: 'Personal Info' },
  { num: 2, label: 'Academic IDs' },
  { num: 3, label: 'Research Expertise' },
  { num: 4, label: 'Editorial Role' },
  { num: 5, label: 'CV & Ethics' }
];

export default function JoinUsPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form State
  // Step 1
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2
  const [designation, setDesignation] = useState('');
  const [institution, setInstitution] = useState('');
  const [department, setDepartment] = useState('');
  const [wosId, setWosId] = useState('');
  const [scholarId, setScholarId] = useState('');
  const [scopusId, setScopusId] = useState('');
  const [orcidId, setOrcidId] = useState('');

  // Step 3
  const [primaryDomain, setPrimaryDomain] = useState('');
  const [otherPrimary, setOtherPrimary] = useState('');
  const [secondaryDomain, setSecondaryDomain] = useState('');
  const [otherSecondary, setOtherSecondary] = useState('');
  const [keywords, setKeywords] = useState('');
  const [experienceYears, setExperienceYears] = useState('');

  // Step 4
  const [proposedRole, setProposedRole] = useState('');
  const [preferredDomain, setPreferredDomain] = useState('');
  const [otherPreferred, setOtherPreferred] = useState('');
  const [motivation, setMotivation] = useState('');
  const [contributions, setContributions] = useState<string[]>([]);
  const [otherContribution, setOtherContribution] = useState('');

  // Step 5
  const [cvFileName, setCvFileName] = useState('');
  const [cvFileUrl, setCvFileUrl] = useState('');
  const [uploadingCv, setUploadingCv] = useState(false);
  const [hasConflict, setHasConflict] = useState<string>('');
  const [agreedConfidentiality, setAgreedConfidentiality] = useState<string>('');
  const [agreedEthics, setAgreedEthics] = useState<string>('');
  const [agreedRecusal, setAgreedRecusal] = useState<string>('');

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Invalid File Type: Your CV must be uploaded in PDF format.');
      setCvFileName('');
      setCvFileUrl('');
      e.target.value = '';
      return;
    }

    setCvFileName(file.name);
    setUploadingCv(true);
    setError('');

    try {
      const filePath = `recruitment-cvs/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('manuscripts').upload(filePath, file);
      if (upErr) throw upErr;

      const { data: pubData } = supabase.storage.from('manuscripts').getPublicUrl(filePath);
      setCvFileUrl(pubData.publicUrl);
    } catch (err: any) {
      setError('Failed to upload CV file: ' + (err.message || err));
      setCvFileName('');
      setCvFileUrl('');
    } finally {
      setUploadingCv(false);
    }
  };

  const handleContributionToggle = (option: string) => {
    if (contributions.includes(option)) {
      setContributions(contributions.filter(c => c !== option));
    } else {
      setContributions([...contributions, option]);
    }
  };

  const validateStep = () => {
    if (step === 1) {
      return fullName.trim() !== '' && email.trim() !== '' && country.trim() !== '' && phone.trim() !== '';
    }
    if (step === 2) {
      return designation.trim() !== '' && institution.trim() !== '' && department.trim() !== '' && orcidId.trim() !== '';
    }
    if (step === 3) {
      const primValid = primaryDomain === 'Other' ? otherPrimary.trim() !== '' : primaryDomain !== '';
      return primValid && keywords.trim() !== '' && experienceYears !== '';
    }
    if (step === 4) {
      const prefValid = preferredDomain === 'Other' ? otherPreferred.trim() !== '' : preferredDomain !== '';
      return proposedRole !== '' && prefValid && motivation.trim() !== '' && (contributions.length > 0 || otherContribution.trim() !== '');
    }
    if (step === 5) {
      return (
        cvFileUrl !== '' &&
        hasConflict !== '' &&
        agreedConfidentiality === 'Yes' &&
        agreedEthics === 'Yes' &&
        agreedRecusal === 'Yes'
      );
    }
    return false;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    const finalPrimary = primaryDomain === 'Other' ? `Other: ${otherPrimary}` : primaryDomain;
    const finalSecondary = secondaryDomain === 'Other' ? `Other: ${otherSecondary}` : secondaryDomain;
    const finalPreferred = preferredDomain === 'Other' ? `Other: ${otherPreferred}` : preferredDomain;

    let finalContributions = [...contributions];
    if (otherContribution.trim()) {
      finalContributions.push(`Other: ${otherContribution.trim()}`);
    }

    try {
      const { error: insErr } = await supabase.from('recruitment_applications').insert({
        full_name: fullName,
        email,
        country,
        phone,
        designation,
        institution,
        department,
        web_of_science_id: wosId,
        google_scholar_id: scholarId,
        scopus_id: scopusId,
        orcid_id: orcidId,
        primary_domain: finalPrimary,
        secondary_domain: finalSecondary,
        research_keywords: keywords,
        experience_years: experienceYears,
        proposed_role: proposedRole,
        preferred_domain: finalPreferred,
        motivation_text: motivation,
        contributions: finalContributions,
        cv_url: cvFileUrl,
        has_conflict_of_interest: hasConflict === 'Yes',
        agreed_confidentiality: agreedConfidentiality === 'Yes',
        agreed_ethics: agreedEthics === 'Yes',
        agreed_recusal: agreedRecusal === 'Yes',
        status: 'pending'
      });

      if (insErr) throw insErr;
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application form.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-[700px] mx-auto px-8 py-20 text-center">
        <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-200">
          <Check size={32} />
        </div>
        <h1 className="font-['Playfair_Display'] font-medium text-4xl text-[#102342] mb-4">Application Submitted!</h1>
        <p className="text-[#667082] text-base leading-relaxed max-w-[550px] mx-auto mb-8">
          Thank you for your interest in joining the Editorial Board of **The Journal of Advanced Scientific Frontiers (TJASF)**.
          <br /><br />
          Our editorial team will screen your academic CV and verify your research credentials. Shortlisted candidates will be contacted via their professional email regarding the next steps.
        </p>
        <Link to="/" className="inline-flex px-6 py-3 bg-[#102342] text-white text-xs font-bold rounded-lg hover:bg-[#eb5526] transition-colors">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[850px] mx-auto px-8 py-16">
      <div className="text-[#eb5526] uppercase tracking-[0.14em] text-[10px] font-bold mb-4">Join Our Team</div>
      <h1 className="font-['Playfair_Display'] font-medium text-[clamp(32px,4.5vw,48px)] leading-[1.1] text-[#102342] mb-4">
        Editorial Board Recruitment
      </h1>
      <p className="text-[#667082] text-sm leading-relaxed mb-10 max-w-[720px]">
        The Journal of Advanced Scientific Frontiers (TJASF) is inviting qualified academics, researchers, and scientific leaders to join its Editorial Board. Help shape peer review criteria, oversee submission tracks, and guide scientific communication across emerging frontiers.
      </p>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-10 overflow-x-auto pb-4">
        {STEPS.map((s) => (
          <div key={s.num} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 min-w-[70px]">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step > s.num ? 'bg-green-500 text-white' : step === s.num ? 'bg-[#eb5526] text-white' : 'bg-[#f1f0ec] text-[#667082]'
              }`}>
                {step > s.num ? <Check size={14} /> : s.num}
              </div>
              <span className={`text-[9px] font-semibold tracking-wide uppercase text-center ${step >= s.num ? 'text-[#102342]' : 'text-[#667082]'}`}>{s.label}</span>
            </div>
            {s.num < 5 && <div className={`flex-1 h-0.5 mx-2 min-w-[30px] ${step > s.num ? 'bg-green-500' : 'bg-[#e6e5e0]'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#e6e5e0] rounded-lg p-8 shadow-sm">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-lg text-sm mb-6 flex gap-2"><Info size={16} className="shrink-0 mt-0.5" />{error}</div>}

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-['Playfair_Display'] font-semibold text-[#102342] text-xl pb-2 border-b border-[#f1f0ec]">Section 1: Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Full Name *</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Dr. Jane Smith" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Professional Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. j.smith@university.edu" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Country *</label>
                <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. India" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Phone / WhatsApp *</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +91 98765 43210" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526]" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Academic Identifiers */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-['Playfair_Display'] font-semibold text-[#102342] text-xl pb-2 border-b border-[#f1f0ec]">Section 2: Professional Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Current Designation *</label>
                <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Associate Professor" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Institution / University *</label>
                <input type="text" value={institution} onChange={e => setInstitution(e.target.value)} placeholder="e.g. Anurag University" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Department *</label>
                <input type="text" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Computer Science" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526]" />
              </div>
            </div>

            <div className="border-t border-[#f1f0ec] pt-4 space-y-4">
              <span className="block text-xs font-bold text-[#102342] uppercase tracking-wider mb-2">Research Registry Identifiers</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#667082] uppercase tracking-wide mb-1">ORCID ID (Required) *</label>
                  <input type="text" value={orcidId} onChange={e => setOrcidId(e.target.value)} placeholder="0000-XXXX-XXXX-XXXX" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#667082] uppercase tracking-wide mb-1">Web of Science ResearcherID (Optional)</label>
                  <input type="text" value={wosId} onChange={e => setWosId(e.target.value)} placeholder="A-XXXX-YYYY" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#667082] uppercase tracking-wide mb-1">Google Scholar ID (Optional)</label>
                  <input type="text" value={scholarId} onChange={e => setScholarId(e.target.value)} placeholder="e.g. h1YpE80AAAAJ" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526]" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#667082] uppercase tracking-wide mb-1">Scopus Author ID (Optional)</label>
                  <input type="text" value={scopusId} onChange={e => setScopusId(e.target.value)} placeholder="e.g. 57204983400" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Expertise */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-['Playfair_Display'] font-semibold text-[#102342] text-xl pb-2 border-b border-[#f1f0ec]">Section 3: Academic Fields &amp; Expertise</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Primary Domain *</label>
                <select value={primaryDomain} onChange={e => setPrimaryDomain(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526] bg-white">
                  <option value="">-- Select Domain --</option>
                  {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                  <option value="Other">Other</option>
                </select>
                {primaryDomain === 'Other' && (
                  <input type="text" value={otherPrimary} onChange={e => setOtherPrimary(e.target.value)} placeholder="Please specify your primary domain" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526] mt-2" />
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Secondary Domain (Optional)</label>
                <select value={secondaryDomain} onChange={e => setSecondaryDomain(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526] bg-white">
                  <option value="">-- Select Domain --</option>
                  {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                  <option value="Other">Other</option>
                </select>
                {secondaryDomain === 'Other' && (
                  <input type="text" value={otherSecondary} onChange={e => setOtherSecondary(e.target.value)} placeholder="Please specify your secondary domain" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526] mt-2" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Research Keywords *</label>
              <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="e.g. Deep Learning, Sensor Networks, Power Electronics (comma separated)" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-2.5">Years of Research Experience *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {EXPERIENCE_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2.5 border border-[#e6e5e0] rounded-lg p-3 bg-[#fbfaf8] hover:bg-[#f5f4f0] cursor-pointer text-xs text-[#27334a]">
                    <input type="radio" name="experience" checked={experienceYears === opt} onChange={() => setExperienceYears(opt)} />
                    {opt}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Proposed Role */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="font-['Playfair_Display'] font-semibold text-[#102342] text-xl pb-2 border-b border-[#f1f0ec]">Section 4: Proposed Role &amp; Contributions</h2>
            
            {/* Roles selector with descriptions */}
            <div>
              <label className="block text-xs font-bold text-[#102342] uppercase tracking-wider mb-3">Proposed Editorial Role *</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ROLES.map(role => (
                  <label key={role.name} className={`flex items-start gap-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                    proposedRole === role.name ? 'border-[#eb5526] bg-[#eb5526]/5' : 'border-[#e6e5e0] bg-[#fbfaf8] hover:bg-[#f5f4f0]'
                  }`}>
                    <input type="radio" name="proposed_role" checked={proposedRole === role.name} onChange={() => setProposedRole(role.name)} className="mt-1" />
                    <div>
                      <span className="block text-sm font-bold text-[#102342]">{role.name}</span>
                      <span className="block text-xs text-[#667082] leading-relaxed mt-1">{role.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Preferred Editorial Domain / Section *</label>
              <select value={preferredDomain} onChange={e => setPreferredDomain(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526] bg-white">
                <option value="">-- Select Section --</option>
                {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                <option value="Other">Other</option>
              </select>
              {preferredDomain === 'Other' && (
                <input type="text" value={otherPreferred} onChange={e => setOtherPreferred(e.target.value)} placeholder="Please specify section" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526] mt-2" />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">What interests you about joining the TJASF Editorial Board? *</label>
              <textarea rows={4} value={motivation} onChange={e => setMotivation(e.target.value)} placeholder="Share your motivation and key scientific alignment..." className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526] resize-none" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#102342] uppercase tracking-wider mb-2">How can you contribute to TJASF? (Select all that apply) *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CONTRIBUTION_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2.5 border border-[#e6e5e0] rounded-lg p-3 bg-[#fbfaf8] hover:bg-[#f5f4f0] cursor-pointer text-xs text-[#27334a]">
                    <input type="checkbox" checked={contributions.includes(opt)} onChange={() => handleContributionToggle(opt)} />
                    {opt}
                  </label>
                ))}
              </div>
              <div className="mt-3">
                <label className="block text-[10px] font-bold text-[#667082] uppercase tracking-wide mb-1">Other contribution:</label>
                <input type="text" value={otherContribution} onChange={e => setOtherContribution(e.target.value)} placeholder="e.g. Hosting conferences, indexing contacts" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-xs outline-none focus:border-[#eb5526]" />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: CV & Ethics */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="font-['Playfair_Display'] font-semibold text-[#102342] text-xl pb-2 border-b border-[#f1f0ec]">Section 5: Academic Profile &amp; Ethics</h2>
            
            {/* CV PDF upload */}
            <div>
              <label className="block text-xs font-bold text-[#102342] uppercase tracking-wider mb-1.5">Curriculum Vitae / Academic CV (PDF only) *</label>
              <div className="border-2 border-dashed border-[#d8d8d1] rounded-lg p-8 text-center bg-[#fbfaf8]">
                {uploadingCv ? (
                  <div className="py-4 space-y-3">
                    <div className="w-8 h-8 border-3 border-t-[#eb5526] border-[#f1f0ec] rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-semibold text-[#102342]">Uploading academic CV...</p>
                  </div>
                ) : cvFileName ? (
                  <div className="flex items-center justify-center gap-2 text-xs text-[#102342]">
                    <FileText size={16} className="text-[#eb5526]" /> {cvFileName}
                    <button onClick={() => { setCvFileName(''); setCvFileUrl(''); }} className="ml-2 text-red-500 hover:text-red-700">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={28} className="mx-auto text-[#d8d8d1] mb-2" />
                    <p className="text-xs text-[#667082] mb-1">Drag and drop or click to upload</p>
                    <p className="text-[10px] text-[#667082] mb-3">PDF format only (Max 10MB)</p>
                    <input type="file" accept=".pdf" onChange={handleCvUpload} id="cv-upload-input" className="hidden" />
                    <label htmlFor="cv-upload-input" className="inline-block px-3.5 py-1.5 bg-[#f1f0ec] text-xs font-bold text-[#102342] rounded cursor-pointer hover:bg-[#eeece7]">
                      Choose PDF
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Ethics & Conflict declarations */}
            <div className="border-t border-[#f1f0ec] pt-5 space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wider mb-2">Do you have any conflict of interest that may affect your editorial responsibilities? *</label>
                <div className="flex gap-4">
                  {['No', 'Yes'].map(opt => (
                    <label key={opt} className="flex items-center gap-2 text-sm text-[#27334a] cursor-pointer">
                      <input type="radio" name="conflict" checked={hasConflict === opt} onChange={() => setHasConflict(opt)} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <span className="block text-xs font-bold text-[#102342] uppercase tracking-wider">Ethics &amp; Operations Agreements</span>
                
                {/* Agreement 1 */}
                <div className="flex items-start gap-3 border border-[#e6e5e0] rounded-lg p-4 bg-[#fbfaf8]">
                  <input type="checkbox" id="agreed-conf" checked={agreedConfidentiality === 'Yes'} onChange={e => setAgreedConfidentiality(e.target.checked ? 'Yes' : '')} className="mt-1" />
                  <label htmlFor="agreed-conf" className="text-xs text-[#667082] leading-relaxed cursor-pointer select-none">
                    Are you willing to maintain the confidentiality of submitted manuscripts, reviewer information, editorial discussions, and other confidential materials associated with the TJASF editorial process? *
                  </label>
                </div>

                {/* Agreement 2 */}
                <div className="flex items-start gap-3 border border-[#e6e5e0] rounded-lg p-4 bg-[#fbfaf8]">
                  <input type="checkbox" id="agreed-eth" checked={agreedEthics === 'Yes'} onChange={e => setAgreedEthics(e.target.checked ? 'Yes' : '')} className="mt-1" />
                  <label htmlFor="agreed-eth" className="text-xs text-[#667082] leading-relaxed cursor-pointer select-none">
                    Are you willing to follow the publication ethics, editorial policies, peer-review principles, and conflict-of-interest requirements established by TJASF? *
                  </label>
                </div>

                {/* Agreement 3 */}
                <div className="flex items-start gap-3 border border-[#e6e5e0] rounded-lg p-4 bg-[#fbfaf8]">
                  <input type="checkbox" id="agreed-rec" checked={agreedRecusal === 'Yes'} onChange={e => setAgreedRecusal(e.target.checked ? 'Yes' : '')} className="mt-1" />
                  <label htmlFor="agreed-rec" className="text-xs text-[#667082] leading-relaxed cursor-pointer select-none">
                    Are you willing to recuse yourself from handling manuscripts where a conflict of interest or other circumstance could compromise impartial editorial judgment? *
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Nav Buttons */}
        <div className="flex justify-between items-center mt-8 border-t border-[#f1f0ec] pt-6">
          <button
            onClick={() => setStep(prev => prev - 1)}
            disabled={step === 1 || submitting}
            className="inline-flex items-center gap-1 px-4 py-2 border border-[#d8d8d1] rounded-lg text-xs font-bold text-[#102342] hover:bg-[#fbfaf8] disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} /> Back
          </button>
          
          {step < 5 ? (
            <button
              onClick={() => setStep(prev => prev + 1)}
              disabled={!validateStep()}
              className="inline-flex items-center gap-1 px-5 py-2.5 bg-[#102342] hover:bg-[#eb5526] text-white text-xs font-bold rounded-lg disabled:opacity-35 transition-colors"
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!validateStep() || submitting}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#eb5526] hover:bg-[#d7461c] text-white text-xs font-bold rounded-lg disabled:opacity-35 transition-colors shadow-sm animate-pulse"
            >
              {submitting ? 'Submitting Application...' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
