import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/DashboardLayout';
import type { Review, Manuscript } from '@/types';

export default function MyReviewsPage() {
  const { profile } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [manuscripts, setManuscripts] = useState<Record<string, Manuscript>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!profile) return;
      const { data } = await supabase.from('reviews').select('*').eq('reviewer_id', profile.id).order('created_at', { ascending: false });
      if (data) {
        setReviews(data as Review[]);
        const msIds = (data as Review[]).map((r) => r.manuscript_id);
        if (msIds.length > 0) {
          const { data: msData } = await supabase.from('manuscripts').select('*').in('id', msIds);
          if (msData) {
            const map: Record<string, Manuscript> = {};
            (msData as Manuscript[]).forEach((m) => {
              map[m.id] = m;
            });
            setManuscripts(map);
          }
        }
      }
      setLoading(false);
    })();
  }, [profile]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342]">My Reviews</h1>
        <p className="text-[#667082] text-sm mt-1">Manuscripts assigned to you for peer review</p>
      </div>

      {loading ? (
        <p className="text-[#667082]">Loading...</p>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-12 text-center">
          <ClipboardList size={40} className="mx-auto text-[#d8d8d1] mb-4" />
          <p className="text-[#667082] text-lg">No review assignments</p>
          <p className="text-[#667082] text-sm mt-2">When an editor assigns you to review a manuscript, it will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => {
            const ms = manuscripts[r.manuscript_id];
            return (
              <Link key={r.id} to={`/dashboard/reviews/${r.id}`} className="block bg-white rounded-lg border border-[#e6e5e0] p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[#102342] truncate">{ms?.title || 'Manuscript unavailable'}</h3>
                    <div className="flex gap-4 text-xs text-[#667082] mt-1">
                      <span>Invited: {new Date(r.invited_at).toLocaleDateString('en-GB')}</span>
                      {r.due_date && <span>Due: {new Date(r.due_date).toLocaleDateString('en-GB')}</span>}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
