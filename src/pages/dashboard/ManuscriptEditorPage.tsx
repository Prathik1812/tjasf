import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { sendDecisionEmail, sendEditorAssignmentEmail, sendReviewReminderEmail } from '@/lib/email';
import type { Manuscript, Profile, Review, ManuscriptStatus, ReviewStatus, Domain } from '@/types';

export default function ManuscriptEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile: activeUser } = useAuth();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [submitter, setSubmitter] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewers, setReviewers] = useState<Profile[]>([]);
  const [editors, setEditors] = useState<Profile[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [selectedEditor, setSelectedEditor] = useState('');
  const [editorWorkloads, setEditorWorkloads] = useState<Record<string, number>>({});
  const [reviewerWorkloads, setReviewerWorkloads] = useState<Record<string, number>>({});
  const [reviewerStats, setReviewerStats] = useState<Record<string, { total: number, completed: number, declined: number }>>({});
  const [editorSearch, setEditorSearch] = useState('');
  const [reviewerSearch, setReviewerSearch] = useState('');
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [fileVersions, setFileVersions] = useState<{ id: string, version: number, file_url: string, file_name: string, created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: ms } = await supabase.from('manuscripts').select('*').eq('id', id).maybeSingle();
      if (ms) {
        setManuscript(ms as Manuscript);
        setSelectedEditor((ms as Manuscript).editor_id || '');
        const { data: sub } = await supabase.from('profiles').select('*').eq('id', (ms as Manuscript).submitter_id).maybeSingle();
        if (sub) setSubmitter(sub as Profile);
        const { data: revs } = await supabase.from('reviews').select('*').eq('manuscript_id', id);
        if (revs) setReviews(revs as Review[]);
        const { data: revwrs } = await supabase.from('profiles').select('*').in('role', ['reviewer', 'section_editor']);
        if (revwrs) setReviewers(revwrs as Profile[]);
        const { data: eds } = await supabase.from('profiles').select('*').in('role', ['section_editor', 'managing_editor', 'editor_in_chief']);
        if (eds) setEditors(eds as Profile[]);
        const { data: doms } = await supabase.from('domains').select('*');
        if (doms) setDomains(doms as Domain[]);

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

  const assignEditor = async () => {
    if (!manuscript) return;
    setUpdating(true);
    const edId = selectedEditor || null;
    await supabase.from('manuscripts').update({ editor_id: edId }).eq('id', manuscript.id);
    setManuscript({ ...manuscript, editor_id: edId });

    if (edId) {
      const selectedEd = editors.find((e) => e.id === edId);
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
    }
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
      alert(`Reminder email sent successfully to Dr. ${reviewer.full_name}!`);
    } catch (err) {
      console.error('Failed to send reminder email:', err);
      alert('Failed to send reminder email. Please check your network or Vercel logs.');
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
      <issn pub-type="epub">3062-8822</issn>
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

  const filteredEditors = editors.filter((e) =>
    e.full_name.toLowerCase().includes(editorSearch.toLowerCase()) ||
    (e.email || '').toLowerCase().includes(editorSearch.toLowerCase())
  );

  const filteredReviewers = reviewers
    .filter((r) => !reviews.some((rv) => rv.reviewer_id === r.id))
    .filter((r) =>
      r.full_name.toLowerCase().includes(reviewerSearch.toLowerCase()) ||
      (r.email || '').toLowerCase().includes(reviewerSearch.toLowerCase()) ||
      (r.reviewer_domains || []).some((d) => d.toLowerCase().includes(reviewerSearch.toLowerCase()))
    );

  if (loading) return <p className="text-[#667082]">Loading...</p>;
  if (!manuscript) return <p className="text-[#667082]">Manuscript not found.</p>;

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

      <div className="bg-white rounded-lg border border-[#e6e5e0] p-6">
        <h2 className="font-semibold text-[#102342] mb-4">Update Status</h2>
        <div className="flex flex-wrap gap-2">
          {(['submitted', 'technical_screening', 'desk_review', 'under_review', 'revision_requested', 'accepted', 'rejected', 'published'] as ManuscriptStatus[]).map((s) => (
            <button key={s} onClick={() => updateStatus(s)} disabled={updating || manuscript.status === s} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${manuscript.status === s ? 'bg-[#eb5526] text-white' : 'bg-[#f1f0ec] text-[#667082] hover:bg-[#eeece7]'} disabled:opacity-50`}>
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Assign Editor - Only for Editor-in-Chief and Admin */}
      {activeUser && ['editor_in_chief', 'admin'].includes(activeUser.role) && (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-6">
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search editor by name or email..."
              value={editorSearch}
              onChange={(e) => setEditorSearch(e.target.value)}
              className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2 text-xs outline-none focus:border-[#eb5526] bg-white text-[#27334a]"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedEditor}
              onChange={(e) => setSelectedEditor(e.target.value)}
              className="flex-1 border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526] bg-white text-[#27334a]"
            >
              <option value="">Unassigned</option>
              {filteredEditors.map((e) => {
                const count = editorWorkloads[e.id] || 0;
                return (
                  <option key={e.id} value={e.id}>
                    {e.full_name} ({e.email}) - Workload: {count} active paper{count !== 1 ? 's' : ''}
                  </option>
                );
              })}
            </select>
            <button
              onClick={assignEditor}
              disabled={updating}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#eb5526] text-white text-sm font-bold rounded-lg hover:bg-[#d7461c] disabled:opacity-30 cursor-pointer"
            >
              Update Assignment
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
                      {r.decision && <span className="font-semibold text-[#102342]">Decision: {r.decision.replace(/_/g, ' ')}</span>}
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
        <div className="mt-4 border-t border-[#f1f0ec] pt-4">
          <label className="block text-xs font-semibold text-[#102342] mb-1.5">Assign Peer Reviewer</label>
          <div className="mb-3">
            <input
              type="text"
              placeholder="Search reviewer by name, email, or domain..."
              value={reviewerSearch}
              onChange={(e) => setReviewerSearch(e.target.value)}
              className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2 text-xs outline-none focus:border-[#eb5526] bg-white text-[#27334a]"
            />
          </div>
          <div className="flex gap-2">
            <select value={selectedReviewer} onChange={(e) => setSelectedReviewer(e.target.value)} className="flex-1 border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526] bg-white text-[#27334a]">
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
          <button onClick={assignReviewer} disabled={!selectedReviewer || updating} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#eb5526] text-white text-sm font-bold rounded-lg hover:bg-[#d7461c] disabled:opacity-30 cursor-pointer">
            <UserPlus size={16} /> Assign
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}
