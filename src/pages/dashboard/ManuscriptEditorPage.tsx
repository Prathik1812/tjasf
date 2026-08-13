import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/DashboardLayout';
import { sendDecisionEmail } from '@/lib/email';
import type { Manuscript, Profile, Review, ManuscriptStatus, ReviewStatus, Domain } from '@/types';

export default function ManuscriptEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [submitter, setSubmitter] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewers, setReviewers] = useState<Profile[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: ms } = await supabase.from('manuscripts').select('*').eq('id', id).maybeSingle();
      if (ms) {
        setManuscript(ms as Manuscript);
        const { data: sub } = await supabase.from('profiles').select('*').eq('id', (ms as Manuscript).submitter_id).maybeSingle();
        if (sub) setSubmitter(sub as Profile);
        const { data: revs } = await supabase.from('reviews').select('*').eq('manuscript_id', id);
        if (revs) setReviews(revs as Review[]);
        const { data: revwrs } = await supabase.from('profiles').select('*').in('role', ['reviewer', 'section_editor']);
        if (revwrs) setReviewers(revwrs as Profile[]);
        const { data: doms } = await supabase.from('domains').select('*');
        if (doms) setDomains(doms as Domain[]);
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

  if (loading) return <p className="text-[#667082]">Loading...</p>;
  if (!manuscript) return <p className="text-[#667082]">Manuscript not found.</p>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/dashboard/editor')} className="inline-flex items-center gap-2 text-xs font-bold text-[#eb5526] hover:text-[#d7461c]">
        <ArrowLeft size={16} /> Back to Workspace
      </button>

      <div className="bg-white rounded-lg border border-[#e6e5e0] p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342]">{manuscript.title}</h1>
          <StatusBadge status={manuscript.status} />
        </div>
        <div className="space-y-3">
          <div className="flex gap-4 text-xs text-[#667082]">
            <span>Submitted by: {submitter?.full_name || 'Unknown'}</span>
            <span>Date: {new Date(manuscript.created_at).toLocaleDateString('en-GB')}</span>
            <span>Version: {manuscript.version}</span>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[#667082] mb-1">Abstract</h3>
            <p className="text-sm text-[#27334a] leading-relaxed">{manuscript.abstract}</p>
          </div>
          {manuscript.keywords && manuscript.keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {manuscript.keywords.map((kw, i) => <span key={i} className="px-3 py-1 bg-[#f1f0ec] rounded-full text-xs text-[#667082]">{kw}</span>)}
            </div>
          )}
          <div className="flex gap-6 mt-3">
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

      <div className="bg-white rounded-lg border border-[#e6e5e0] p-6">
        <h2 className="font-semibold text-[#102342] mb-4">Assigned Reviewers</h2>
        {reviews.length > 0 ? (
          <div className="space-y-3 mb-4">
            {reviews.map((r) => {
              const reviewer = reviewers.find((p) => p.id === r.reviewer_id);
              return (
                <div key={r.id} className="flex items-center justify-between border-b border-[#f1f0ec] pb-3 last:border-0">
                  <div>
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
                  </div>
                  <button onClick={() => removeReview(r.id)} disabled={updating} className="text-red-400 hover:text-red-600 disabled:opacity-30">
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[#667082] mb-4">No reviewers assigned yet.</p>
        )}
        <div className="flex gap-2">
          <select value={selectedReviewer} onChange={(e) => setSelectedReviewer(e.target.value)} className="flex-1 border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526] bg-white">
            <option value="">Select a reviewer...</option>
            {reviewers.filter((r) => !reviews.some((rv) => rv.reviewer_id === r.id)).map((r) => (
              <option key={r.id} value={r.id}>
                {r.full_name} ({r.email}) {isExpertMatch(r) ? '★ Expert Match' : ''}
              </option>
            ))}
          </select>
          <button onClick={assignReviewer} disabled={!selectedReviewer || updating} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#eb5526] text-white text-sm font-bold rounded-lg hover:bg-[#d7461c] disabled:opacity-30">
            <UserPlus size={16} /> Assign
          </button>
        </div>
      </div>
    </div>
  );
}
