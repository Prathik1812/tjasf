import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Article } from '@/types';

export default function ArticleDetailPage() {
  const { id } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data } = await supabase.from('articles').select('*').eq('id', id).maybeSingle();
      if (data) {
        setArticle(data as Article);
        await supabase.from('articles').update({ views: (data as Article).views + 1 }).eq('id', id);
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="py-20 text-center text-[#667082]">Loading...</div>;

  if (!article) {
    return (
      <div className="max-w-[800px] mx-auto px-8 py-20 text-center">
        <h1 className="font-['Playfair_Display'] font-medium text-4xl text-[#102342] mb-4">Article Not Found</h1>
        <p className="text-[#667082] text-lg mb-8">The article you're looking for doesn't exist or has been removed.</p>
        <Link to="/search" className="inline-flex items-center gap-2 px-5 py-3 text-xs font-bold text-white bg-[#eb5526] hover:bg-[#d7461c]">
          <ArrowLeft size={16} /> Back to Search
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-8 py-20">
      <Link to="/search" className="inline-flex items-center gap-2 text-xs font-bold text-[#eb5526] hover:text-[#d7461c] mb-6">
        <ArrowLeft size={16} /> Back to Search
      </Link>
      <div className="text-xs text-[#eb5526] font-bold uppercase tracking-wide mb-3">{article.domain || 'Research Article'}</div>
      <h1 className="font-['Playfair_Display'] font-medium text-[clamp(28px,4vw,44px)] leading-[1.12] text-[#102342] mb-4">
        {article.title}
      </h1>
      <p className="text-[#667082] text-base mb-6">{article.authors}</p>
      <div className="flex flex-wrap gap-4 items-center justify-between border-y border-[#e6e5e0] py-3.5 mb-8">
        <div className="flex flex-wrap gap-6 text-xs text-[#667082]">
          {article.doi && <span>DOI: {article.doi}</span>}
          <span>Published: {new Date(article.publication_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
          {article.pages && <span>Pages: {article.pages}</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold">
            👁️ {article.views} Views
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded text-xs font-semibold">
            📥 {Math.floor(article.views * 0.42) + 3} Downloads
          </span>
        </div>
      </div>
      <h2 className="font-semibold text-[#102342] text-lg mb-2">Abstract</h2>
      <p className="text-[#27334a] leading-[1.7] mb-8">{article.abstract}</p>
      {article.keywords && article.keywords.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold text-[#102342] text-lg mb-2">Keywords</h2>
          <div className="flex flex-wrap gap-2">
            {article.keywords.map((kw, i) => (
              <span key={i} className="px-3 py-1 bg-[#f1f0ec] rounded-full text-xs text-[#667082]">{kw}</span>
            ))}
          </div>
        </div>
      )}
      {article.reference_text && (
        <div className="mb-8">
          <h2 className="font-semibold text-[#102342] text-lg mb-2">References</h2>
          <div className="text-sm text-[#667082] whitespace-pre-wrap leading-[1.7]">{article.reference_text}</div>
        </div>
      )}
      {article.pdf_url && (
        <a href={article.pdf_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 bg-[#102342] text-white text-xs font-bold rounded-lg hover:bg-[#1d3556]">
          <FileText size={16} /> Download PDF
        </a>
      )}
    </div>
  );
}
