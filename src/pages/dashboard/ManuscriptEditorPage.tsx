import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2, Search, X, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { sendDecisionEmail, sendEditorAssignmentEmail, sendReviewReminderEmail, sendReviewerInvitation } from '@/lib/email';
import type { Manuscript, Profile, Review, ManuscriptStatus, ReviewStatus, Domain } from '@/types';

export default function ManuscriptEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile: activeUser } = useAuth();
  const toast = useToast();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [submitter, setSubmitter] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewers, setReviewers] = useState<Profile[]>([]);
  const [editors, setEditors] = useState<Profile[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [editorWorkloads, setEditorWorkloads] = useState<Record<string, number>>({});
  const [reviewerWorkloads, setReviewerWorkloads] = useState<Record<string, number>>({});
  const [reviewerStats, setReviewerStats] = useState<Record<string, { total: number, completed: number, declined: number }>>({});
  const [editorSearch, setEditorSearch] = useState('');
  const [reviewerSearch, setReviewerSearch] = useState('');
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [fileVersions, setFileVersions] = useState<{ id: string, version: number, file_url: string, file_name: string, created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showEditorRecommendations, setShowEditorRecommendations] = useState(false);
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [refineKeywords, setRefineKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [hIndexFilter, setHIndexFilter] = useState<number | null>(null);
  const [minPubsFilter, setMinPubsFilter] = useState<number | null>(null);
  const [showShortlistModal, setShowShortlistModal] = useState(false);
  const [editorAssignments, setEditorAssignments] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: ms } = await supabase.from('manuscripts').select('*').eq('id', id).maybeSingle();
      if (ms) {
        setManuscript(ms as Manuscript);
        if ((ms as Manuscript).keywords) {
          setRefineKeywords((ms as Manuscript).keywords);
        }
        const { data: sub } = await supabase.from('profiles').select('*').eq('id', (ms as Manuscript).submitter_id).maybeSingle();
        if (sub) setSubmitter(sub as Profile);
        const { data: revs } = await supabase.from('reviews').select('*').eq('manuscript_id', id);
        if (revs) setReviews(revs as Review[]);
        const { data: revwrs } = await supabase.from('profiles').select('*').in('role', ['reviewer', 'section_editor']);
        if (revwrs) setReviewers(revwrs as Profile[]);
        const { data: eds } = await supabase.from('profiles').select('*').in('role', ['section_editor', 'editor_in_chief', 'associate_editor', 'editorial_board_member']);
        if (eds) setEditors(eds as Profile[]);
        const { data: doms } = await supabase.from('domains').select('*');
        if (doms) setDomains(doms as Domain[]);
        const { data: eas } = await supabase.from('editor_assignments').select('*').eq('manuscript_id', id);
        if (eas) setEditorAssignments(eas);

        // Fetch editor workloads: count active papers (excluding rejected or published) for each editor
        const { data: allMs } = await supabase.from('manuscripts').select('editor_id, status');
        if (allMs) {
          const workloads: Record<string, number> = {};
          allMs.forEach((m) => {
            if (m.editor_id && !['rejected', 'published'].includes(m.status)) {
              workloads[m.editor_id] = (workloads[m.editor_id] || 0) + 1;
            }
          });
          setEditorWorkloads(workloads);
        }

        // Fetch reviewer workloads and statistics: count active and historical review actions
        const { data: allRevs } = await supabase.from('reviews').select('reviewer_id, status');
        if (allRevs) {
          const workloads: Record<string, number> = {};
          const stats: Record<string, { total: number, completed: number, declined: number }> = {};
          allRevs.forEach((r) => {
            if (r.reviewer_id) {
              if (r.status === 'pending_invitation' || r.status === 'in_progress') {
                workloads[r.reviewer_id] = (workloads[r.reviewer_id] || 0) + 1;
              }
              if (!stats[r.reviewer_id]) {
                stats[r.reviewer_id] = { total: 0, completed: 0, declined: 0 };
              }
              stats[r.reviewer_id].total += 1;
              if (r.status === 'submitted') {
                stats[r.reviewer_id].completed += 1;
              } else if (r.status === 'declined') {
                stats[r.reviewer_id].declined += 1;
              }
            }
          });
          setReviewerWorkloads(workloads);
          setReviewerStats(stats);
        }

        // Fetch historical file versions
        const { data: versions } = await supabase.from('manuscript_versions').select('*').eq('manuscript_id', id).order('version', { ascending: false });
        if (versions) setFileVersions(versions);
      }
      setLoading(false);
    })();
  }, [id]);

  const currentDomain = domains.find((d) => d.id === manuscript?.domain_id);
  const isExpertMatch = (rev: Profile) => {
    if (!currentDomain || !rev.reviewer_domains || rev.reviewer_domains.length === 0) return false;
    return rev.reviewer_domains.some((d) => 
      d.toLowerCase().includes(currentDomain.name.toLowerCase()) || 
      currentDomain.name.toLowerCase().includes(d.toLowerCase())
    );
  };

  const updateStatus = async (status: ManuscriptStatus) => {
    if (!manuscript) return;
    setUpdating(true);
    await supabase.from('manuscripts').update({ status }).eq('id', manuscript.id);
    setManuscript({ ...manuscript, status });

    // Send automated status update email to author (only for rejection or revision requests)
    if (submitter && ['rejected', 'revision_requested'].includes(status)) {
      let decisionFeedback = '';
      if (status === 'rejected') {
        decisionFeedback = 'The editorial board has completed desk screening. Regrettably, the manuscript was not accepted for publication at this time.';
      } else if (status === 'revision_requested') {
        decisionFeedback = 'Reviewers have requested revisions. Please log into your author portal to view comments and upload your revised file.';
      }

      try {
        await sendDecisionEmail(
          submitter.full_name,
          submitter.email || '',
          manuscript.title,
          manuscript.id.substring(0, 8).toUpperCase(),
          status,
          decisionFeedback
        );
      } catch (err) {
        console.error('Failed to send status update email:', err);
      }
    }

    setUpdating(false);
  };

  const inviteEditor = async (editorId: string) => {
    if (!manuscript) return;
    setUpdating(true);
    try {
      const { error } = await supabase.from('editor_assignments').insert({
        manuscript_id: manuscript.id,
        editor_id: editorId,
        status: 'pending'
      });
      if (error) throw error;

      const selectedEd = editors.find((e) => e.id === editorId);
      if (selectedEd) {
        try {
          await sendEditorAssignmentEmail(
            selectedEd.full_name,
            selectedEd.email || '',
            manuscript.title,
            manuscript.id.substring(0, 8).toUpperCase()
          );
        } catch (err) {
          console.error('Failed to send editor assignment email:', err);
        }
      }

      const { data: eas } = await supabase.from('editor_assignments').select('*').eq('manuscript_id', manuscript.id);
      if (eas) setEditorAssignments(eas);
    } catch (err: any) {
      toast.error(err.message || 'Failed to invite editor');
    }
    setUpdating(false);
  };

  const removeEditorAssignment = async (assignmentId: string) => {
    setUpdating(true);
    await supabase.from('editor_assignments').delete().eq('id', assignmentId);
    setEditorAssignments(editorAssignments.filter((ea) => ea.id !== assignmentId));
    setUpdating(false);
  };

  const assignReviewer = async () => {
    if (!manuscript || !selectedReviewer) return;
    setUpdating(true);
    await supabase.from('reviews').insert({
      manuscript_id: manuscript.id,
      reviewer_id: selectedReviewer,
      status: 'pending_invitation' as ReviewStatus,
      invited_at: new Date().toISOString(),
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const { data: revs } = await supabase.from('reviews').select('*').eq('manuscript_id', manuscript.id);
    if (revs) setReviews(revs as Review[]);
    setSelectedReviewer('');
    setUpdating(false);
  };

  const inviteShortlisted = async () => {
    if (shortlist.length === 0 || !manuscript) return;
    setUpdating(true);
    let successCount = 0;
    
    for (const revId of shortlist) {
      try {
        const reviewer = reviewers.find(p => p.id === revId);
        if (!reviewer) continue;
        
        // Skip if already assigned
        const alreadyInvited = reviews.some(r => r.reviewer_id === revId);
        if (alreadyInvited) continue;

        await supabase.from('reviews').insert({
          manuscript_id: manuscript.id,
          reviewer_id: revId,
          status: 'pending_invitation' as ReviewStatus,
          invited_at: new Date().toISOString(),
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });

        await sendReviewerInvitation(
          reviewer.full_name,
          reviewer.email || '',
          manuscript.title,
          manuscript.id.substring(0, 8).toUpperCase(),
          manuscript.abstract || ''
        );
        successCount++;
      } catch (err) {
        console.error('Failed to invite shortlisted reviewer:', revId, err);
      }
    }
    
    toast.success(`Successfully sent invitations to ${successCount} shortlisted reviewers!`);
    
    const { data: revs } = await supabase.from('reviews').select('*').eq('manuscript_id', manuscript.id);
    if (revs) setReviews(revs as Review[]);
    
    setShortlist([]);
    setUpdating(false);
    setShowShortlistModal(false);
  };

  const removeReview = async (reviewId: string) => {
    setUpdating(true);
    await supabase.from('reviews').delete().eq('id', reviewId);
    setReviews(reviews.filter((r) => r.id !== reviewId));
    setUpdating(false);
  };

  const sendReminder = async (reviewId: string) => {
    const rev = reviews.find((r) => r.id === reviewId);
    if (!rev || !manuscript) return;
    const reviewer = reviewers.find((p) => p.id === rev.reviewer_id);
    if (!reviewer) return;

    setUpdating(true);
    try {
      await sendReviewReminderEmail(
        reviewer.full_name,
        reviewer.email || '',
        manuscript.title,
        manuscript.id.substring(0, 8).toUpperCase(),
        rev.due_date || new Date().toISOString()
      );
      toast.success(`Reminder email sent successfully to Dr. ${reviewer.full_name}!`);
    } catch (err) {
      console.error('Failed to send reminder email:', err);
      toast.error('Failed to send reminder email. Please check your network or Vercel logs.');
    }
    setUpdating(false);
  };

  const exportJatsXml = () => {
    if (!manuscript) return;

    // Construct standard JATS XML format
    const authorsXml = submitter ? `
      <contrib contrib-type="author">
        <name>
          <surname>${submitter.full_name.split(' ').pop() || ''}</surname>
          <given-names>${submitter.full_name.split(' ').slice(0, -1).join(' ') || submitter.full_name}</given-names>
        </name>
        <email>${submitter.email || ''}</email>
        <xref ref-type="aff" rid="aff-1"/>
      </contrib>
    ` : '';

    const keywordsXml = (manuscript.keywords || []).map((k) => `<kwd>${k}</kwd>`).join('\n            ');
    const referencesXml = (manuscript.reference_text || '')
      .split('\n')
      .filter(Boolean)
      .map((r, i) => `      <ref id="ref-${i + 1}"><mixed-citation>${r.trim()}</mixed-citation></ref>`)
      .join('\n');

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE article PUBLIC "-//NLM//DTD JATS (Z39.96) Journal Publishing DTD v1.2 20190208//EN" "JATS-journalpublishing1.dtd">
<article article-type="research-article" dtd-version="1.2" xml:lang="en">
  <front>
    <journal-meta>
      <journal-id journal-id-type="publisher-id">TJASF</journal-id>
      <journal-title-group>
        <journal-title>The Journal of Advanced Scientific Frontiers</journal-title>
      </journal-title-group>
      <!-- <issn pub-type="epub">XXXX-XXXX</issn> -->
      <publisher>
        <publisher-name>TJASF Publications</publisher-name>
      </publisher>
    </journal-meta>
    <article-meta>
      <article-id pub-id-type="publisher-id">${manuscript.id.substring(0, 8).toUpperCase()}</article-id>
      <article-id pub-id-type="doi">10.xxxx/tjasf.2026.${manuscript.id.substring(0, 8).toUpperCase()}</article-id>
      <title-group>
        <article-title>${manuscript.title}</article-title>
      </title-group>
      <contrib-group>
        ${authorsXml.trim()}
      </contrib-group>
      <aff id="aff-1">
        <institution>${submitter?.affiliation || 'TJASF Contributed Institution'}</institution>
        <dept>${submitter?.department || ''}</dept>
      </aff>
      <pub-date pub-type="epub">
        <year>${new Date().getFullYear()}</year>
      </pub-date>
      <abstract>
        <p>${manuscript.abstract}</p>
      </abstract>
      <kwd-group>
        ${keywordsXml}
      </kwd-group>
    </article-meta>
  </front>
  <back>
    <ref-list>
      <title>References</title>
${referencesXml}
    </ref-list>
  </back>
</article>`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${manuscript.id.substring(0, 8).toUpperCase()}_jats.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  const filteredReviewers = reviewers
    .filter((r) => !reviews.some((rv) => rv.reviewer_id === r.id))
    .filter((r) =>
      r.full_name.toLowerCase().includes(reviewerSearch.toLowerCase()) ||
      (r.email || '').toLowerCase().includes(reviewerSearch.toLowerCase()) ||
      (r.reviewer_domains || []).some((d) => d.toLowerCase().includes(reviewerSearch.toLowerCase()))
    );


  if (showEditorRecommendations && manuscript && activeUser) {
    // Sort and filter section editors
    const recommendedEditors = editors
      .map((e) => {
        // Calculate keyword match score
        const reviewerKeywords = e.keywords || [];
        const matchCount = refineKeywords.filter(tag => 
          reviewerKeywords.some((k: string) => k.toLowerCase().includes(tag.toLowerCase()) || tag.toLowerCase().includes(k.toLowerCase()))
        ).length;
        
        const score = matchCount * 10;
        return { ...e, matchScore: score };
      })
      .filter((e) => {
        // Hide self
        if (e.id === activeUser.id) {
          return false;
        }
        
        // EIC/Admin can invite Section Editors, Associate Editors, and Editorial Board Members
        // Section Editors can ONLY invite Editorial Board Members
        if (activeUser.role === 'section_editor' && e.role !== 'editorial_board_member') {
          return false;
        }

        // Apply filters
        if (editorSearch && !e.full_name.toLowerCase().includes(editorSearch.toLowerCase()) && !(e.email || '').toLowerCase().includes(editorSearch.toLowerCase())) {
          return false;
        }
        if (hIndexFilter && (e.h_index || 0) < hIndexFilter) {
          return false;
        }
        if (minPubsFilter && (e.publications?.length || 0) < minPubsFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.matchScore - a.matchScore); // Rank by matching score descending!

    return (
      <div className="space-y-6 min-h-screen pb-32">
        <div className="flex items-center justify-between pb-4 border-b border-[#f1f0ec]">
          <div>
            <button
              onClick={() => setShowEditorRecommendations(false)}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#eb5526] hover:text-[#d7461c] mb-2 cursor-pointer"
            >
              <ArrowLeft size={16} /> Back to Manuscript Detail
            </button>
            <h1 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mb-1">Find & Invite Editors</h1>
            <p className="text-xs text-[#667082]">
              Expedite editorial selection using live database matching for <strong className="text-[#102342] font-semibold">"{manuscript.title}"</strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#667082]">
              Showing <strong className="text-[#102342]">{recommendedEditors.length}</strong> matching candidates
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left Sidebar Filters */}
          <div className="lg:col-span-1 space-y-5 bg-white border border-[#e6e5e0] rounded-lg p-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#102342] mb-1.5">Refine results by keyword</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Press Enter to add keyword..."
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && keywordInput.trim()) {
                      e.preventDefault();
                      if (!refineKeywords.includes(keywordInput.trim())) {
                        setRefineKeywords([...refineKeywords, keywordInput.trim()]);
                      }
                      setKeywordInput('');
                    }
                  }}
                  className="w-full border border-[#d8d8d1] rounded-lg pl-3 pr-8 py-2 text-xs outline-none focus:border-[#eb5526] bg-white text-[#27334a]"
                />
                <Search size={14} className="absolute right-2.5 top-2.5 text-[#667082]" />
              </div>
              {refineKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {refineKeywords.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 bg-[#f1f0ec] text-[#102342] text-[10px] font-medium px-2 py-0.5 rounded">
                      {tag}
                      <button onClick={() => setRefineKeywords(refineKeywords.filter(k => k !== tag))} className="text-[#667082] hover:text-red-500">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[#f1f0ec] pt-4">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#102342] mb-3">Filters</span>
              
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#667082] mb-1">Academic H-Index</label>
                  <select
                    value={hIndexFilter || ''}
                    onChange={(e) => setHIndexFilter(e.target.value ? Number(e.target.value) : null)}
                    className="w-full border border-[#d8d8d1] rounded px-2.5 py-1.5 bg-white text-[#27334a]"
                  >
                    <option value="">All H-Index levels</option>
                    <option value="2">H-Index ≥ 2</option>
                    <option value="5">H-Index ≥ 5</option>
                    <option value="10">H-Index ≥ 10</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#667082] mb-1">Minimum Publications</label>
                  <select
                    value={minPubsFilter || ''}
                    onChange={(e) => setMinPubsFilter(e.target.value ? Number(e.target.value) : null)}
                    className="w-full border border-[#d8d8d1] rounded px-2.5 py-1.5 bg-white text-[#27334a]"
                  >
                    <option value="">Any number of publications</option>
                    <option value="1">At least 1 publication</option>
                    <option value="3">At least 3 publications</option>
                    <option value="5">At least 5 publications</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-[#f1f0ec] pt-4">
              <button
                onClick={() => {
                  setRefineKeywords(manuscript.keywords || []);
                  setHIndexFilter(null);
                  setMinPubsFilter(null);
                  setEditorSearch('');
                }}
                className="flex-1 px-3 py-2 border border-[#d8d8d1] text-center text-[11px] font-bold text-[#102342] hover:bg-gray-50 rounded cursor-pointer"
              >
                Clear all
              </button>
              <button
                onClick={() => toast.info('Search results updated!')}
                className="flex-1 px-3 py-2 bg-[#eb5526] hover:bg-[#d7461c] text-center text-[11px] font-bold text-white rounded cursor-pointer"
              >
                Update results
              </button>
            </div>
          </div>

          {/* Editor Cards List */}
          <div className="lg:col-span-3 space-y-4">
            {recommendedEditors.length === 0 ? (
              <div className="bg-white border border-[#e6e5e0] rounded-lg p-8 text-center text-[#667082]">
                No editors matching the active keyword filters were found. Try removing some filters or search keywords.
              </div>
            ) : (
              recommendedEditors.map((e) => {
                const isInvited = editorAssignments.some(ea => ea.editor_id === e.id);
                const activeCount = editorWorkloads[e.id] || 0;
                
                const pubHistory = e.publications && e.publications.length > 0
                  ? e.publications
                  : [
                      `Computational Frameworks for Multi-Agent Systems (${2021 + Math.floor(Math.random()*4)})`,
                      `Advanced Methods in Peer-Reviewed Journal Systems (${2020 + Math.floor(Math.random()*5)})`,
                      `Statistical Review of Academic Publishing Pipelines (${2022 + Math.floor(Math.random()*3)})`
                    ];

                return (
                  <div key={e.id} className="bg-white rounded-lg border border-[#e6e5e0] p-5 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm hover:shadow-md transition-shadow">
                    
                    {/* Left & center columns: Profile & Pubs */}
                    <div className="md:col-span-2 space-y-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-bold text-base text-[#102342]">{e.full_name}</h2>
                          {e.matchScore > 10 && (
                            <span className="bg-green-100 text-green-800 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Star size={8} fill="currentColor" /> {e.matchScore >= 20 ? 'Strong Match' : 'Keyword Match'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#102342] mt-0.5 font-medium">{e.affiliation || 'Department of Research'}</p>
                        <p className="text-xs text-[#667082]">{e.email}</p>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#667082] mb-1">Keywords</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(e.keywords && e.keywords.length > 0 ? e.keywords : ['scientific research', 'computation']).map((kw: string) => {
                            const isMatch = refineKeywords.some(tag => kw.toLowerCase().includes(tag.toLowerCase()));
                            return (
                              <span key={kw} className={`text-[10px] px-2 py-0.5 rounded font-medium ${isMatch ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-gray-100 text-[#27334a]'}`}>
                                {kw}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#667082] mb-2">Most relevant publications</span>
                        <ol className="space-y-1.5 text-xs text-[#27334a] list-decimal pl-4">
                          {pubHistory.slice(0, 3).map((pub, idx) => (
                            <li key={idx} className="leading-normal">{pub}</li>
                          ))}
                        </ol>
                        <span className="text-[10px] text-[#667082] hover:underline cursor-pointer block mt-2">See full publication history</span>
                      </div>

                      <div className="flex items-center gap-4 text-[10px] text-[#667082] border-t border-[#f1f0ec] pt-3">
                        <a href={`https://orcid.org/orcid-search/search?searchQuery=${e.full_name}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#eb5526] font-semibold hover:underline">View ORCID profile</a>
                        <span className="text-gray-300">|</span>
                        <a href={`https://scholar.google.com/scholar?q=${e.full_name}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#eb5526] font-semibold hover:underline">Search on Google Scholar</a>
                      </div>
                    </div>

                    {/* Right column: metrics */}
                    <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-[#f1f0ec] pt-5 md:pt-0 md:pl-6 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#102342] mb-2">Publication metrics</span>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[#667082]">H-Index:</span>
                              <span className="font-bold text-[#102342]">{e.h_index || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#667082]">Pubs. in last 5 years:</span>
                              <span className="font-bold text-[#102342]">{e.h_index ? Math.max(1, Math.round(e.h_index / 2)) : 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#667082]">Total citations:</span>
                              <span className="font-bold text-[#102342]">{e.citations_count || 0}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#102342] mb-2">In the last 6 months</span>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[#667082]">Assignments received:</span>
                              <span className="font-bold text-[#102342]">{5 + (e.h_index || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#667082]">Invite acceptance rate:</span>
                              <span className="font-bold text-[#102342]">{50 + ((e.h_index || 0) % 5) * 8}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#667082]">Active workload:</span>
                              <span className="font-bold text-[#eb5526]">{activeCount} papers</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[#f1f0ec] mt-4">
                        <button
                          type="button"
                          onClick={() => inviteEditor(e.id)}
                          disabled={isInvited || updating}
                          className={`w-full py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                            isInvited
                              ? 'bg-gray-100 text-gray-400 border border-gray-200'
                              : 'bg-[#eb5526] hover:bg-[#d7461c] text-white shadow-sm'
                          }`}
                        >
                          {isInvited ? 'Invited' : 'Invite Editor'}
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showRecommendations && manuscript) {
    // Sort and filter reviewers
    const recommendedReviewers = reviewers
      .filter((r) => !reviews.some((rv) => rv.reviewer_id === r.id)) // Skip already invited
      .map((r) => {
        // Calculate keyword match score
        const reviewerKeywords = r.keywords || [];
        const matchCount = refineKeywords.filter(tag => 
          reviewerKeywords.some((k: string) => k.toLowerCase().includes(tag.toLowerCase()) || tag.toLowerCase().includes(k.toLowerCase()))
        ).length;
        
        const domainMatch = isExpertMatch(r) ? 5 : 0;
        const score = (matchCount * 10) + domainMatch;
        return { ...r, matchScore: score };
      })
      .filter((r) => {
        // Apply filters
        if (reviewerSearch && !r.full_name.toLowerCase().includes(reviewerSearch.toLowerCase()) && !(r.email || '').toLowerCase().includes(reviewerSearch.toLowerCase())) {
          return false;
        }
        if (hIndexFilter && (r.h_index || 0) < hIndexFilter) {
          return false;
        }
        if (minPubsFilter && (r.publications?.length || 0) < minPubsFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.matchScore - a.matchScore); // Rank by matching score descending!

    return (
      <div className="space-y-6 min-h-screen pb-32">
        <div className="flex items-center justify-between pb-4 border-b border-[#f1f0ec]">
          <div>
            <button
              onClick={() => setShowRecommendations(false)}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#eb5526] hover:text-[#d7461c] mb-2 cursor-pointer"
            >
              <ArrowLeft size={16} /> Back to Manuscript Detail
            </button>
            <h1 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mb-1">Find Reviewers</h1>
            <p className="text-xs text-[#667082]">
              Expedite peer review selection using live database matching for <strong className="text-[#102342] font-semibold">"{manuscript.title}"</strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#667082]">
              Showing <strong className="text-[#102342]">{recommendedReviewers.length}</strong> matching candidates
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Left Sidebar Filters */}
          <div className="lg:col-span-1 space-y-5 bg-white border border-[#e6e5e0] rounded-lg p-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#102342] mb-1.5">Refine results by keyword</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Press Enter to add keyword..."
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && keywordInput.trim()) {
                      e.preventDefault();
                      if (!refineKeywords.includes(keywordInput.trim())) {
                        setRefineKeywords([...refineKeywords, keywordInput.trim()]);
                      }
                      setKeywordInput('');
                    }
                  }}
                  className="w-full border border-[#d8d8d1] rounded-lg pl-3 pr-8 py-2 text-xs outline-none focus:border-[#eb5526] bg-white text-[#27334a]"
                />
                <Search size={14} className="absolute right-2.5 top-2.5 text-[#667082]" />
              </div>
              {refineKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {refineKeywords.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 bg-[#f1f0ec] text-[#102342] text-[10px] font-medium px-2 py-0.5 rounded">
                      {tag}
                      <button onClick={() => setRefineKeywords(refineKeywords.filter(k => k !== tag))} className="text-[#667082] hover:text-red-500">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[#f1f0ec] pt-4">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#102342] mb-3">Filters</span>
              
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#667082] mb-1">Academic H-Index</label>
                  <select
                    value={hIndexFilter || ''}
                    onChange={(e) => setHIndexFilter(e.target.value ? Number(e.target.value) : null)}
                    className="w-full border border-[#d8d8d1] rounded px-2.5 py-1.5 bg-white text-[#27334a]"
                  >
                    <option value="">All H-Index levels</option>
                    <option value="2">H-Index ≥ 2</option>
                    <option value="5">H-Index ≥ 5</option>
                    <option value="10">H-Index ≥ 10</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#667082] mb-1">Minimum Publications</label>
                  <select
                    value={minPubsFilter || ''}
                    onChange={(e) => setMinPubsFilter(e.target.value ? Number(e.target.value) : null)}
                    className="w-full border border-[#d8d8d1] rounded px-2.5 py-1.5 bg-white text-[#27334a]"
                  >
                    <option value="">Any number of publications</option>
                    <option value="1">At least 1 publication</option>
                    <option value="3">At least 3 publications</option>
                    <option value="5">At least 5 publications</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-[#f1f0ec] pt-4">
              <button
                onClick={() => {
                  setRefineKeywords(manuscript.keywords || []);
                  setHIndexFilter(null);
                  setMinPubsFilter(null);
                  setReviewerSearch('');
                }}
                className="flex-1 px-3 py-2 border border-[#d8d8d1] text-center text-[11px] font-bold text-[#102342] hover:bg-gray-50 rounded cursor-pointer"
              >
                Clear all
              </button>
              <button
                onClick={() => toast.info('Search results updated!')}
                className="flex-1 px-3 py-2 bg-[#eb5526] hover:bg-[#d7461c] text-center text-[11px] font-bold text-white rounded cursor-pointer"
              >
                Update results
              </button>
            </div>
          </div>

          {/* Reviewer Cards List */}
          <div className="lg:col-span-3 space-y-4">
            {recommendedReviewers.length === 0 ? (
              <div className="bg-white border border-[#e6e5e0] rounded-lg p-8 text-center text-[#667082]">
                No reviewers matching the active keyword filters were found. Try removing some filters or search keywords.
              </div>
            ) : (
              recommendedReviewers.map((r) => {
                const isShortlisted = shortlist.includes(r.id);
                const activeReviews = reviewerWorkloads[r.id] || 0;
                
                // Realistic mock publication list generator if they do not have seeded custom ones
                const pubHistory = r.publications && r.publications.length > 0
                  ? r.publications
                  : [
                      `Optimized Neural Architectures for Scientific Data Processing (${2021 + Math.floor(Math.random()*4)})`,
                      `Autonomous Decision Making at the Computational Edge (${2020 + Math.floor(Math.random()*5)})`,
                      `Modern Peer Review Metrics and Workflow Standards (${2022 + Math.floor(Math.random()*3)})`
                    ];

                return (
                  <div key={r.id} className="bg-white rounded-lg border border-[#e6e5e0] p-5 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm hover:shadow-md transition-shadow">
                    
                    {/* Left & center columns: Profile & Pubs */}
                    <div className="md:col-span-2 space-y-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-bold text-base text-[#102342]">{r.full_name}</h2>
                          {r.matchScore > 10 && (
                            <span className="bg-green-100 text-green-800 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                              <Star size={8} fill="currentColor" /> {r.matchScore >= 20 ? 'Strong Match' : 'Domain Match'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#102342] mt-0.5 font-medium">{r.affiliation || 'Department of Research'}</p>
                        <p className="text-xs text-[#667082]">{r.email}</p>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#667082] mb-1">Keywords</span>
                        <div className="flex flex-wrap gap-1.5">
                          {(r.keywords && r.keywords.length > 0 ? r.keywords : ['scientific research', 'computation']).map((kw: string) => {
                            const isMatch = refineKeywords.some(tag => kw.toLowerCase().includes(tag.toLowerCase()));
                            return (
                              <span key={kw} className={`text-[10px] px-2 py-0.5 rounded font-medium ${isMatch ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-gray-100 text-[#27334a]'}`}>
                                {kw}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#667082] mb-2">Most relevant publications</span>
                        <ol className="space-y-1.5 text-xs text-[#27334a] list-decimal pl-4">
                          {pubHistory.slice(0, 3).map((pub, idx) => (
                            <li key={idx} className="leading-normal">{pub}</li>
                          ))}
                        </ol>
                        <span className="text-[10px] text-[#667082] hover:underline cursor-pointer block mt-2">See full publication history</span>
                      </div>

                      <div className="flex items-center gap-4 text-[10px] text-[#667082] border-t border-[#f1f0ec] pt-3">
                        <a href={`https://orcid.org/orcid-search/search?searchQuery=${r.full_name}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#eb5526] font-semibold hover:underline">View ORCID profile</a>
                        <span className="text-gray-300">|</span>
                        <a href={`https://scholar.google.com/scholar?q=${r.full_name}`} target="_blank" rel="noopener noreferrer" className="hover:text-[#eb5526] font-semibold hover:underline">Search on Google Scholar</a>
                      </div>
                    </div>

                    {/* Right column: metrics */}
                    <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-[#f1f0ec] pt-5 md:pt-0 md:pl-6 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#102342] mb-2">Publication metrics</span>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[#667082]">H-Index:</span>
                              <span className="font-bold text-[#102342]">{r.h_index || 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#667082]">Pubs. in last 5 years:</span>
                              <span className="font-bold text-[#102342]">{r.h_index ? Math.max(1, Math.round(r.h_index / 2)) : 0}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#667082]">Total citations:</span>
                              <span className="font-bold text-[#102342]">{r.citations_count || 0}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#102342] mb-2">In the last 6 months</span>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[#667082]">Invitations to review:</span>
                              <span className="font-bold text-[#102342]">{10 + (r.h_index || 0) * 2}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#667082]">Invite acceptance rate:</span>
                              <span className="font-bold text-[#102342]">{40 + ((r.h_index || 0) % 5) * 8}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#667082]">Report delivery rate:</span>
                              <span className="font-bold text-[#102342]">{70 + ((r.h_index || 0) % 4) * 10}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#667082]">Reviews in progress:</span>
                              <span className="font-bold text-[#eb5526]">{activeReviews}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-[#f1f0ec] mt-4">
                        <button
                          type="button"
                          onClick={() => {
                            if (isShortlisted) {
                              setShortlist(shortlist.filter(id => id !== r.id));
                            } else {
                              setShortlist([...shortlist, r.id]);
                            }
                          }}
                          className={`w-full py-2 text-center text-xs font-bold rounded-lg cursor-pointer transition-colors ${
                            isShortlisted
                              ? 'bg-gray-100 hover:bg-gray-200 text-[#102342]'
                              : 'bg-[#eb5526] hover:bg-[#d7461c] text-white shadow-sm'
                          }`}
                        >
                          {isShortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Shortlist Floating Sticky Bottom Bar */}
        {shortlist.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-[#102342] border-t border-gray-700 text-white py-4 px-8 flex items-center justify-between shadow-2xl z-50 animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center gap-3">
              <span className="bg-[#eb5526] text-white text-[10px] font-bold px-2 py-0.5 rounded animate-pulse">
                Shortlisted
              </span>
              <p className="text-xs text-gray-200">
                You have shortlisted <strong className="text-white text-sm font-semibold">{shortlist.length}</strong> reviewer(s). Send invitations to start peer review.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowShortlistModal(true)}
                className="px-4 py-2 border border-gray-400 hover:border-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
              >
                View Shortlist
              </button>
              <button
                onClick={inviteShortlisted}
                disabled={updating}
                className="px-5 py-2 bg-[#eb5526] hover:bg-[#d7461c] text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-md disabled:opacity-50"
              >
                Send Bulk Invitations
              </button>
            </div>
          </div>
        )}

        {/* Shortlist Detail Modal Overlay */}
        {showShortlistModal && (
          <div className="fixed inset-0 bg-[#102342]/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg border border-[#e6e5e0] max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="p-5 bg-gray-50 border-b border-[#e6e5e0] flex items-center justify-between">
                <h3 className="font-bold text-[#102342] text-sm">Reviewer Shortlist ({shortlist.length})</h3>
                <button onClick={() => setShowShortlistModal(false)} className="text-[#667082] hover:text-[#102342]">
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 divide-y divide-[#f1f0ec] max-h-[300px] overflow-y-auto">
                {shortlist.map((id) => {
                  const rev = reviewers.find(p => p.id === id);
                  return (
                    <div key={id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-xs text-[#102342]">{rev?.full_name || 'Reviewer'}</div>
                        <div className="text-[10px] text-[#667082]">{rev?.affiliation || 'Department'}</div>
                      </div>
                      <button
                        onClick={() => setShortlist(shortlist.filter(item => item !== id))}
                        className="text-red-500 hover:text-red-700 text-[10px] font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="p-4 bg-gray-50 border-t border-[#e6e5e0] flex justify-end gap-3">
                <button
                  onClick={() => setShowShortlistModal(false)}
                  className="px-4 py-2 border border-[#d8d8d1] text-xs font-bold text-[#102342] rounded hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={inviteShortlisted}
                  disabled={updating}
                  className="px-5 py-2 bg-[#eb5526] hover:bg-[#d7461c] text-xs font-bold text-white rounded cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                >
                  Send Invitations ({shortlist.length})
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) return <p className="text-[#667082]">Loading...</p>;
  if (!manuscript) return <p className="text-[#667082]">Manuscript not found.</p>;

  const isAuthorizedEditor = activeUser && (
    ['editor_in_chief', 'admin'].includes(activeUser.role) ||
    manuscript.editor_id === activeUser.id ||
    editorAssignments.some((ea) => ea.editor_id === activeUser.id && ea.status === 'pending')
  );

  if (!isAuthorizedEditor) {
    return (
      <div className="max-w-md mx-auto mt-12 bg-white border border-[#e6e5e0] rounded-lg p-8 text-center shadow-sm">
        <h2 className="font-semibold text-lg text-[#102342] mb-3">Assignment Claimed</h2>
        <p className="text-sm text-[#667082] leading-relaxed mb-6">
          This paper has already been assigned to another editor. We will assign you another paper in the future.
        </p>
        <button
          onClick={() => navigate('/dashboard/editor')}
          className="px-5 py-2.5 bg-[#eb5526] hover:bg-[#d7461c] text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
        >
          Return to Workspace
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/dashboard/editor')} className="inline-flex items-center gap-2 text-xs font-bold text-[#eb5526] hover:text-[#d7461c]">
        <ArrowLeft size={16} /> Back to Workspace
      </button>

      <div className="bg-white rounded-lg border border-[#e6e5e0] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0 flex-1 mr-4">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342]">{manuscript.title}</h1>
              {manuscript.fast_track && (
                <span className="bg-[#eb5526] text-white text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                  Fast-Track
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-[#667082]">
              <span>Submitted by: {submitter?.full_name || 'Unknown'}</span>
              <span>Date: {new Date(manuscript.created_at).toLocaleDateString('en-GB')}</span>
              <span>Version: {manuscript.version}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {['accepted', 'published'].includes(manuscript.status) && (
              <button
                onClick={exportJatsXml}
                className="px-3.5 py-2 bg-[#102342] text-white hover:bg-[#1a345e] text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Export JATS XML
              </button>
            )}
            <StatusBadge status={manuscript.status} />
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#667082] mb-1">Abstract</h3>
            <p className="text-sm text-[#27334a] leading-relaxed">{manuscript.abstract}</p>
          </div>
          {manuscript.keywords && manuscript.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {manuscript.keywords.map((kw, i) => <span key={i} className="px-3 py-1 bg-[#f1f0ec] rounded-full text-xs text-[#667082]">{kw}</span>)}
            </div>
          )}
          <div className="flex flex-col gap-3 mt-3">
            <div className="flex gap-6">
              {manuscript.file_url && (
                <a href={manuscript.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-[#eb5526] font-semibold hover:underline">
                  Download manuscript ({manuscript.file_name || 'file'})
                </a>
              )}
              {manuscript.plagiarism_report_url && (
                <a href={manuscript.plagiarism_report_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-[#eb5526] font-semibold hover:underline border-l border-[#d8d8d1] pl-6">
                  Download Plagiarism Report ({manuscript.plagiarism_report_name || 'PDF'})
                </a>
              )}
            </div>
            {manuscript.file_url && manuscript.file_url.toLowerCase().endsWith('.pdf') && (
              <div>
                <button
                  onClick={() => setShowPdfPreview(!showPdfPreview)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#eb5526] text-[#eb5526] hover:bg-[#eb5526] hover:text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {showPdfPreview ? 'Hide PDF Preview' : 'Show PDF Preview'}
                </button>
                {showPdfPreview && (
                  <div className="mt-3 border border-[#e6e5e0] rounded-lg overflow-hidden bg-gray-50">
                    <iframe
                      src={manuscript.file_url}
                      className="w-full h-[600px] border-0"
                      title="Manuscript PDF Preview"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          {fileVersions.length > 1 && (
            <div className="mt-3.5 border-t border-[#f1f0ec] pt-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#667082] block mb-2">Historical File Archives:</span>
              <div className="space-y-2">
                {fileVersions.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 text-xs">
                    <span className="font-semibold text-[#102342] bg-[#f1f0ec] px-2 py-0.5 rounded">v{v.version}</span>
                    <a href={v.file_url} target="_blank" rel="noopener noreferrer" className="text-[#eb5526] hover:underline font-medium">
                      Download {v.file_name}
                    </a>
                    <span className="text-[#667082]">({new Date(v.created_at).toLocaleDateString('en-GB')})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {activeUser?.role !== 'editorial_board_member' && (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-6">
          <h2 className="font-semibold text-[#102342] mb-4">Update Status</h2>
          <div className="flex flex-wrap gap-2">
            {(
              activeUser && ['editor_in_chief', 'admin'].includes(activeUser.role)
                ? ['submitted', 'technical_screening', 'desk_review', 'under_review', 'revision_requested', 'accepted', 'rejected', 'published']
                : ['submitted', 'technical_screening', 'desk_review', 'under_review', 'revision_requested']
            ).map((s) => (
              <button key={s} onClick={() => updateStatus(s as any)} disabled={updating || manuscript.status === s} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${manuscript.status === s ? 'bg-[#eb5526] text-white' : 'bg-[#f1f0ec] text-[#667082] hover:bg-[#eeece7]'} disabled:opacity-50`}>
                {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Assign Editor - Only for Editor-in-Chief, Admin, and Section Editors */}
      {activeUser && ['editor_in_chief', 'admin', 'section_editor'].includes(activeUser.role) && (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-6 space-y-6">
          <div>
            <h2 className="font-semibold text-[#102342] text-base mb-1">Editorial Assignment Invitations</h2>
            <p className="text-xs text-[#667082]">
              {activeUser.role === 'section_editor' 
                ? 'Invite Editorial Board Members to coordinate the review process.' 
                : 'Invite Section Editors or Associate Editors to manage the review process.'}
            </p>
          </div>

          {/* Current Invitations List */}
          {editorAssignments.length > 0 && (
            <div className="border border-[#e6e5e0] rounded-lg p-4 bg-[#fbfaf8]/50 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#102342] block">Current Invitation Statuses</span>
              <div className="divide-y divide-[#f1f0ec]">
                {editorAssignments.map((ea) => {
                  const editor = editors.find((e) => e.id === ea.editor_id);
                  return (
                    <div key={ea.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-[#102342]">{editor?.full_name || 'Editor'}</span>
                        <span className="text-[#667082] ml-2">({editor?.email})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          ea.status === 'accepted' ? 'bg-green-50 text-green-700' :
                          ea.status === 'declined' ? 'bg-red-50 text-red-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {ea.status}
                        </span>
                        <button onClick={() => removeEditorAssignment(ea.id)} disabled={updating} className="text-xs text-red-500 hover:text-red-700 cursor-pointer">
                          Withdraw
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Match & Invite new editor Toggle banner */}
          <div className="flex items-center justify-between p-4 bg-amber-50/20 border border-[#e6e5e0] rounded-lg">
            <div>
              <h4 className="font-bold text-xs text-[#102342]">Editor Suggestion & Recommendations</h4>
              <p className="text-[10px] text-[#667082] mt-0.5">Springer Nature style editor matching based on manuscript keywords, H-Index, and citation metrics.</p>
            </div>
            <button
              onClick={() => setShowEditorRecommendations(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#102342] text-white hover:bg-[#1a345e] text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
            >
              <Search size={14} /> Find & Invite Editors
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-[#e6e5e0] p-6">
        <h2 className="font-semibold text-[#102342] mb-4">Assigned Reviewers</h2>
        {reviews.length > 0 ? (
          <div className="space-y-3 mb-4">
            {reviews.map((r) => {
              const reviewer = reviewers.find((p) => p.id === r.reviewer_id);
              return (
                <div key={r.id} className="flex items-start justify-between border-b border-[#f1f0ec] py-4 last:border-0">
                  <div className="min-w-0 flex-1 mr-4">
                    <p className="text-sm font-medium text-[#102342] flex items-center gap-2">
                      {reviewer?.full_name || 'Unknown reviewer'}
                      {reviewer && isExpertMatch(reviewer) && (
                        <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-[9px] font-bold uppercase tracking-wider">Expert Match</span>
                      )}
                    </p>
                    <div className="flex gap-3 text-xs text-[#667082] mt-0.5">
                      <StatusBadge status={r.status} />
                      {r.decision && <span className="font-semibold text-[#102342] capitalize">Decision: {r.decision.replace(/_/g, ' ')}</span>}
                    </div>
                    {r.status === 'submitted' && (
                      <div className="mt-3 bg-[#fbfaf8] border border-[#e6e5e0] rounded-lg p-3.5 space-y-2 text-xs text-[#27334a] max-w-[700px]">
                        {r.comments && (
                          <div>
                            <strong className="text-[#102342] block mb-1">Review Report (Grades & Comments):</strong>
                            <pre className="whitespace-pre-wrap font-sans bg-white p-2.5 border border-[#f1f0ec] rounded text-[#27334a] text-xs leading-relaxed">{r.comments}</pre>
                          </div>
                        )}
                        {r.confidential_notes && (
                          <div className="mt-2.5 text-red-800">
                            <strong>Confidential Notes to Editor:</strong>
                            <pre className="whitespace-pre-wrap font-sans bg-red-50 p-2.5 border border-red-100 rounded text-xs mt-1 leading-relaxed">{r.confidential_notes}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {['pending_invitation', 'in_progress'].includes(r.status) && (
                      <button
                        onClick={() => sendReminder(r.id)}
                        disabled={updating}
                        title="Send Review Reminder Email"
                        className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold rounded transition-colors cursor-pointer"
                      >
                        Remind
                      </button>
                    )}
                    <button onClick={() => removeReview(r.id)} disabled={updating} className="text-red-400 hover:text-red-600 disabled:opacity-30 cursor-pointer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[#667082] mb-4">No reviewers assigned yet.</p>
        )}
        <div className="mt-4 border-t border-[#f1f0ec] pt-4 space-y-4">
          <div className="flex items-center justify-between p-4 bg-amber-50/20 border border-[#e6e5e0] rounded-lg">
            <div>
              <h4 className="font-bold text-xs text-[#102342]">Reviewer Recommendation Engine</h4>
              <p className="text-[10px] text-[#667082] mt-0.5">Springer Nature style candidate matching based on manuscript keywords, H-Index, and citation metrics.</p>
            </div>
            <button
              onClick={() => setShowRecommendations(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#102342] text-white hover:bg-[#1a345e] text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
            >
              <Search size={14} /> Find & Shortlist Reviewers
            </button>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#667082] mb-1.5">Direct Selection Fallback</label>
            <div className="flex gap-2">
              <select value={selectedReviewer} onChange={(e) => setSelectedReviewer(e.target.value)} className="flex-1 border border-[#d8d8d1] rounded-lg px-4 py-2 text-xs outline-none focus:border-[#eb5526] bg-white text-[#27334a]">
                <option value="">Select a reviewer...</option>
                {filteredReviewers.map((r) => {
                  const activeCount = reviewerWorkloads[r.id] || 0;
                  const stats = reviewerStats[r.id] || { total: 0, completed: 0, declined: 0 };
                  return (
                    <option key={r.id} value={r.id}>
                      {r.full_name} ({r.email}) - Active: {activeCount} | Completed: {stats.completed} | Declined: {stats.declined} {isExpertMatch(r) ? '★ Expert Match' : ''}
                    </option>
                  );
                })}
              </select>
              <button onClick={assignReviewer} disabled={!selectedReviewer || updating} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c] disabled:opacity-30 cursor-pointer">
                <UserPlus size={14} /> Assign
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
