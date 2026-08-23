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
    name: "Associate Editor",
    desc: "Handles assigned manuscripts throughout the editorial process, including initial evaluation, reviewer selection, assessment of peer-review reports, and recommendation of editorial decisions to the Editor-in-Chief. Ensures that manuscripts meet the journal's quality, ethical, and scientific standards."
  },
  {
    name: "Section Editor",
    desc: "Manages manuscripts within a designated subject area. Performs preliminary scope and quality checks, assigns qualified peer reviewers, monitors review progress, and provides editorial recommendations to the Associate Editor or Editor-in-Chief."
  },
  {
    name: "Editorial Board Member",
    desc: "Supports the journal by reviewing manuscripts within their area of expertise, recommending qualified reviewers, advising on editorial policies, promoting the journal internationally, and contributing to its academic development and visibility."
  },
  {
    name: "Peer Reviewer",
    desc: "Conducts objective, confidential, and constructive double-blind peer reviews. Evaluates manuscripts for originality, scientific quality, methodology, significance, clarity, and ethical compliance, and submits recommendations to the handling editor within the specified review period."
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
  { num: 2, label: 'Research IDs' },
  { num: 3, label: 'Research Profile' },
  { num: 4, label: 'Editorial Role' },
  { num: 5, label: 'Ethics & CV' }
];

