import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, ChevronLeft, Upload, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { sendSubmissionEmail, sendCoAuthorConsentEmail } from '@/lib/email';
import { DOMAIN_DISCIPLINES, findSubject } from '@/data/disciplines';
import { parsePdfManuscript } from '@/lib/pdfParser';
import type { Domain } from '@/types';

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

const DRAFT_STORAGE_KEY = 'tjasf_manuscript_submission_draft';

export default function SubmitManuscriptPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  
  const [saveTime, setSaveTime] = useState<string>('');
  const [savingDraft, setSavingDraft] = useState(false);
  const [showRefPreview, setShowRefPreview] = useState(false);

  const [title, setTitle] = useState('');
  const [domainId, setDomainId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [fastTrack, setFastTrack] = useState(false);
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

  const restoredRef = useRef(false);

  // Restore draft from sessionStorage on initial mount (prevents unexpected reset to step 1)
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.step && typeof d.step === 'number' && d.step >= 1 && d.step <= 5) setStep(d.step);
        if (d.title) setTitle(d.title);
        if (d.domainId) setDomainId(d.domainId);
        if (d.selectedSubjectId) setSelectedSubjectId(d.selectedSubjectId);
        if (d.fastTrack !== undefined) setFastTrack(Boolean(d.fastTrack));
        if (Array.isArray(d.authors) && d.authors.length > 0) setAuthors(d.authors);
        if (d.abstract) setAbstract(d.abstract);
        if (d.keywords) setKeywords(d.keywords);
        if (d.fileName) setFileName(d.fileName);
        if (d.fileUrl) setFileUrl(d.fileUrl);
        if (d.plagiarismFileName) setPlagiarismFileName(d.plagiarismFileName);
        if (d.plagiarismFileUrl) setPlagiarismFileUrl(d.plagiarismFileUrl);
        if (d.references) setReferences(d.references);
      }
    } catch (err) {
      console.warn('Could not restore draft:', err);
    }
  }, []);

  // Persist draft to sessionStorage automatically
  useEffect(() => {
    if (!title && !abstract && !references && authors.length <= 1 && !authors[0].affiliation) return;
    setSavingDraft(true);
    const delay = setTimeout(() => {
      try {
        sessionStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            step,
            title,
            domainId,
            selectedSubjectId,
            fastTrack,
            authors,
            abstract,
            keywords,
            fileName,
            fileUrl,
            plagiarismFileName,
            plagiarismFileUrl,
            references,
          })
        );
      } catch (err) {
        console.warn('Draft save error:', err);
      }
      setSavingDraft(false);
      setSaveTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    }, 500);
    return () => clearTimeout(delay);
  }, [step, title, domainId, selectedSubjectId, fastTrack, abstract, keywords, references, authors, fileName, fileUrl, plagiarismFileName, plagiarismFileUrl]);

  useEffect(() => {
    (async () => {
      const { data: domainsData } = await supabase.from('domains').select('*').order('name');
      if (domainsData) setDomains(domainsData as Domain[]);
    })();
  }, []);

  const canProceed = () => {
    if (step === 1) return title.trim().length > 0 && (selectedSubjectId.length > 0 || domainId.length > 0);
    if (step === 2) return authors.length > 0 && authors.every((a) => a.name.trim().length > 0);
    if (step === 3) return abstract.trim().length > 0;
    if (step === 4) return fileName.length > 0;
    if (step === 5) return originalWork && copyrightAgreement && policiesAgreement;
    return false;
  };

  const handleNext = () => {
    setError('');

    // Validate Step 2: Authors Names
    if (step === 2) {
      for (let i = 0; i < authors.length; i++) {
        const name = authors[i].name.trim();
        if (!name) {
          setError(`Invalid Name for Author ${i + 1}: Author name is required.`);
          return;
        }
        if (/\d/.test(name)) {
          setError(`Invalid Name for Author ${i + 1}: Name must not contain numbers.`);
          return;
        }
      }
    }

    setStep(step + 1);
  };

  /**
   * PDF Autofill Handler (Step 1):
   * Strictly PDF only, validates TJASF template compliance before autofill.
   */
  const handleAutoFillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Strict File Type Validation: Autofill is PDF ONLY
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    if (!isPdf) {
      toast.error('Invalid File Type: Autofill supports PDF format only. Please upload a PDF manuscript formatted with the TJASF template.');
      setError('Invalid File Type: Autofill supports PDF format only. For Word (.docx) files, please upload in Step 4 or enter details manually.');
      e.target.value = '';
      return;
    }

    setAnalyzing(true);
    setError('');

    try {
      const extracted = await parsePdfManuscript(file);

      // Check for parsing failure or unreadable/scanned document
      if (!extracted) {
        toast.error('Corrupted or Unreadable PDF: Unable to read text from the uploaded document.');
        setError('Extraction Error: Unable to extract readable text from this PDF file. Please verify the document is not corrupted or enter details manually.');
        return;
      }

      if (extracted.isScanned) {
        toast.error('Unreadable PDF: The uploaded document appears to be scanned or contains no extractable digital text.');
        setError('Unreadable PDF: The document contains no extractable text. Scanned or image-only PDFs cannot be autofilled. Please enter details manually.');
        return;
      }

      // 2. Strict TJASF Journal Template Validation
      if (!extracted.isTemplateConformant) {
        toast.error('Submission Rejected: The uploaded document does not follow the official TJASF journal template. Auto-fill accepts TJASF-formatted papers only.');
        setError('Template Validation Failed: The uploaded document does not match the official TJASF Journal Paper Template format. Please download the template from Step 4, format your manuscript according to the journal guidelines, and re-upload.');
        return; // Reject without populating any fields; remain on Step 1
      }

      // 3. Populate existing form fields only
      if (extracted.title) setTitle(extracted.title);
      if (extracted.abstract) setAbstract(extracted.abstract);
      if (extracted.keywords) setKeywords(extracted.keywords);
      if (extracted.references) setReferences(extracted.references);
      if (extracted.authors && extracted.authors.length > 0) {
        setAuthors(extracted.authors);
      }

      toast.success('TJASF template verified! Manuscript details auto-filled successfully. You can now review and edit the fields.');
    } catch (err: any) {
      console.error('Auto-fill error:', err);
      toast.error('Failed to parse document: ' + (err.message || 'Unknown parsing error'));
      setError('An error occurred while processing the file: ' + (err.message || err));
    } finally {
      setAnalyzing(false);
      e.target.value = '';
    }
  };

  /**
   * Normal Manuscript Upload Handler (Step 4):
   * Accepts both .docx and .pdf files.
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate allowed file types for normal manuscript upload (.pdf, .doc, .docx)
    const validExtensions = ['.pdf', '.doc', '.docx'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setError('Invalid File Format: Manuscript must be a PDF, DOC, or DOCX document.');
      toast.error('Invalid File Format: Manuscript must be a PDF, DOC, or DOCX document.');
      e.target.value = '';
      return;
    }

    setFileName(file.name);
    setAnalyzing(true);
    setError('');

    try {
      const filePath = `manuscripts/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('manuscripts').upload(filePath, file);
      if (upErr) {
        setError('Failed to upload file: ' + upErr.message);
        toast.error('Failed to upload file: ' + upErr.message);
        return;
      }
      const { data: pubData } = supabase.storage.from('manuscripts').getPublicUrl(filePath);
      setFileUrl(pubData.publicUrl);
      toast.success('Manuscript file uploaded successfully.');

      // Extract details dynamically if fields are still empty and document is TJASF compliant
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const extracted = await parsePdfManuscript(file);
        if (extracted && extracted.isTemplateConformant) {
          if (!title && extracted.title) setTitle(extracted.title);
          if (!abstract && extracted.abstract) setAbstract(extracted.abstract);
          if (!keywords && extracted.keywords) setKeywords(extracted.keywords);
          if (!references && extracted.references) setReferences(extracted.references);
          if (extracted.authors && extracted.authors.length > 0 && authors.length <= 1 && !authors[0].name) {
            setAuthors(extracted.authors);
          }
        }
      }
    } catch (err: any) {
      setError('Upload error: ' + (err.message || err));
      toast.error('Upload error: ' + (err.message || err));
    } finally {
      setAnalyzing(false);
      e.target.value = '';
    }
  };

  /**
   * Plagiarism Report Upload Handler (Step 4):
   * PDF only.
   */
  const handlePlagiarismUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Invalid File Type: The plagiarism report must be in PDF format.');
      toast.error('Invalid File Type: The plagiarism report must be in PDF format.');
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
      toast.error('Failed to upload plagiarism report: ' + upErr.message);
      setUploadingPlagiarism(false);
      return;
    }
    const { data: pubData } = supabase.storage.from('manuscripts').getPublicUrl(filePath);
    setPlagiarismFileUrl(pubData.publicUrl);
    setUploadingPlagiarism(false);
    toast.success('Plagiarism report uploaded successfully.');
  };

  const handleSubmit = async () => {
    if (!profile) return;
    setSubmitting(true);
    setError('');
    const kwArray = keywords.split(',').map((k) => k.trim()).filter(Boolean);

    const subj = findSubject(selectedSubjectId);
    const subjectCode = subj?.code || 'ENG';
    const subjectName = subj?.name || 'Engineering & Technology';

    // Format: YEAR-SUBJECTCODE-MMDD-SEQ (e.g. 2026-CSE-0924-01)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const prefix = `${year}-${subjectCode}-${month}${date}`;

    let seq = 1;
    try {
      const { count } = await supabase
        .from('manuscripts')
        .select('id', { count: 'exact', head: true })
        .ilike('tracking_code', `${prefix}%`);
      if (count && count > 0) {
        seq = count + 1;
      }
    } catch (e) {
      console.warn('Could not query existing tracking codes count:', e);
    }
    const trackingCode = `${prefix}-${String(seq).padStart(2, '0')}`;

    const insertPayload: any = {
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
      fast_track: fastTrack,
      tracking_code: trackingCode,
      subject_code: subjectCode,
      subject_name: subjectName,
    };

    let { data, error: insErr } = await supabase.from('manuscripts').insert(insertPayload).select().single();

    // Fallback if database table columns tracking_code/subject_code don't exist yet
    if (insErr && insErr.message?.toLowerCase().includes('column') && (insErr.message?.includes('tracking_code') || insErr.message?.includes('subject_code') || insErr.message?.includes('subject_name'))) {
      console.warn('Database schema does not have tracking_code columns yet, falling back to basic insert payload');
      delete insertPayload.tracking_code;
      delete insertPayload.subject_code;
      delete insertPayload.subject_name;
      const retryRes = await supabase.from('manuscripts').insert(insertPayload).select().single();
      data = retryRes.data;
      insErr = retryRes.error;
    }

    if (insErr) {
      setError(insErr.message);
      toast.error('Submission failed: ' + insErr.message);
      setSubmitting(false);
      return;
    }

    if (data) {
      // Insert v1 into versions archive
      await supabase.from('manuscript_versions').insert({
        manuscript_id: data.id,
        version: 1,
        file_url: fileUrl,
        file_name: fileName,
      });
      for (let i = 0; i < authors.length; i++) {
        const { data: insertedAuthor } = await supabase.from('manuscript_authors').insert({
          manuscript_id: data.id,
          name: authors[i].name,
          email: authors[i].email,
          corresponding: authors[i].corresponding,
          affiliation: authors[i].affiliation,
          department: authors[i].department,
          orcid: authors[i].orcid || '',
          sort_order: i,
        }).select().single();

        if (insertedAuthor && authors[i].email) {
          try {
            await sendCoAuthorConsentEmail(
              insertedAuthor.name,
              insertedAuthor.email || '',
              title,
              insertedAuthor.id,
              profile.full_name
            );
          } catch (err) {
            console.error('Failed to send co-author verification email:', err);
          }
        }
      }
    }

    const finalTrackingCode = data?.tracking_code || trackingCode;

    try {
      await sendSubmissionEmail(
        profile.full_name,
        profile.email || '',
        title,
        finalTrackingCode
      );
    } catch (err) {
      console.error('Failed to send confirmation email:', err);
    }

    // Clear saved draft on successful submission
    try {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {
      console.warn('Draft cleanup error:', e);
    }

    toast.success(`Manuscript submitted successfully! A confirmation email with tracking ID ${finalTrackingCode} has been sent to your email (${profile.email || 'your account'}).`);
    if (authors.length > 1) {
      toast.info('Verification and consent emails have been dispatched to all co-authors.');
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
            {/* Template Download & Auto-Fill Option */}
            <div className="border border-dashed border-[#d8d8d1] rounded-lg p-5 bg-gray-50/50 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#e6e5e0] pb-3.5 mb-3.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#667082] block">Journal Guidelines</span>
                  <p className="text-xs text-[#667082]">Download the official template to format your research before submission.</p>
                </div>
                <a
                  href="/assets/templates/TJASF_PaperTemplate.docx"
                  download
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 border border-[#eb5526] text-[#eb5526] bg-white text-xs font-bold rounded-lg hover:bg-orange-50 transition-colors whitespace-nowrap self-start sm:self-auto shadow-sm"
                >
                  Download Journal Manuscript Template (.docx)
                </a>
              </div>

              <div className="text-center pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#667082] block mb-1">Time Saver Option</span>
                <p className="text-xs text-[#667082] mb-3">Upload your PDF manuscript here to automatically extract and populate the Title, Abstract, Keywords, Authors, and References.</p>
                <input
                  id="autofill-file-input"
                  type="file"
                  accept=".pdf"
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = '';
                  }}
                  onChange={handleAutoFillUpload}
                  className="sr-only"
                />
                <label
                  htmlFor="autofill-file-input"
                  className="inline-block px-4 py-2 bg-[#eb5526] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[#d7461c] transition-colors shadow-sm select-none"
                >
                  Upload PDF to Auto-Fill
                </label>
                {analyzing && <span className="block text-xs text-[#eb5526] mt-2 font-semibold animate-pulse">Analyzing document & extracting metadata...</span>}
              </div>
            </div>

            <div className="pt-3 border-t border-[#f1f0ec]">
              <label className="block text-sm font-semibold text-[#102342] mb-1.5">Manuscript Title *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter your manuscript title" className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526] bg-white text-[#27334a]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1.5">Research Domain & Subject Discipline *</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => {
                  const sId = e.target.value;
                  setSelectedSubjectId(sId);
                  const found = findSubject(sId);
                  if (found) {
                    const matchedDomain = domains.find((d) => d.slug === found.domainSlug);
                    if (matchedDomain) {
                      setDomainId(matchedDomain.id);
                    }
                  } else {
                    setDomainId('');
                  }
                }}
                className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526] bg-white text-[#27334a]"
              >
                <option value="">Select subject discipline (e.g. Computer Science, Mechanical, AI/ML)...</option>
                {DOMAIN_DISCIPLINES.map((group) => (
                  <optgroup key={group.domainSlug} label={group.domainName}>
                    {group.subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {selectedSubjectId && (
                <div className="mt-2 text-xs text-[#667082] flex items-center gap-2">
                  <span className="font-semibold text-[#102342]">Selected:</span>
                  <span className="text-[#102342]">{findSubject(selectedSubjectId)?.name}</span>
                  <span className="font-mono bg-orange-50 text-[#eb5526] px-2 py-0.5 rounded text-[11px] font-bold border border-orange-200">
                    Subject Code: {findSubject(selectedSubjectId)?.code}
                  </span>
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-2.5">Submission Track *</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFastTrack(false)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    !fastTrack
                      ? 'border-[#eb5526] bg-amber-50/20 shadow-sm'
                      : 'border-[#d8d8d1] hover:border-gray-400 bg-white'
                  }`}
                >
                  <div className="font-bold text-xs text-[#102342] mb-1">Regular Track</div>
                  <div className="text-[11px] text-[#667082] leading-relaxed">Standard peer-review cycle (approx. 12-16 weeks). Free of charge.</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFastTrack(true)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    fastTrack
                      ? 'border-[#eb5526] bg-amber-50/20 shadow-sm'
                      : 'border-[#d8d8d1] hover:border-gray-400 bg-white'
                  }`}
                >
                  <div className="font-bold text-xs text-[#102342] mb-1 flex items-center justify-between">
                    <span>Fast-Track</span>
                    <span className="bg-[#eb5526] text-white text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                      $49 USD
                    </span>
                  </div>
                  <div className="text-[11px] text-[#667082] leading-relaxed">Expedited peer-review cycle (approx. 4-8 weeks). Processing fee applies.</div>
                </button>
              </div>
            </div>
            
            <p className="text-xs text-[#667082]">Choose the research domain and submission track that best fits your needs.</p>
          </div>
        )}

        {/* Step 2: Authors */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[#102342]">Authors *</label>
              <button
                type="button"
                onClick={addAuthor}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#eb5526] hover:text-[#d7461c]"
              >
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
                    {authors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAuthor(i)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#102342] mb-1">Author Name *</label>
                    <input
                      type="text"
                      placeholder="Full name (e.g. Dr. Sarah A. Jenkins) *"
                      value={a.name}
                      onChange={(e) => updateAuthor(i, 'name', e.target.value)}
                      className="w-full border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526] bg-white text-[#102342]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#102342] mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="author@example.com"
                      value={a.email}
                      onChange={(e) => updateAuthor(i, 'email', e.target.value)}
                      className="w-full border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526] bg-white text-[#102342]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#102342] mb-1">Affiliation / Institution</label>
                    <input
                      type="text"
                      placeholder="e.g. Stanford University"
                      value={a.affiliation}
                      onChange={(e) => updateAuthor(i, 'affiliation', e.target.value)}
                      className="w-full border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526] bg-white text-[#102342]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#102342] mb-1">Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Department of Computer Science"
                      value={a.department}
                      onChange={(e) => updateAuthor(i, 'department', e.target.value)}
                      className="w-full border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526] bg-white text-[#102342]"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-[#102342] mb-1">ORCID ID (Optional)</label>
                    <input
                      type="text"
                      placeholder="0000-0002-1825-0097"
                      value={a.orcid || ''}
                      onChange={(e) => updateAuthor(i, 'orcid', e.target.value)}
                      className="w-full border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526] bg-white text-[#102342]"
                    />
                  </div>
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
              <div className="mb-1.5">
                <label className="block text-sm font-semibold text-[#102342]">Manuscript File</label>
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
                    <button
                      type="button"
                      onClick={() => { setFileName(''); setFileUrl(''); }}
                      className="ml-2 text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="mx-auto text-[#d8d8d1] mb-3" />
                    <p className="text-sm text-[#667082] mb-2">Drag and drop or click to upload</p>
                    <p className="text-xs text-[#667082]">PDF, DOC, or DOCX up to 20MB</p>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onClick={(e) => {
                        (e.target as HTMLInputElement).value = '';
                      }}
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="inline-block mt-3 px-4 py-2 bg-[#f1f0ec] text-xs font-bold text-[#102342] rounded-lg cursor-pointer hover:bg-[#eeece7]">
                      Choose File
                    </label>
                  </>
                )}
              </div>
            </div>
            
            {/* Plagiarism Report File */}
            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1.5">Plagiarism Report (Turnitin or iThenticate PDF) <span className="text-[#667082] font-normal">(Optional)</span></label>
              <div className="border-2 border-dashed border-[#d8d8d1] rounded-lg p-8 text-center bg-[#fbfaf8]">
                {uploadingPlagiarism ? (
                  <div className="py-4 space-y-3">
                    <div className="w-10 h-10 border-4 border-t-[#eb5526] border-[#f1f0ec] rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-semibold text-[#102342]">Uploading plagiarism report...</p>
                  </div>
                ) : plagiarismFileName ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-[#102342]">
                    <Upload size={18} className="text-[#eb5526]" /> {plagiarismFileName}
                    <button
                      type="button"
                      onClick={() => { setPlagiarismFileName(''); setPlagiarismFileUrl(''); }}
                      className="ml-2 text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="mx-auto text-[#d8d8d1] mb-3" />
                    <p className="text-sm text-[#667082] mb-2">Drag and drop or click to upload your similarity report (Optional)</p>
                    <p className="text-xs text-[#667082]">PDF format (Optional — If not uploaded, editorial desk screening will perform plagiarism check)</p>
                    <input
                      type="file"
                      accept=".pdf"
                      onClick={(e) => {
                        (e.target as HTMLInputElement).value = '';
                      }}
                      onChange={handlePlagiarismUpload}
                      className="hidden"
                      id="plagiarism-upload"
                    />
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
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#667082] disabled:opacity-30 hover:text-[#102342]"
          >
            <ChevronLeft size={18} /> Back
          </button>
          {step < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#eb5526] text-white text-sm font-bold rounded-lg hover:bg-[#d7461c] disabled:opacity-30"
            >
              Continue <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
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
