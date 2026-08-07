import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Issue, Volume, Article } from '@/types';

export default function IssueDetailPage() {
  const { id } = useParams();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [volume, setVolume] = useState<Volume | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data: iss } = await supabase.from('issues').select('*').eq('id', id).maybeSingle();
      if (iss) {
        setIssue(iss as Issue);
        const { data: vol } = await supabase.from('volumes').select('*').eq('id', (iss as Issue).volume_id).maybeSingle();
        if (vol) setVolume(vol as Volume);
        const { data: arts } = await supabase.from('articles').select('*').eq('issue_id', id).order('publication_date', { ascending: false });
        if (arts) setArticles(arts as Article[]);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="py-20 text-center text-[#667082]">Loading...</div>;

  if (!issue) {
    return (
      <div className="max-w-[800px] mx-auto px-8 py-20 text-center">
        <h1 className="font-['Playfair_Display'] font-medium text-4xl text-[#102342] mb-4">Issue Not Found</h1>
        <Link to="/archives" className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold text-white bg-[#eb5526]">Back to Archives</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1160px] mx-auto px-8 py-20">
      <Link to="/archives" className="text-xs font-bold text-[#eb5526] hover:text-[#d7461c] mb-6 inline-block">&larr; Back to Archives</Link>
      <div className="text-[#eb5526] uppercase tracking-[0.14em] text-[10px] font-bold mb-4">Volume {volume?.number || ''}, Issue {issue.number}</div>
      <h1 className="font-['Playfair_Display'] font-medium text-[clamp(36px,5vw,56px)] leading-[1.08] text-[#102342] mb-2">
        {issue.title || `Volume ${volume?.number}, Issue ${issue.number}`}
      </h1>
      <p className="text-[#667082] text-lg mb-12">
        {issue.publication_date ? new Date(issue.publication_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Forthcoming'}
      </p>
      {articles.length === 0 ? (
        <div className="bg-[#f1f0ec] rounded-lg p-12 text-center">
          <p className="text-[#667082] text-lg">No articles in this issue.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {articles.map((a) => (
            <Link key={a.id} to={`/article/${a.id}`} className="block bg-white rounded-lg border border-[#e6e5e0] p-6 hover:shadow-lg transition-shadow">
              <div className="text-xs text-[#eb5526] font-bold uppercase tracking-wide mb-2">{a.domain || 'Research'}</div>
              <h2 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mb-1">{a.title}</h2>
              <p className="text-sm text-[#667082] mb-2">{a.authors}</p>
              <p className="text-sm text-[#667082] line-clamp-2">{a.abstract}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
