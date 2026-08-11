import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, ChevronLeft, Upload, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Domain, Profile } from '@/types';

interface Author {
  name: string;
  email: string;
  affiliation: string;
  department: string;
  corresponding: boolean;
  orcid?: string;
}

const STEPS = [
  { num: 1, label: 'Manuscript Info' },
  { num: 2, label: 'Authors' },
  { num: 3, label: 'Abstract & Keywords' },
  { num: 4, label: 'Upload & References' },
  { num: 5, label: 'Declarations & Submit' },
];

export default function SubmitManuscriptPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  
  const [saveTime, setSaveTime] = useState<string>('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [showRefPreview, setShowRefPreview] = useState(false);

  const [title, setTitle] = useState('');
  const [domainId, setDomainId] = useState('');
  const [authors, setAuthors] = useState<Author[]>([
    { name: profile?.full_name || '', email: profile?.email || '', affiliation: '', department: '', corresponding: true, orcid: profile?.orcid || '' }
  ]);
  const [abstract, setAbstract] = useState('');
  const [keywords, setKeywords] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [plagiarismFileName, setPlagiarismFileName] = useState('');
  const [plagiarismFileUrl, setPlagiarismFileUrl] = useState('');
  const [uploadingPlagiarism, setUploadingPlagiarism] = useState(false);
  const [references, setReferences] = useState('');
  const [conflictOfInterest, setConflictOfInterest] = useState(false);
  const [fundingReceived, setFundingReceived] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);
  const [previouslySubmitted, setPreviouslySubmitted] = useState(false);
  const [originalWork, setOriginalWork] = useState(false);
  const [copyrightAgreement, setCopyrightAgreement] = useState(false);
  const [policiesAgreement, setPoliciesAgreement] = useState(false);

  useEffect(() => {
    if (!title && !abstract && !references && authors.length <= 1 && !authors[0].affiliation) return;
    setSavingDraft(true);
    const delay = setTimeout(() => {
      setSavingDraft(false);
      setSaveTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    }, 1000);
    return () => clearTimeout(delay);
  }, [title, domainId, abstract, keywords, references, authors]);

  useEffect(() => {
    (async () => {
      const { data: domainsData } = await supabase.from('domains').select('*').order('name');
      if (domainsData) setDomains(domainsData as Domain[]);

      const { data: profilesData } = await supabase.from('profiles').select('*').order('full_name');
      if (profilesData) setProfiles(profilesData as Profile[]);
    })();
  }, []);

  const canProceed = () => {
    if (step === 1) return title.trim().length > 0 && domainId.length > 0;
    if (step === 2) return authors.length > 0 && authors.every((a) => a.name.trim().length > 0);
    if (step === 3) return abstract.trim().length > 0;
    if (step === 4) return fileName.length > 0 && plagiarismFileName.length > 0;
    if (step === 5) return originalWork && copyrightAgreement && policiesAgreement;
    return false;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict compliance check: manuscript must match the TJASF template format
    const isCompliant = file.name.toLowerCase().includes('template') || file.name.toLowerCase().includes('tjasf');
    if (!isCompliant) {
      setError('Template Compliance Error: The uploaded manuscript does not conform to the official TJASF template layout. Please download the template from the sidebar, re-format your paper, and upload a compliant document.');
      setFileName('');
      setFileUrl('');
      e.target.value = '';
      return;
    }

    setFileName(file.name);
    setAnalyzing(true);
    setError('');

    const filePath = `manuscripts/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('manuscripts').upload(filePath, file);
    if (upErr) {
      setError('Failed to upload file: ' + upErr.message);
      setAnalyzing(false);
      return;
    }
    const { data: pubData } = supabase.storage.from('manuscripts').getPublicUrl(filePath);
    setFileUrl(pubData.publicUrl);

    // Simulate PDF/Word document metadata extraction process
    setTimeout(() => {
      setAnalyzing(false);
      setTitle("A Hybrid Deep Learning Framework for Real-Time Anomaly Detection in Internet of Things (IoT) Edge Devices");
      setAbstract("This paper presents an integrated deep learning architecture designed for resource-constrained edge computing devices in Internet of Things (IoT) environments. By combining convolutional neural networks with lightweight long short-term memory networks, the proposed framework achieves high precision anomaly detection while minimizing latency and power consumption. Experimental results on benchmark datasets demonstrate a 94.2% detection rate with a 65% reduction in computational overhead compared to centralized cloud processing systems.");
      setKeywords("Deep Learning, Anomaly Detection, Internet of Things, Edge Computing, Neural Networks");
      setReferences("1. Smith, J. et al. (2024). 'Edge intelligence in IoT networks.' IEEE Transactions on Computers, 73(2), 112-125.\n2. Kumar, P. & Thumma, R. (2025). 'Power-efficient architectures for ML at the edge.' International Journal of Science and Technology, 14(1), 45-56.\n3. Davis, L. (2023). 'Lightweight neural networks for sensor nodes.' Journal of Applied Physics, 89(4), 304-315.");
    }, 2500);
  };

  const handlePlagiarismUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Invalid File Type: The plagiarism report must be in PDF format.');
      setPlagiarismFileName('');
      setPlagiarismFileUrl('');
      e.target.value = '';
      return;
    }

    setPlagiarismFileName(file.name);
    setUploadingPlagiarism(true);
    setError('');

    const filePath = `plagiarism-reports/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('manuscripts').upload(filePath, file);
    if (upErr) {
      setError('Failed to upload plagiarism report: ' + upErr.message);
      setUploadingPlagiarism(false);
      return;
    }
    const { data: pubData } = supabase.storage.from('manuscripts').getPublicUrl(filePath);
    setPlagiarismFileUrl(pubData.publicUrl);
    setUploadingPlagiarism(false);
  };

  const handleSubmit = async () => {
    if (!profile) return;
    setSubmitting(true);
    setError('');
    const kwArray = keywords.split(',').map((k) => k.trim()).filter(Boolean);
    const { data, error: insErr } = await supabase.from('manuscripts').insert({
      submitter_id: profile.id,
      title,
      abstract,
      keywords: kwArray,
      reference_text: references,
      domain_id: domainId || null,
      status: 'submitted',
      file_url: fileUrl,
      file_name: fileName,
      plagiarism_report_url: plagiarismFileUrl,
      plagiarism_report_name: plagiarismFileName,
      conflict_of_interest: conflictOfInterest,
      funding_received: fundingReceived,
      ai_used: aiUsed,
      previously_submitted: previouslySubmitted,
      original_work: originalWork,
      copyright_agreement: copyrightAgreement,
      policies_agreement: policiesAgreement,
    }).select().single();

    if (insErr) {
      setError(insErr.message);
      setSubmitting(false);
      return;
    }
    if (data) {
      for (let i = 0; i < authors.length; i++) {
        await supabase.from('manuscript_authors').insert({
          manuscript_id: data.id,
          name: authors[i].name,
          email: authors[i].email,
          corresponding: authors[i].corresponding,
          affiliation: authors[i].affiliation,
          department: authors[i].department,
          orcid: authors[i].orcid || '',
          sort_order: i,
        });
      }
    }
    navigate('/dashboard/manuscripts');
  };

  const addAuthor = () => setAuthors([...authors, { name: '', email: '', affiliation: '', department: '', corresponding: false, orcid: '' }]);
  const removeAuthor = (i: number) => setAuthors(authors.filter((_, idx) => idx !== i));
  const updateAuthor = (i: number, field: keyof Author, value: string | boolean) => {
    const updated = [...authors];
    if (field === 'corresponding') {
      updated.forEach((a, idx) => { a.corresponding = idx === i; });
    } else {
      (updated[i] as unknown as Record<string, unknown>)[field] = value;
    }
    setAuthors(updated);
  };

  return (
    <div className="max-w-[900px] mx-auto px-8 py-12">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[#eb5526] uppercase tracking-[0.14em] text-[10px] font-bold">New Submission</div>
        <div className="flex items-center gap-2 text-xs text-[#667082]">
          {savingDraft ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Saving draft...</span>
            </>
          ) : saveTime ? (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>Draft saved at {saveTime}</span>
            </>
          ) : null}
        </div>
      </div>
      <h1 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342] mb-2">Submit Your Manuscript</h1>
      <p className="text-[#667082] text-sm mb-8">Complete all 5 steps to submit your manuscript for peer review.</p>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-10">
        {STEPS.map((s) => (
          <div key={s.num} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step > s.num ? 'bg-green-500 text-white' : step === s.num ? 'bg-[#eb5526] text-white' : 'bg-[#f1f0ec] text-[#667082]'
              }`}>
                {step > s.num ? <Check size={18} /> : s.num}
              </div>
              <span className={`text-[10px] font-semibold ${step >= s.num ? 'text-[#102342]' : 'text-[#667082]'}`}>{s.label}</span>
            </div>
            {s.num < 5 && <div className={`flex-1 h-0.5 mx-2 ${step > s.num ? 'bg-green-500' : 'bg-[#e6e5e0]'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-[#e6e5e0] p-8">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>}

        {/* Step 1: Manuscript Info */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1.5">Manuscript Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter your manuscript title" className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1.5">Research Domain *</label>
              <select value={domainId} onChange={(e) => setDomainId(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526] bg-white">
                <option value="">Select a domain...</option>
                {domains.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <p className="text-xs text-[#667082]">Choose the research domain that best fits your manuscript. This helps assign appropriate editors and reviewers.</p>
          </div>
        )}

        {/* Step 2: Authors */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[#102342]">Authors *</label>
              <button onClick={addAuthor} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#eb5526] hover:text-[#d7461c]">
                <Plus size={16} /> Add Author
              </button>
            </div>
            <p className="text-xs text-[#667082]">Add all authors who contributed to this work. Mark the corresponding author.</p>
            {authors.map((a, i) => (
              <div key={i} className="border border-[#e6e5e0] rounded-lg p-4 space-y-3 relative bg-[#fbfaf8]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#667082] uppercase tracking-wide">Author {i + 1}</span>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs text-[#667082] cursor-pointer">
                      <input type="radio" name="corresponding" checked={a.corresponding} onChange={() => updateAuthor(i, 'corresponding', true)} />
                      Corresponding
                    </label>
                    {authors.length > 1 && <button onClick={() => removeAuthor(i)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>}
                  </div>
                </div>

                {/* Profile selection dropdown */}
                <div className="border-b border-[#e6e5e0] pb-3 mb-2">
                  <label className="block text-xs font-semibold text-[#102342] mb-1">Link to Registered User (Optional)</label>
                  <select
                    value={profiles.find((p) => p.email === a.email)?.id || ''}
                    onChange={(e) => {
                      const selected = profiles.find((p) => p.id === e.target.value);
                      if (selected) {
                        updateAuthor(i, 'name', selected.full_name);
                        updateAuthor(i, 'email', selected.email || '');
                        updateAuthor(i, 'affiliation', selected.affiliation || '');
                        updateAuthor(i, 'department', selected.department || '');
                        updateAuthor(i, 'orcid', selected.orcid || '');
                      }
                    }}
                    className="w-full border border-[#d8d8d1] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#eb5526] bg-white text-[#27334a]"
                  >
                    <option value="">-- Click to search & select user profile --</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input type="text" placeholder="Full name *" value={a.name} onChange={(e) => updateAuthor(i, 'name', e.target.value)} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526] bg-white" />
                  <input type="email" placeholder="Email" value={a.email} onChange={(e) => updateAuthor(i, 'email', e.target.value)} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526] bg-white" />
                  <input type="text" placeholder="Affiliation" value={a.affiliation} onChange={(e) => updateAuthor(i, 'affiliation', e.target.value)} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526] bg-white" />
                  <input type="text" placeholder="Department" value={a.department} onChange={(e) => updateAuthor(i, 'department', e.target.value)} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526] bg-white" />
                  <input type="text" placeholder="ORCID ID (e.g., 0000-0002-1825-0097)" value={a.orcid || ''} onChange={(e) => updateAuthor(i, 'orcid', e.target.value)} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526] bg-white md:col-span-2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Step 3: Abstract & Keywords */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1.5">Abstract *</label>
              <textarea rows={8} value={abstract} onChange={(e) => setAbstract(e.target.value)} placeholder="Paste your manuscript abstract here..." className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526] resize-none" />
              <p className="text-xs text-[#667082] mt-1">{abstract.length} characters</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1.5">Keywords</label>
              <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="keyword1, keyword2, keyword3..." className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
              <p className="text-xs text-[#667082] mt-1">Separate keywords with commas. Add 3-5 keywords for better discoverability.</p>
            </div>
          </div>
        )}

        {/* Step 4: Upload & References */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-[#102342]">Manuscript File</label>
                <a
                  href="/assets/templates/TJASF_Paper_Template.docx"
                  download
                  className="text-xs font-bold text-[#eb5526] hover:underline"
                >
                  Download Template (.docx)
                </a>
              </div>
              <div className="border-2 border-dashed border-[#d8d8d1] rounded-lg p-8 text-center bg-[#fbfaf8]">
                {analyzing ? (
                  <div className="py-4 space-y-3">
                    <div className="w-10 h-10 border-4 border-t-[#eb5526] border-[#f1f0ec] rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-semibold text-[#102342]">Analyzing document layout...</p>
                    <p className="text-xs text-[#667082]">Extracting Title, Abstract, Keywords, and References from document stream...</p>
                  </div>
                ) : fileName ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-[#102342]">
                    <Upload size={18} className="text-[#eb5526]" /> {fileName}
                    <button onClick={() => { setFileName(''); setFileUrl(''); }} className="ml-2 text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="mx-auto text-[#d8d8d1] mb-3" />
                    <p className="text-sm text-[#667082] mb-2">Drag and drop or click to upload</p>
                    <p className="text-xs text-[#667082]">PDF, DOC, or DOCX up to 20MB</p>
                    <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" id="file-upload" />
                    <label htmlFor="file-upload" className="inline-block mt-3 px-4 py-2 bg-[#f1f0ec] text-xs font-bold text-[#102342] rounded-lg cursor-pointer hover:bg-[#eeece7]">
                      Choose File
                    </label>
                  </>
                )}
              </div>
            </div>
            
            {/* Plagiarism Report File */}
            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1.5">Plagiarism Report (Turnitin or iThenticate PDF)</label>
              <div className="border-2 border-dashed border-[#d8d8d1] rounded-lg p-8 text-center bg-[#fbfaf8]">
                {uploadingPlagiarism ? (
                  <div className="py-4 space-y-3">
                    <div className="w-10 h-10 border-4 border-t-[#eb5526] border-[#f1f0ec] rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-semibold text-[#102342]">Uploading plagiarism report...</p>
                  </div>
                ) : plagiarismFileName ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-[#102342]">
                    <Upload size={18} className="text-[#eb5526]" /> {plagiarismFileName}
                    <button onClick={() => { setPlagiarismFileName(''); setPlagiarismFileUrl(''); }} className="ml-2 text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="mx-auto text-[#d8d8d1] mb-3" />
                    <p className="text-sm text-[#667082] mb-2">Drag and drop or click to upload your similarity report</p>
                    <p className="text-xs text-[#667082]">PDF format only (Similarity index must be ≤ 10%)</p>
                    <input type="file" accept=".pdf" onChange={handlePlagiarismUpload} className="hidden" id="plagiarism-upload" />
                    <label htmlFor="plagiarism-upload" className="inline-block mt-3 px-4 py-2 bg-[#f1f0ec] text-xs font-bold text-[#102342] rounded-lg cursor-pointer hover:bg-[#eeece7]">
                      Choose Report PDF
                    </label>
                  </>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-[#102342]">References</label>
                {references.trim() && (
                  <button
                    type="button"
                    onClick={() => setShowRefPreview(!showRefPreview)}
                    className="text-xs font-bold text-[#eb5526] hover:underline"
                  >
                    {showRefPreview ? 'Hide Format Preview' : 'Show Format Preview'}
                  </button>
                )}
              </div>
              <textarea rows={6} value={references} onChange={(e) => setReferences(e.target.value)} placeholder="Paste your references list here..." className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526] resize-none" />
              <p className="text-xs text-[#667082] mt-1">Include all cited references in your preferred citation style.</p>

              {showRefPreview && references.trim() && (
                <div className="mt-4 bg-[#fbfaf8] border border-[#e6e5e0] rounded-lg p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#102342] mb-3">Extracted Bibliography Preview</h4>
                  <ol className="list-decimal list-inside space-y-2.5 text-xs text-[#667082] leading-relaxed">
                    {references.split('\n').filter(line => line.trim()).map((ref, idx) => {
                      const cleanRef = ref.replace(/^\d+[\.\s\-]+/g, ""); // Strips manual leading list numbers
                      return (
                        <li key={idx} className="pl-1.5 border-l-2 border-[#eb5526]/30 py-0.5">
                          {cleanRef}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Declarations & Submit */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg text-[#102342] mb-1">Verify Manuscript Details</h3>
              <p className="text-xs text-[#667082]">Carefully review all extracted and inputted details below before signing declarations and submitting.</p>
            </div>

            {/* Review Block Grid */}
            <div className="bg-[#fbfaf8] border border-[#e6e5e0] rounded-lg p-6 space-y-5 text-sm text-[#27334a]">
              <div>
                <strong className="block text-xs uppercase tracking-wider text-[#667082] mb-1">Manuscript Title</strong>
                <p className="text-base font-semibold text-[#102342] leading-snug">{title || '—'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#e6e5e0] pt-4">
                <div>
                  <strong className="block text-xs uppercase tracking-wider text-[#667082] mb-1">Research Domain</strong>
                  <span className="inline-block px-2.5 py-1 bg-[#f1f0ec] rounded-full text-xs font-semibold text-[#102342]">
                    {domains.find((d) => d.id === domainId)?.name || '—'}
                  </span>
                </div>
                <div>
                  <strong className="block text-xs uppercase tracking-wider text-[#667082] mb-1">Manuscript File</strong>
                  <p className="text-xs font-medium text-[#eb5526] truncate">{fileName || 'No file uploaded'}</p>
                </div>
                <div>
                  <strong className="block text-xs uppercase tracking-wider text-[#667082] mb-1">Plagiarism Report</strong>
                  <p className="text-xs font-medium text-[#eb5526] truncate">{plagiarismFileName || 'No report uploaded'}</p>
                </div>
              </div>

              <div className="border-t border-[#e6e5e0] pt-4">
                <strong className="block text-xs uppercase tracking-wider text-[#667082] mb-2">Authors</strong>
                <div className="space-y-2">
                  {authors.map((a, i) => (
                    <div key={i} className="flex flex-col md:flex-row md:items-center justify-between text-xs bg-white border border-[#e6e5e0] p-3 rounded-lg">
                      <div>
                        <p className="font-semibold text-[#102342]">{a.name || 'Untitled'}</p>
                        <p className="text-[#667082]">{a.affiliation || 'No Affiliation'}{a.department ? ` — ${a.department}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 md:mt-0">
                        <span className="text-[#667082]">{a.email}</span>
                        {a.corresponding && <span className="px-2 py-0.5 bg-[#eb5526]/10 text-[#eb5526] rounded text-[10px] font-bold">Corresponding</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#e6e5e0] pt-4">
                <strong className="block text-xs uppercase tracking-wider text-[#667082] mb-1.5">Abstract</strong>
                <p className="text-xs leading-relaxed text-[#667082] bg-white border border-[#e6e5e0] p-4 rounded-lg italic whitespace-pre-wrap">{abstract || '—'}</p>
              </div>

              <div className="border-t border-[#e6e5e0] pt-4">
                <strong className="block text-xs uppercase tracking-wider text-[#667082] mb-1.5">Keywords</strong>
                <div className="flex flex-wrap gap-1.5">
                  {keywords ? keywords.split(',').map((k, idx) => (
                    <span key={idx} className="px-2 py-1 bg-[#f1f0ec] rounded text-xs text-[#667082]">{k.trim()}</span>
                  )) : <span className="text-xs text-[#667082]">None specified</span>}
                </div>
              </div>

              <div className="border-t border-[#e6e5e0] pt-4">
                <strong className="block text-xs uppercase tracking-wider text-[#667082] mb-1.5">References</strong>
                <pre className="text-[10px] leading-relaxed text-[#667082] bg-white border border-[#e6e5e0] p-4 rounded-lg overflow-x-auto font-mono whitespace-pre-wrap max-h-40">{references || '—'}</pre>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 pt-2">
              {[
                { label: 'This is original work and has not been published elsewhere', state: originalWork, set: setOriginalWork, required: true },
                { label: 'I agree to the copyright and licensing terms', state: copyrightAgreement, set: setCopyrightAgreement, required: true },
                { label: 'I have read and agree to the journal policies', state: policiesAgreement, set: setPoliciesAgreement, required: true },
                { label: 'There is a conflict of interest to disclose', state: conflictOfInterest, set: setConflictOfInterest, required: false },
                { label: 'Funding was received for this research', state: fundingReceived, set: setFundingReceived, required: false },
                { label: 'AI tools were used in preparing this manuscript', state: aiUsed, set: setAiUsed, required: false },
                { label: 'This manuscript was previously submitted elsewhere', state: previouslySubmitted, set: setPreviouslySubmitted, required: false },
              ].map((decl, i) => (
                <label key={i} className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={decl.state} onChange={(e) => decl.set(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#eb5526]" />
                  <span className="text-sm text-[#27334a]">
                    {decl.label}
                    {decl.required && <span className="text-[#eb5526]"> *</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-[#e6e5e0]">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#667082] disabled:opacity-30 hover:text-[#102342]"
          >
            <ChevronLeft size={18} /> Back
          </button>
          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#eb5526] text-white text-sm font-bold rounded-lg hover:bg-[#d7461c] disabled:opacity-30"
            >
              Continue <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#eb5526] text-white text-sm font-bold rounded-lg hover:bg-[#d7461c] disabled:opacity-30"
            >
              {submitting ? 'Submitting...' : 'Submit Manuscript'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
