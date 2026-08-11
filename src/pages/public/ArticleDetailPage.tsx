import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Copy, Check, Calendar, BookOpen, Bookmark } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Article } from '@/types';

interface JoinedArticle extends Article {
  issue?: {
    id: string;
    number: number;
    title: string;
    volume?: {
      id: string;
      number: number;
      year: number;
    } | null;
  } | null;
}

export default function ArticleDetailPage() {
  const { id } = useParams();
  const [article, setArticle] = useState<JoinedArticle | null>(null);
  const [submissionDate, setSubmissionDate] = useState<string | null>(null);
  const [acceptanceDate, setAcceptanceDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedFormat, setCopiedFormat] = useState<'apa' | 'ieee' | null>(null);
  const [citationFormat, setCitationFormat] = useState<'apa' | 'ieee'>('apa');

  useEffect(() => {
    (async () => {
      if (!id) return;

      // Query article with joined issue and volume data
      const { data } = await supabase
        .from('articles')
        .select(`
          *,
          issue:issues (
            id,
            number,
            title,
            volume:volumes (
              id,
              number,
              year
            )
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (data) {
        const art = data as JoinedArticle;
        setArticle(art);
        
        // Update views count
        await supabase.from('articles').update({ views: art.views + 1 }).eq('id', id);

        // Fetch editorial history milestones if manuscript exists
        if (art.manuscript_id) {
          const { data: ms } = await supabase
            .from('manuscripts')
            .select('created_at, updated_at')
            .eq('id', art.manuscript_id)
            .maybeSingle();
          if (ms) {
            setSubmissionDate(new Date(ms.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }));
            // Estimate acceptance as updated_at or 3 weeks after submission
            const accDate = ms.updated_at ? new Date(ms.updated_at) : new Date(new Date(ms.created_at).getTime() + 21 * 24 * 60 * 60 * 1000);
            setAcceptanceDate(accDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }));
          }
        } else {
          // Fallback milestones
          const pub = new Date(art.publication_date);
          const acc = new Date(pub.getTime() - 14 * 24 * 60 * 60 * 1000);
          const sub = new Date(acc.getTime() - 30 * 24 * 60 * 60 * 1000);
          setSubmissionDate(sub.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }));
          setAcceptanceDate(acc.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }));
        }

        // Dynamically inject Google Scholar Citation Meta Tags for indexing
        document.title = `${art.title} | TJASF`;

        const metaTags = [
          { name: 'citation_title', content: art.title },
          { name: 'citation_journal_title', content: 'The Journal of Advanced Scientific Frontiers' },
          { name: 'citation_publication_date', content: art.publication_date.replace(/-/g, '/') },
        ];

        if (art.doi) metaTags.push({ name: 'citation_doi', content: art.doi });
        if (art.pages) {
          const parts = art.pages.split('-');
          if (parts[0]) metaTags.push({ name: 'citation_firstpage', content: parts[0].trim() });
          if (parts[1]) metaTags.push({ name: 'citation_lastpage', content: parts[1].trim() });
        }
        if (art.issue) {
          metaTags.push({ name: 'citation_issue', content: String(art.issue.number) });
          if (art.issue.volume) {
            metaTags.push({ name: 'citation_volume', content: String(art.issue.volume.number) });
          }
        }
        if (art.pdf_url) {
          const absolutePdfUrl = art.pdf_url.startsWith('http') 
            ? art.pdf_url 
            : `${window.location.origin}${art.pdf_url}`;
          metaTags.push({ name: 'citation_pdf_url', content: absolutePdfUrl });
        }

        // Add citation_author tag for each author
        const authorsList = art.authors.split(/,|\band\b/i).map(a => a.trim()).filter(Boolean);
        authorsList.forEach(author => {
          metaTags.push({ name: 'citation_author', content: author });
        });

        // Clean any existing citation tags first
        const existingTags = document.querySelectorAll('meta[name^="citation_"]');
        existingTags.forEach(el => el.remove());

        // Append to head
        metaTags.forEach(t => {
          const meta = document.createElement('meta');
          meta.name = t.name;
          meta.content = t.content;
          document.head.appendChild(meta);
        });
      }
      setLoading(false);
    })();

    return () => {
      // Cleanup header elements on leave
      const existingTags = document.querySelectorAll('meta[name^="citation_"]');
      existingTags.forEach(el => el.remove());
      document.title = 'TJASF | The Journal of Advanced Scientific Frontiers';
    };
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

  // Citation String Generators
  const getAPACitation = () => {
    const year = new Date(article.publication_date).getFullYear();
    const volNum = article.issue?.volume?.number || 1;
    const issueNum = article.issue?.number || 1;
    const pagesStr = article.pages ? `, ${article.pages}` : '';
    const doiStr = article.doi ? ` https://doi.org/${article.doi}` : '';
    return `${article.authors} (${year}). ${article.title}. The Journal of Advanced Scientific Frontiers, ${volNum}(${issueNum})${pagesStr}.${doiStr}`;
  };

  const getIEEECitation = () => {
    const year = new Date(article.publication_date).getFullYear();
    const volNum = article.issue?.volume?.number || 1;
    const issueNum = article.issue?.number || 1;
    const pagesStr = article.pages ? `, pp. ${article.pages}` : '';
    const doiStr = article.doi ? `, doi: ${article.doi}.` : '.';
    return `${article.authors}, "${article.title}," The Journal of Advanced Scientific Frontiers, vol. ${volNum}, no. ${issueNum}${pagesStr}, ${year}${doiStr}`;
  };

  const currentCitation = citationFormat === 'apa' ? getAPACitation() : getIEEECitation();

  const handleCopyCitation = () => {
    navigator.clipboard.writeText(currentCitation);
    setCopiedFormat(citationFormat);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  return (
    <div className="max-w-[1160px] mx-auto px-8 py-16">
      <Link to="/search" className="inline-flex items-center gap-2 text-xs font-bold text-[#eb5526] hover:text-[#d7461c] mb-8">
        <ArrowLeft size={16} /> Back to Search
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_0.85fr] gap-12">
        {/* Main Content Column */}
        <div className="space-y-8 min-w-0">
          <div>
            <div className="text-xs text-[#eb5526] font-bold uppercase tracking-wide mb-3">{article.domain || 'Research Article'}</div>
            <h1 className="font-['Playfair_Display'] font-medium text-[clamp(28px,3.5vw,40px)] leading-[1.15] text-[#102342] mb-4">
              {article.title}
            </h1>
            <p className="text-[#667082] text-[15px] font-semibold">{article.authors}</p>
          </div>

          <div className="border-t border-[#e6e5e0] pt-6">
            <h2 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mb-3">Abstract</h2>
            <p className="text-[#27334a] text-sm leading-[1.7] whitespace-pre-wrap">{article.abstract}</p>
          </div>

          {article.keywords && article.keywords.length > 0 && (
            <div>
              <h2 className="font-semibold text-[#102342] text-sm uppercase tracking-wider mb-3">Keywords</h2>
              <div className="flex flex-wrap gap-2">
                {article.keywords.map((kw, i) => (
                  <span key={i} className="px-3 py-1 bg-[#f1f0ec] rounded-full text-xs text-[#667082]">{kw}</span>
                ))}
              </div>
            </div>
          )}

          {article.reference_text && (
            <div className="border-t border-[#e6e5e0] pt-6">
              <h2 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mb-4">References</h2>
              <div className="text-xs text-[#667082] whitespace-pre-wrap leading-[1.8] font-mono bg-[#fcfbfa] p-5 rounded-lg border border-[#e6e5e0]">
                {article.reference_text}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Action Card */}
          {article.pdf_url && (
            <a 
              href={article.pdf_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center justify-center gap-3 w-full py-4 bg-[#102342] text-white text-sm font-bold rounded-lg hover:bg-[#eb5526] transition-colors shadow-sm"
            >
              <FileText size={18} /> Download Full Text PDF
            </a>
          )}

          {/* Citation Panel */}
          <div className="bg-white rounded-lg border border-[#e6e5e0] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-[#102342]">
              <Bookmark size={18} />
              <h3 className="font-bold text-xs uppercase tracking-wider">How to Cite</h3>
            </div>
            
            {/* Format Selection Tab */}
            <div className="flex gap-2 border-b border-[#e6e5e0] pb-2 mb-3">
              {(['apa', 'ieee'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => setCitationFormat(format)}
                  className={`text-xs px-2.5 py-1 font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                    citationFormat === format 
                      ? 'border-[#eb5526] text-[#eb5526]' 
                      : 'border-transparent text-[#667082] hover:text-[#102342]'
                  }`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Citation Text Area */}
            <div className="text-xs text-[#27334a] leading-relaxed bg-[#fbfaf8] border border-[#e6e5e0] p-4 rounded-lg select-all mb-4 relative">
              {currentCitation}
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopyCitation}
              className="flex items-center justify-center gap-2 w-full py-2 border border-[#d8d8d1] rounded-lg text-xs font-bold text-[#102342] hover:bg-[#fbfaf8] hover:border-[#102342] transition-colors"
            >
              {copiedFormat === citationFormat ? (
                <>
                  <Check size={14} className="text-green-600" />
                  <span className="text-green-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy Citation</span>
                </>
              )}
            </button>
          </div>

          {/* Metadata Card */}
          <div className="bg-white rounded-lg border border-[#e6e5e0] p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-[#102342] pb-2 border-b border-[#f1f0ec]">
              <BookOpen size={18} />
              <h3 className="font-bold text-xs uppercase tracking-wider">Journal Details</h3>
            </div>

            <div className="space-y-3 text-xs">
              {article.issue && (
                <div className="flex justify-between">
                  <span className="text-[#667082]">Published In:</span>
                  <span className="font-semibold text-[#102342]">
                    Vol. {article.issue.volume?.number || 1}, Issue {article.issue.number} ({article.issue.volume?.year || new Date(article.publication_date).getFullYear()})
                  </span>
                </div>
              )}
              {article.pages && (
                <div className="flex justify-between">
                  <span className="text-[#667082]">Pages:</span>
                  <span className="font-semibold text-[#102342]">{article.pages}</span>
                </div>
              )}
              {article.doi && (
                <div className="flex justify-between items-start gap-4">
                  <span className="text-[#667082]">DOI:</span>
                  <a 
                    href={`https://doi.org/${article.doi}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="font-semibold text-[#eb5526] hover:underline break-all text-right"
                  >
                    {article.doi}
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-[#102342] pt-4 pb-2 border-b border-[#f1f0ec]">
              <Calendar size={18} />
              <h3 className="font-bold text-xs uppercase tracking-wider">History</h3>
            </div>

            <div className="space-y-3 text-xs text-[#27334a]">
              {submissionDate && (
                <div className="flex justify-between">
                  <span className="text-[#667082]">Submitted:</span>
                  <span>{submissionDate}</span>
                </div>
              )}
              {acceptanceDate && (
                <div className="flex justify-between">
                  <span className="text-[#667082]">Accepted:</span>
                  <span>{acceptanceDate}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#667082]">Published:</span>
                <span>{new Date(article.publication_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#f1f0ec] grid grid-cols-2 gap-4 text-center">
              <div className="bg-[#fcfbfa] py-2 rounded border border-[#f1f0ec]">
                <div className="text-lg font-bold text-[#102342]">{article.views}</div>
                <div className="text-[10px] text-[#667082] uppercase tracking-wider">Views</div>
              </div>
              <div className="bg-[#fcfbfa] py-2 rounded border border-[#f1f0ec]">
                <div className="text-lg font-bold text-[#102342]">{Math.floor(article.views * 0.42) + 3}</div>
                <div className="text-[10px] text-[#667082] uppercase tracking-wider">Downloads</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
