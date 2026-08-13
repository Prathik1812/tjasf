import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Issue, Volume, Article } from '@/types';

export default function CurrentIssuePage() {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [volume, setVolume] = useState<Volume | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: iss } = await supabase
        .from('issues')
        .select('*')
        .eq('is_published', true)
        .order('publication_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (iss) {
        setIssue(iss as Issue);
        const { data: vol } = await supabase
          .from('volumes')
          .select('*')
          .eq('id', (iss as Issue).volume_id)
          .maybeSingle();
        if (vol) setVolume(vol as Volume);
        const { data: arts } = await supabase
          .from('articles')
          .select('*')
          .eq('issue_id', (iss as Issue).id)
          .order('publication_date', { ascending: false });
        if (arts) setArticles(arts as Article[]);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="py-20 text-center text-[#667082]">Loading...</div>;

  if (!issue) {
    return (
      <div className="max-w-[800px] mx-auto px-8 py-20 text-center">
        <h1 className="font-['Playfair_Display'] font-medium text-4xl text-[#102342] mb-4">No Current Issue</h1>
        <p className="text-[#667082] text-lg mb-8">No issues have been published yet. The first issue will appear here once it is ready.</p>
        <Link to="/archives" className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold text-white bg-[#eb5526] hover:bg-[#d7461c]">
          Browse Archives
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1160px] mx-auto px-8 py-20">
      <div className="text-[#eb5526] uppercase tracking-[0.14em] text-[10px] font-bold mb-4">Current Issue</div>
      <h1 className="font-['Playfair_Display'] font-medium text-[clamp(36px,5vw,56px)] leading-[1.08] text-[#102342] mb-12">
        Volume {volume?.number || ''}, Issue {issue.number}
      </h1>

      {articles.length === 0 ? (
        <div className="bg-[#f1f0ec] rounded-lg p-12 text-center">
          <p className="text-[#667082] text-lg">No articles in this issue yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((a) => (
            <Link key={a.id} to={`/article/${a.id}`} className="block bg-white rounded-lg border border-[#e6e5e0] p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between text-xs text-[#eb5526] font-bold uppercase tracking-wide mb-2">
                <span>{a.domain || 'Research'}</span>
                {a.doi && <span className="text-[#667082]">DOI: {a.doi}</span>}
              </div>
              <h2 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mb-2">{a.title}</h2>
              <p className="text-sm text-[#667082] mb-2">{a.authors}</p>
              <p className="text-sm text-[#667082] line-clamp-2">{a.abstract}</p>
              <div className="flex gap-4 mt-3 text-xs text-[#667082]">
                {a.pages && <span>Pages: {a.pages}</span>}
                <span>{a.views} views</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
