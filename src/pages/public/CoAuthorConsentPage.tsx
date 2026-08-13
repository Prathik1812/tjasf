import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface AuthorDetails {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'confirmed' | 'declined';
  manuscripts: {
    title: string;
    submitter_id: string;
  };
}

export default function CoAuthorConsentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const authorId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [author, setAuthor] = useState<AuthorDetails | null>(null);
  const [submitterName, setSubmitterName] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      if (!authorId) {
        setLoading(false);
        return;
      }
      try {
        const { data: authData, error: authError } = await supabase
          .from('manuscript_authors')
          .select('id, name, email, status, manuscripts(title, submitter_id)')
          .eq('id', authorId)
          .maybeSingle();

        if (authError || !authData) {
          setLoading(false);
          return;
        }

        setAuthor(authData as unknown as AuthorDetails);

        // Fetch submitter name
        const submitterId = (authData as any).manuscripts?.submitter_id;
        if (submitterId) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', submitterId)
            .maybeSingle();
          if (profile) setSubmitterName(profile.full_name);
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    })();
  }, [authorId]);

  const handleResponse = async (status: 'confirmed' | 'declined') => {
    if (!authorId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('manuscript_authors')
        .update({ status })
        .eq('id', authorId);

      if (error) throw error;

      if (author) {
        setAuthor({ ...author, status });
      }

      setMessage({
        type: 'success',
        text: status === 'confirmed'
          ? 'Thank you! Your authorship consent has been confirmed successfully.'
          : 'You have declined authorship for this manuscript. The editorial office has been notified.'
      });
    } catch (err) {
      console.error(err);
      setMessage({
        type: 'error',
        text: 'Failed to record response. Please try again or contact editorial@tjasf.com.'
      });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbfaf8]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#eb5526] mx-auto" />
          <p className="text-sm text-[#667082]">Loading consent request details...</p>
        </div>
      </div>
    );
  }

  if (!author) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbfaf8] px-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-[#e6e5e0] p-8 text-center space-y-4">
          <XCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-['Playfair_Display'] font-semibold text-[#102342]">Invalid Link</h2>
          <p className="text-sm text-[#667082]">This verification link is invalid, expired, or has been removed.</p>
          <button onClick={() => navigate('/')} className="px-5 py-2.5 bg-[#102342] text-white text-xs font-bold rounded-lg hover:bg-[#1a345e] transition-colors">
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fbfaf8] px-4 py-12">
      <div className="max-w-xl w-full bg-white rounded-xl border border-[#e6e5e0] p-8 md:p-10 shadow-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-['Playfair_Display'] font-semibold text-[#102342] mb-2">Authorship Verification</h1>
          <p className="text-sm text-[#667082]">The Journal of Advanced Scientific Frontiers (TJASF)</p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg text-sm border flex items-start gap-3 ${
            message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <p>{message.text}</p>
          </div>
        )}

        <div className="border border-[#f1f0ec] rounded-lg p-5 space-y-4 bg-gray-50/50">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#667082] block mb-0.5">Manuscript Title</span>
            <p className="text-sm font-medium text-[#102342] leading-snug">"{author.manuscripts.title}"</p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#f1f0ec]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#667082] block mb-0.5">Submitting Author</span>
              <p className="text-sm text-[#27334a]">{submitterName || 'Corresponding Author'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#667082] block mb-0.5">Listed Co-Author</span>
              <p className="text-sm text-[#27334a]">{author.name} ({author.email})</p>
            </div>
          </div>
          <div className="pt-2 border-t border-[#f1f0ec]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#667082] block mb-0.5">Current Status</span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full mt-1 ${
              author.status === 'confirmed' ? 'bg-green-50 text-green-700' :
              author.status === 'declined' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
            }`}>
              {author.status.charAt(0).toUpperCase() + author.status.slice(1)}
            </span>
          </div>
        </div>

        {author.status === 'pending' && (
          <div className="space-y-3 pt-2">
            <p className="text-xs text-[#667082] text-center">
              By confirming, you agree to be listed as a co-author and warrant that you contributed to this research and approve the manuscript.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleResponse('confirmed')}
                disabled={submitting}
                className="flex-1 py-3 bg-[#eb5526] text-white text-sm font-bold rounded-lg hover:bg-[#d7461c] disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
              >
                {submitting ? 'Processing...' : 'Yes, Confirm Authorship'}
              </button>
              <button
                onClick={() => handleResponse('declined')}
                disabled={submitting}
                className="flex-1 py-3 bg-white border border-[#d8d8d1] text-[#667082] text-sm font-bold rounded-lg hover:bg-[#fbfaf8] disabled:opacity-50 transition-colors cursor-pointer"
              >
                No, Decline
              </button>
            </div>
          </div>
        )}

        {author.status !== 'pending' && (
          <div className="text-center pt-2">
            <button onClick={() => navigate('/')} className="px-6 py-2.5 bg-[#102342] text-white text-xs font-bold rounded-lg hover:bg-[#1a345e] transition-colors">
              Go to Homepage
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