export default function JoinUsPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form States
  // Section 1: Contact Info
  const [title, setTitle] = useState('');
  const [fullName, setFullName] = useState('');
  const [highestQualification, setHighestQualification] = useState('');
  const [institution, setInstitution] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [email, setEmail] = useState('');
  const [alternativeEmail, setAlternativeEmail] = useState('');
  const [country, setCountry] = useState('');
  const [phone, setPhone] = useState('');

  // Section 2: Research IDs
  const [wosId, setWosId] = useState('');
  const [scopusId, setScopusId] = useState('');
  const [scholarId, setScholarId] = useState('');
  const [orcidId, setOrcidId] = useState('');
  const [linkedinProfile, setLinkedinProfile] = useState('');
  const [researchgateProfile, setResearchgateProfile] = useState('');
  const [scopusHIndex, setScopusHIndex] = useState('');
  const [googleScholarHIndex, setGoogleScholarHIndex] = useState('');

  // Section 3: Research Profile
  const [experienceYears, setExperienceYears] = useState('');
  const [primaryDomain, setPrimaryDomain] = useState('');
  const [otherPrimary, setOtherPrimary] = useState('');
  const [keywords, setKeywords] = useState(''); // Areas of Research Expertise
  const [researchInterests, setResearchInterests] = useState('');
  const [totalPublications, setTotalPublications] = useState('');
  const [recentPublications, setRecentPublications] = useState('');

  // Section 4: Editorial Role
  const [servedEditorialBoard, setServedEditorialBoard] = useState('');
  const [editorialBoardDetails, setEditorialBoardDetails] = useState('');
  const [proposedRole, setProposedRole] = useState('');
  const [preferredDomain, setPreferredDomain] = useState('');
  const [otherPreferred, setOtherPreferred] = useState('');
  const [motivation, setMotivation] = useState('');
  const [contributions, setContributions] = useState<string[]>([]);
  const [otherContribution, setOtherContribution] = useState('');

  // Section 5: Ethics & CV
  const [cvFileName, setCvFileName] = useState('');
  const [cvFileUrl, setCvFileUrl] = useState('');
  const [uploadingCv, setUploadingCv] = useState(false);
  const [hasConflict, setHasConflict] = useState<string>('');
  const [agreedConfidentiality, setAgreedConfidentiality] = useState<string>('');
  const [agreedEthics, setAgreedEthics] = useState<string>('');
  const [agreedRecusal, setAgreedRecusal] = useState<string>('');
  const [agreedGrowth, setAgreedGrowth] = useState<string>('');
  const [finalDeclaration, setFinalDeclaration] = useState(false);

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
      return (
        title.trim() !== '' &&
        fullName.trim() !== '' &&
        highestQualification.trim() !== '' &&
        institution.trim() !== '' &&
        department.trim() !== '' &&
        designation.trim() !== '' &&
        email.trim() !== '' &&
        alternativeEmail.trim() !== '' &&
        country.trim() !== '' &&
        phone.trim() !== ''
      );
    }
    if (step === 2) {
      return (
        wosId.trim() !== '' &&
        scopusId.trim() !== '' &&
        scholarId.trim() !== '' &&
        orcidId.trim() !== '' &&
        linkedinProfile.trim() !== '' &&
        researchgateProfile.trim() !== '' &&
        scopusHIndex.trim() !== '' &&
        googleScholarHIndex.trim() !== ''
      );
    }
    if (step === 3) {
      const primValid = primaryDomain === 'Other' ? otherPrimary.trim() !== '' : primaryDomain !== '';
      return (
        experienceYears !== '' &&
        primValid &&
        keywords.trim() !== '' &&
        researchInterests.trim() !== '' &&
        totalPublications.trim() !== '' &&
        recentPublications.trim() !== ''
      );
    }
    if (step === 4) {
      const prefValid = preferredDomain === 'Other' ? otherPreferred.trim() !== '' : preferredDomain !== '';
      const servedValid = servedEditorialBoard === 'No' || (servedEditorialBoard === 'Yes' && editorialBoardDetails.trim() !== '');
      return (
        servedEditorialBoard !== '' &&
        servedValid &&
        proposedRole !== '' &&
        prefValid &&
        motivation.trim() !== '' &&
        (contributions.length > 0 || otherContribution.trim() !== '')
      );
    }
    if (step === 5) {
      return (
        cvFileUrl !== '' &&
        hasConflict !== '' &&
        agreedConfidentiality === 'Yes' &&
        agreedEthics === 'Yes' &&
        agreedRecusal === 'Yes' &&
        agreedGrowth === 'Yes' &&
        finalDeclaration === true
      );
    }
    return false;
  };

  const handleNext = () => {
    setError('');

    if (step === 1) {
      const nameRegex = /^[a-zA-Z\s\.\-]+$/;
      if (!nameRegex.test(fullName.trim())) {
        setError('Full Name must only contain letters, spaces, periods, or hyphens (no numbers).');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError('Please enter a valid official institutional email.');
        return;
      }
      if (!emailRegex.test(alternativeEmail.trim())) {
        setError('Please enter a valid alternative email.');
        return;
      }

      const cleanPhone = phone.trim();
      const phoneDigits = cleanPhone.replace(/[^0-9]/g, '');
      if (phoneDigits.length < 8 || phoneDigits.length > 15) {
        setError('Please enter a valid phone number (8 to 15 digits total).');
        return;
      }
    }

    setStep(prev => prev + 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');

    const finalPrimary = primaryDomain === 'Other' ? `Other: ${otherPrimary}` : primaryDomain;
    const finalPreferred = preferredDomain === 'Other' ? `Other: ${otherPreferred}` : preferredDomain;

    let finalContributions = [...contributions];
    if (otherContribution.trim()) {
      finalContributions.push(`Other: ${otherContribution.trim()}`);
    }

    try {
      const { error: insErr } = await supabase.from('recruitment_applications').insert({
        title,
        full_name: fullName,
        highest_qualification: highestQualification,
        institution,
        department,
        designation,
        email,
        alternative_email: alternativeEmail,
        country,
        phone,
        web_of_science_id: wosId,
        scopus_id: scopusId,
        google_scholar_id: scholarId,
        orcid_id: orcidId,
        linkedin_profile: linkedinProfile,
        researchgate_profile: researchgateProfile,
        scopus_h_index: scopusHIndex,
        google_scholar_h_index: googleScholarHIndex,
        experience_years: experienceYears,
        primary_domain: finalPrimary,
        research_keywords: keywords,
        research_interests: researchInterests,
        total_publications: totalPublications,
        recent_publications: recentPublications,
        served_editorial_board: servedEditorialBoard === 'Yes',
        editorial_board_details: editorialBoardDetails,
        proposed_role: proposedRole,
        preferred_domain: finalPreferred,
        motivation_text: motivation,
        contributions: finalContributions,
        cv_url: cvFileUrl,
        has_conflict_of_interest: hasConflict === 'Yes',
        agreed_confidentiality: agreedConfidentiality === 'Yes',
        agreed_ethics: agreedEthics === 'Yes',
        agreed_recusal: agreedRecusal === 'Yes',
        agreed_growth: agreedGrowth === 'Yes',
        final_declaration: finalDeclaration,
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
          Thank you for applying to join the Editorial Board of **The Journal of Advanced Scientific Frontiers (TJASF)**.
          <br /><br />
          Our editorial team will evaluate your credentials, research record, and academic CV. Shortlisted candidates will be contacted via their official institutional email regarding the next steps.
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
        The Journal of Advanced Scientific Frontiers (TJASF) is inviting qualified academics, researchers, scientists, and industry leaders to join its Editorial Board. Please complete the form below.
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
            <h2 className="font-['Playfair_Display'] font-semibold text-[#102342] text-xl pb-2 border-b border-[#f1f0ec]">Section 1: Personal & Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Title *</label>
                <select value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526] bg-white">
                  <option value="">-- Select Title --</option>
                  <option value="Dr.">Dr.</option>
                  <option value="Prof.">Prof.</option>
                  <option value="Mr.">Mr.</option>
                  <option value="Ms.">Ms.</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Full Name *</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Jane Smith" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Highest Qualification *</label>
                <input type="text" value={highestQualification} onChange={e => setHighestQualification(e.target.value)} placeholder="e.g. Ph.D. in Computer Science" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Designation *</label>
                <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. Associate Professor" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Institution / University *</label>
                <input type="text" value={institution} onChange={e => setInstitution(e.target.value)} placeholder="e.g. Anurag University" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Department *</label>
                <input type="text" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Computer Science and Engineering" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Official Institutional Email *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="e.g. j.smith@university.edu" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Alternative Email *</label>
                <input type="email" value={alternativeEmail} onChange={e => setAlternativeEmail(e.target.value)} placeholder="e.g. janesmith@gmail.com" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Country *</label>
                <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. India" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Phone / WhatsApp *</label>
                <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. +91 98765 43210" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Research IDs */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-['Playfair_Display'] font-semibold text-[#102342] text-xl pb-2 border-b border-[#f1f0ec]">Section 2: Research Identifiers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">ORCID ID *</label>
                <input type="text" value={orcidId} onChange={e => setOrcidId(e.target.value)} placeholder="0000-XXXX-XXXX-XXXX" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Web of Science ResearcherID *</label>
                <input type="text" value={wosId} onChange={e => setWosId(e.target.value)} placeholder="e.g. A-XXXX-YYYY" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Scopus Author ID *</label>
                <input type="text" value={scopusId} onChange={e => setScopusId(e.target.value)} placeholder="e.g. 57204983400" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Google Scholar ID *</label>
                <input type="text" value={scholarId} onChange={e => setScholarId(e.target.value)} placeholder="e.g. h1YpE80AAAAJ" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">LinkedIn Profile Link *</label>
                <input type="text" value={linkedinProfile} onChange={e => setLinkedinProfile(e.target.value)} placeholder="https://linkedin.com/in/username" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">ResearchGate Profile Link *</label>
                <input type="text" value={researchgateProfile} onChange={e => setResearchgateProfile(e.target.value)} placeholder="https://researchgate.net/profile/username" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Scopus H-Index *</label>
                <input type="text" value={scopusHIndex} onChange={e => setScopusHIndex(e.target.value)} placeholder="e.g. 15" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Google Scholar H-index, i10-Index *</label>
                <input type="text" value={googleScholarHIndex} onChange={e => setGoogleScholarHIndex(e.target.value)} placeholder="e.g. H-index: 18, i10-index: 25" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Research Profile */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-['Playfair_Display'] font-semibold text-[#102342] text-xl pb-2 border-b border-[#f1f0ec]">Section 3: Research Profile</h2>
            
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

            <div>
              <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Primary Research Domain *</label>
              <select value={primaryDomain} onChange={e => setPrimaryDomain(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526] bg-white">
                <option value="">-- Select Domain --</option>
                {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                <option value="Other">Other</option>
              </select>
              {primaryDomain === 'Other' && (
                <input type="text" value={otherPrimary} onChange={e => setOtherPrimary(e.target.value)} placeholder="Please specify your primary domain" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526] mt-2" />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Areas of Research Expertise *</label>
              <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="e.g. Deep Learning, Sensor Networks, Power Electronics (comma separated)" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Current Research Interests *</label>
              <textarea rows={3} value={researchInterests} onChange={e => setResearchInterests(e.target.value)} placeholder="Describe your current research interest areas..." className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526] resize-none" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">Total Journal Publications *</label>
              <input type="text" value={totalPublications} onChange={e => setTotalPublications(e.target.value)} placeholder="e.g. 24" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#102342] uppercase tracking-wide mb-1.5">List your five most recent peer-reviewed journal publications *</label>
              <textarea rows={5} value={recentPublications} onChange={e => setRecentPublications(e.target.value)} placeholder="1. Title, Journal, Year&#10;2. Title, Journal, Year..." className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526] resize-none font-mono" />
            </div>
          </div>
        )}

        {/* Step 4: Editorial Role */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="font-['Playfair_Display'] font-semibold text-[#102342] text-xl pb-2 border-b border-[#f1f0ec]">Section 4: Proposed Editorial Role</h2>
            
            {/* Served editorial board options */}
            <div>
              <label className="block text-xs font-bold text-[#102342] uppercase tracking-wider mb-2">Have you served on an Editorial Board? *</label>
              <div className="flex gap-4 mb-2">
                {['No', 'Yes'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 text-sm text-[#27334a] cursor-pointer">
                    <input type="radio" name="servedBoard" checked={servedEditorialBoard === opt} onChange={() => setServedEditorialBoard(opt)} />
                    {opt}
                  </label>
                ))}
              </div>
              {servedEditorialBoard === 'Yes' && (
                <textarea rows={3} value={editorialBoardDetails} onChange={e => setEditorialBoardDetails(e.target.value)} placeholder="Please provide the journal name(s), your role, publisher, and duration of service." className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526] resize-none mt-1" />
              )}
            </div>

            {/* Roles selector with descriptions */}
            <div>
              <label className="block text-xs font-bold text-[#102342] uppercase tracking-wider mb-3">Proposed Role *</label>
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
              <select value={preferredDomain} onChange={e => setPreferredDomain(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-[#eb5526] bg-white">
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
              <textarea rows={3} value={motivation} onChange={e => setMotivation(e.target.value)} placeholder="Share your motivation..." className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2 text-sm outline-none focus:border-[#eb5526] resize-none" />
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
                <input type="text" value={otherContribution} onChange={e => setOtherContribution(e.target.value)} placeholder="e.g. hosting special issues, promoting to networks" className="w-full border border-[#d8d8d1] rounded-lg px-3.5 py-2.5 text-xs outline-none focus:border-[#eb5526]" />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Ethics & CV */}
        {step === 5 && (
          <div className="space-y-6">
            <h2 className="font-['Playfair_Display'] font-semibold text-[#102342] text-xl pb-2 border-b border-[#f1f0ec]">Section 5: Ethics &amp; Conflict of Interest</h2>
            
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
                <label className="block text-xs font-bold text-[#102342] uppercase tracking-wider mb-2">Do you currently have any professional, financial, personal, institutional, or other conflict of interest that may affect your ability to perform editorial responsibilities impartially? *</label>
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

                {/* Agreement 4 */}
                <div className="flex items-start gap-3 border border-[#e6e5e0] rounded-lg p-4 bg-[#fbfaf8]">
                  <input type="checkbox" id="agreed-growth" checked={agreedGrowth === 'Yes'} onChange={e => setAgreedGrowth(e.target.checked ? 'Yes' : '')} className="mt-1" />
                  <label htmlFor="agreed-growth" className="text-xs text-[#667082] leading-relaxed cursor-pointer select-none">
                    Are you willing to actively contribute to the growth and international visibility of TJASF by promoting the journal, recommending qualified reviewers, and supporting high publication standards? *
                  </label>
                </div>

                {/* Final Declaration */}
                <div className="flex items-start gap-3 border border-amber-200 rounded-lg p-4 bg-amber-50/30 mt-6">
                  <input type="checkbox" id="final-decl" checked={finalDeclaration} onChange={e => setFinalDeclaration(e.target.checked)} className="mt-1" />
                  <label htmlFor="final-decl" className="text-xs text-[#102342] leading-relaxed cursor-pointer select-none font-medium">
                    I certify that the information provided in this application is true and accurate to the best of my knowledge. I agree to abide by the editorial policies, publication ethics, confidentiality requirements, and conflict-of-interest policies of The Journal of Advanced Scientific Frontiers (TJASF) if appointed to the Editorial Team. *
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
              onClick={handleNext}
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
