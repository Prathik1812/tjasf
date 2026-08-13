import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/DashboardLayout';
import type { Review, Manuscript, ReviewDecision, ReviewStatus } from '@/types';

export default function ReviewDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState<Review | null>(null);
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const [decision, setDecision] = useState<ReviewDecision | ''>('');
  const [comments, setComments] = useState('');
  const [confidentialNotes, setConfidentialNotes] = useState('');
  
  const [originality, setOriginality] = useState(5);
  const [methodology, setMethodology] = useState(5);
  const [clarity, setClarity] = useState(5);
  const [literature, setLiterature] = useState(5);
  const [impact, setImpact] = useState(5);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: rev } = await supabase.from('reviews').select('*').eq('id', id).maybeSingle();
      if (rev) {
        setReview(rev as Review);
        setDecision((rev as Review).decision || '');
        setConfidentialNotes((rev as Review).confidential_notes || '');
        
        const rawComments = (rev as Review).comments || '';
        const gradesMatch = rawComments.match(/^\[GRADES - ([^\]]+)\]/);
        if (gradesMatch) {
          const gradesStr = gradesMatch[1];
          const grades: Record<string, number> = {};
          gradesStr.split('|').forEach(g => {
            const parts = g.split(':');
            if (parts[0] && parts[1]) {
              grades[parts[0].trim().toLowerCase()] = parseInt(parts[1].split('/')[0]);
            }
          });
          setOriginality(grades['originality'] || 5);
          setMethodology(grades['methodology & rigor'] || grades['methodology'] || 5);
          setClarity(grades['writing clarity & structure'] || grades['clarity'] || 5);
          setLiterature(grades['literature review & context'] || grades['literature'] || 5);
          setImpact(grades['scientific contribution & impact'] || grades['impact'] || 5);
          setComments(rawComments.replace(/^\[GRADES - [^\]]+\]\n\n/, ''));
        } else {
          setComments(rawComments);
        }

        const { data: ms } = await supabase.from('manuscripts').select('*').eq('id', (rev as Review).manuscript_id).maybeSingle();
        if (ms) setManuscript(ms as Manuscript);
      }
      setLoading(false);
    })();
  }, [id]);

  const acceptReview = async () => {
    if (!review || !manuscript) return;
    setSaving(true);
    await supabase.from('reviews').update({ status: 'in_progress' as ReviewStatus, responded_at: new Date().toISOString() }).eq('id', review.id);
    setReview({ ...review, status: 'in_progress' });
    setSaving(false);
  };

  const declineReview = async () => {
    if (!review) return;
    setSaving(true);
    await supabase.from('reviews').update({ status: 'declined' as ReviewStatus, responded_at: new Date().toISOString() }).eq('id', review.id);
    setReview({ ...review, status: 'declined' });
    setSaving(false);
  };

  const submitReview = async () => {
    if (!review || !decision) return;
    setSaving(true);
    const structuredComments = `[GRADES - Originality: ${originality}/5 | Methodology: ${methodology}/5 | Clarity: ${clarity}/5 | Literature: ${literature}/5 | Impact: ${impact}/5]\n\n${comments}`;
    await supabase.from('reviews').update({
      status: 'submitted' as ReviewStatus,
      decision: decision as ReviewDecision,
      comments: structuredComments,
      confidential_notes: confidentialNotes,
      submitted_at: new Date().toISOString(),
    }).eq('id', review.id);
    setReview({ ...review, status: 'submitted', decision: decision as ReviewDecision });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) return <p className="text-[#667082]">Loading...</p>;
  if (!review) return <p className="text-[#667082]">Review not found.</p>;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/dashboard/reviews')} className="inline-flex items-center gap-2 text-xs font-bold text-[#eb5526] hover:text-[#d7461c]">
        <ArrowLeft size={16} /> Back to Reviews
      </button>

      <div className="bg-white rounded-lg border border-[#e6e5e0] p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342]">{manuscript?.title || 'Manuscript'}</h1>
          <StatusBadge status={review.status} />
        </div>
        {manuscript && (
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-[#667082] mb-1">Abstract</h3>
              <p className="text-sm text-[#27334a] leading-relaxed">{manuscript.abstract}</p>
            </div>
            {manuscript.keywords && manuscript.keywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {manuscript.keywords.map((kw, i) => <span key={i} className="px-3 py-1 bg-[#f1f0ec] rounded-full text-xs text-[#667082]">{kw}</span>)}
              </div>
            )}
            {manuscript.file_url && (
              <div className="flex flex-col gap-3">
                <div>
                  <a href={manuscript.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-[#eb5526] font-semibold hover:underline">
                    Download manuscript file ({manuscript.file_name || 'PDF'})
                  </a>
                </div>
                {manuscript.file_url.toLowerCase().endsWith('.pdf') && (
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
            )}
          </div>
        )}
      </div>

      {review.status === 'pending_invitation' && (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-6">
          <h2 className="font-semibold text-[#102342] mb-3">Review Invitation</h2>
          <p className="text-sm text-[#667082] mb-4">You have been invited to review this manuscript. Please accept or decline.</p>
          <div className="flex gap-3">
            <button onClick={acceptReview} disabled={saving} className="px-5 py-2.5 bg-[#eb5526] text-white text-sm font-bold rounded-lg hover:bg-[#d7461c] disabled:opacity-50">Accept</button>
            <button onClick={declineReview} disabled={saving} className="px-5 py-2.5 bg-white border border-[#d8d8d1] text-[#667082] text-sm font-bold rounded-lg hover:bg-[#f1f0ec]">Decline</button>
          </div>
        </div>
      )}

      {review.status === 'declined' && (
        <div className="bg-[#f1f0ec] rounded-lg p-6 text-center">
          <p className="text-[#667082]">You have declined this review invitation.</p>
        </div>
      )}

      {(review.status === 'in_progress' || review.status === 'submitted') && (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-6 space-y-5">
          <h2 className="font-semibold text-[#102342]">Your Review</h2>
          {saved && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">Review submitted successfully.</div>}
          <div>
            <label className="block text-sm font-semibold text-[#102342] mb-1.5">Recommendation *</label>
            <select value={decision} onChange={(e) => setDecision(e.target.value as ReviewDecision)} disabled={review.status === 'submitted'} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526] bg-white disabled:bg-[#f1f0ec]">
              <option value="">Select recommendation...</option>
              <option value="accept">Accept</option>
              <option value="minor_revision">Minor Revision</option>
              <option value="major_revision">Major Revision</option>
              <option value="reject">Reject</option>
            </select>
          </div>

          {/* Section Grading Panel */}
          <div className="bg-[#fbfaf8] border border-[#e6e5e0] rounded-lg p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#102342]">Section Grading</h3>
            <p className="text-xs text-[#667082] -mt-2">Rate each criterion from 1 (poor) to 5 (excellent).</p>
            
            <div className="space-y-3">
              {[
                { label: 'Originality', val: originality, set: setOriginality },
                { label: 'Methodology & Rigor', val: methodology, set: setMethodology },
                { label: 'Writing Clarity & Structure', val: clarity, set: setClarity },
                { label: 'Literature Review & Context', val: literature, set: setLiterature },
                { label: 'Scientific Contribution & Impact', val: impact, set: setImpact },
              ].map((criteria, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#27334a]">{criteria.label}</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        disabled={review.status === 'submitted'}
                        onClick={() => criteria.set(star)}
                        className={`text-xl transition-colors hover:scale-110 active:scale-95 ${
                          star <= criteria.val ? 'text-[#eb5526]' : 'text-[#d8d8d1]'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#102342] mb-1.5">Comments to Authors</label>
            <textarea rows={6} value={comments} onChange={(e) => setComments(e.target.value)} disabled={review.status === 'submitted'} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526] resize-none disabled:bg-[#f1f0ec]" placeholder="Provide detailed feedback for the authors..." />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#102342] mb-1.5">Confidential Notes to Editor</label>
            <textarea rows={4} value={confidentialNotes} onChange={(e) => setConfidentialNotes(e.target.value)} disabled={review.status === 'submitted'} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526] resize-none disabled:bg-[#f1f0ec]" placeholder="Private notes visible only to the editor..." />
          </div>
          {review.status === 'in_progress' && (
            <button onClick={submitReview} disabled={saving || !decision} className="px-6 py-2.5 bg-[#eb5526] text-white text-sm font-bold rounded-lg hover:bg-[#d7461c] disabled:opacity-50">
              {saving ? 'Submitting...' : 'Submit Review'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
