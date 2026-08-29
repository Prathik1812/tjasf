import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, FileText, Users, ShieldCheck, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Article, Issue, Volume, Announcement } from '@/types';

export default function HomePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentIssue, setCurrentIssue] = useState<Issue | null>(null);
  const [currentVolume, setCurrentVolume] = useState<Volume | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [publishedVolumesCount, setPublishedVolumesCount] = useState<number>(1);

  useEffect(() => {
    (async () => {
      // Fetch published issue
      const { data: issues } = await supabase
        .from('issues')
        .select('*')
        .order('publication_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (issues) {
        setCurrentIssue(issues as Issue);
        const { data: vol } = await supabase
          .from('volumes')
          .select('*')
          .eq('id', (issues as Issue).volume_id)
          .maybeSingle();
        if (vol) setCurrentVolume(vol as Volume);
      } else {
        // Fallback to initial Volume 1 & Issue 1
        const { data: vol } = await supabase.from('volumes').select('*').limit(1).maybeSingle();
        if (vol) {
          setCurrentVolume(vol as Volume);
          const { data: iss } = await supabase.from('issues').select('*').eq('volume_id', vol.id).limit(1).maybeSingle();
          if (iss) setCurrentIssue(iss as Issue);
        }
      }

      const { data: vols } = await supabase.from('volumes').select('id');
      if (vols && vols.length > 0) setPublishedVolumesCount(vols.length);

      const { data: arts } = await supabase
        .from('articles')
        .select('*')
        .order('publication_date', { ascending: false })
        .limit(3);
      if (arts) setArticles(arts as Article[]);

      const { data: anns } = await supabase
        .from('announcements')
        .select('*')
        .order('date', { ascending: false })
        .limit(3);
      if (anns) setAnnouncements(anns as Announcement[]);

      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <section className="bg-[#f2f1ed] relative overflow-hidden">
        <div className="max-w-[1160px] mx-auto px-8 grid grid-cols-1 md:grid-cols-[1.55fr_0.75fr] gap-20 items-center min-h-[518px] relative z-10">
          <div>
            <div className="flex items-center gap-2.5 text-[#eb5526] uppercase tracking-[0.14em] text-[10px] font-bold">
              <span className="w-7 h-px bg-[#eb5526]" /> Open access &middot; Multidisciplinary research
            </div>
            <h1 className="font-['Playfair_Display'] font-medium text-[clamp(46px,6vw,76px)] leading-[1.03] mt-6 mb-6 text-[#102342] tracking-tight">
              Where bold ideas<br /><em className="text-[#eb5526] italic">move science forward.</em>
            </h1>
            <p className="text-[#596476] max-w-[550px] text-[17px] leading-[1.65] mb-8">
              TJASF is a peer-reviewed, open-access journal publishing high-quality research across science, engineering, and technology.
            </p>
            <div className="flex items-center gap-7">
              <Link to="/current-issue" className="inline-flex items-center gap-3 px-5 py-3.5 text-xs font-bold text-white bg-[#eb5526] hover:bg-[#d7461c] transition-all hover:-translate-y-0.5">
                Explore latest research <ArrowRight size={17} />
              </Link>
              <Link to="/about" className="inline-flex items-center gap-2 text-xs font-bold text-[#eb5526] hover:text-[#d7461c]">
                Discover the journal <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          {currentIssue && currentVolume ? (
            <div className="bg-[#102342] text-white p-8 shadow-[16px_17px_0_rgba(235,85,38,0.12)]">
              <div className="flex justify-between text-[10px] uppercase tracking-[0.15em] text-[#cad3e1]">
                <span>Now publishing</span>
                <span className="w-1.5 h-1.5 bg-[#eb5526] rounded-full" />
              </div>
              <div className="font-['Playfair_Display'] text-[72px] leading-none mt-10 tracking-tight">
                {String(currentIssue.number).padStart(2, '0')}<span className="text-[#eb5526] text-[32px] mx-1">/</span>{currentVolume.year}
              </div>
              <p className="text-[#bbc5d4] text-xs mt-2">Volume {currentVolume.number} &middot; Issue {currentIssue.number}</p>
              <div className="h-px bg-[#53627a] my-5" />
              <p className="font-['Playfair_Display'] text-[15px] leading-[1.45] text-white max-w-[210px]">
                {currentIssue.title && !currentIssue.title.toLowerCase().includes('frontier') ? currentIssue.title : 'Inaugural Issue'}
              </p>
              <Link to={`/issue/${currentIssue.id}`} className="inline-flex items-center gap-2 text-xs font-bold text-[#eb5526] mt-4">
                View the current issue <ArrowRight size={15} />
              </Link>
            </div>
          ) : !loading ? (
            <div className="bg-[#102342] text-white p-8 shadow-[16px_17px_0_rgba(235,85,38,0.12)]">
              <p className="text-[#bbc5d4] text-sm">No issues published yet. Check back soon.</p>
              <Link to="/about" className="inline-flex items-center gap-2 text-xs font-bold text-[#eb5526] mt-4">
                Learn about the journal <ArrowRight size={15} />
              </Link>
            </div>
          ) : null}
        </div>
        <div className="absolute right-[-30px] bottom-[-95px] text-[rgba(16,35,66,0.035)] font-['Playfair_Display'] font-semibold text-[280px] leading-none tracking-tight pointer-events-none">
          TJASF
        </div>
      </section>

      <section className="bg-[#eb5526] text-white">
        <div className="max-w-[1160px] mx-auto px-8 grid grid-cols-2 md:grid-cols-4 py-6">
          {[
            { v: String(publishedVolumesCount).padStart(2, '0'), l: 'Volumes published' },
            { v: '06', l: 'Scientific domains' },
            { v: '100%', l: 'Open access' },
            { v: 'Global', l: 'Editorial community' },
          ].map((s, i) => (
            <div key={i} className={`flex items-center gap-4 ${i > 0 ? 'md:pl-8' : ''} ${i === 1 ? 'md:border-l md:border-white/25' : ''} ${i === 2 ? 'md:border-l md:border-white/25' : ''} ${i === 3 ? 'md:border-l md:border-white/25' : ''}`}>
              <strong className="font-['Playfair_Display'] font-medium text-[31px]">{s.v}</strong>
              <span className="text-[10px] leading-[1.35] uppercase tracking-[0.15em] opacity-85">{s.l}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-[1160px] mx-auto px-8 grid grid-cols-1 md:grid-cols-[1fr_2.25fr] gap-16">
          <div className="flex items-start gap-2.5 text-[#eb5526] uppercase tracking-[0.14em] text-[10px] font-bold">
            01 <span className="text-[#737b88] tracking-[0.08em]">About the journal</span>
          </div>
          <div>
            <h2 className="font-['Playfair_Display'] font-medium text-[clamp(34px,4vw,52px)] leading-[1.08] text-[#102342] mb-6 max-w-[710px]">
              Science is most powerful when it refuses to stay in one lane.
            </h2>
            <p className="text-[#667082] text-[18px] leading-[1.7] max-w-[720px] mb-7">
              The Journal of Advanced Scientific Frontiers brings together rigorous research from across disciplines. We publish work that connects methods, fields, and perspectives to build a clearer understanding of the world around us.
            </p>
            <Link to="/about" className="inline-flex items-center gap-2 text-xs font-bold text-[#eb5526] hover:text-[#d7461c]">
              Read our aims &amp; scope <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#f1f0ec] py-20">
        <div className="max-w-[1160px] mx-auto px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <div className="flex items-center gap-2.5 text-[#eb5526] uppercase tracking-[0.14em] text-[10px] font-bold">
                02 <span className="text-[#737b88] tracking-[0.08em]">Latest research</span>
              </div>
              <h2 className="font-['Playfair_Display'] font-medium text-[clamp(34px,4vw,52px)] leading-[1.08] text-[#102342] mt-3.5">Explore what's next.</h2>
            </div>
            <Link to="/search" className="button button-light desktop-link">
              View all articles <ArrowRight size={17} />
            </Link>
          </div>
          {articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {articles.map((article, i) => (
                <Link key={article.id} to={`/article/${article.id}`} className={`bg-white transition-all hover:-translate-y-1.5 hover:shadow-[0_16px_30px_rgba(16,35,66,0.08)] ${i === 0 ? 'md:col-span-1' : ''}`}>
                  <div className="h-[184px] bg-[#dfe5ea] flex justify-end items-start p-4 text-[rgba(16,35,66,0.65)] text-[11px] tracking-wide">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-wide text-[#eb5526]">
                      <span>Article</span>
                      <span className="text-[#8a919b]">{article.domain}</span>
                    </div>
                    <h3 className="font-['Playfair_Display'] font-medium text-[24px] leading-[1.16] mt-4 mb-3 text-[#102342]">{article.title}</h3>
                    <p className="text-[11px] text-[#7b8491] mb-6">{article.authors}</p>
                    <div className="border-t border-[#e3e4e3] pt-3 flex justify-between text-[10px] text-[#838c98]">
                      <span>{new Date(article.publication_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <ArrowRight size={17} className="text-[#eb5526]" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[#667082] text-sm">No articles published yet. The first issue will appear here soon.</p>
          )}
        </div>
      </section>

      {announcements.length > 0 && (
        <section className="py-16 bg-[#fbfaf8]">
          <div className="max-w-[1160px] mx-auto px-8">
            <div className="flex items-center gap-2.5 text-[#eb5526] uppercase tracking-[0.14em] text-[10px] font-bold mb-6">
              Announcements
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {announcements.map((a) => (
                <div key={a.id} className="bg-white rounded-lg border border-[#e6e5e0] p-5">
                  <p className="text-xs text-[#667082] mb-2">{new Date(a.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  <h3 className="font-semibold text-[#102342] mb-2">{a.title}</h3>
                  <p className="text-sm text-[#667082] line-clamp-3">{a.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-[#102342] text-white py-20">
        <div className="max-w-[1160px] mx-auto px-8 grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div className="flex justify-center">
            <img 
              src="/assets/images/journal_cover.png" 
              alt="TJASF Journal Cover" 
              className="w-[255px] h-[350px] object-cover shadow-[17px_17px_0_rgba(235,85,38,0.85)] border border-[#e6e5e0]/20" 
            />
          </div>
          <div>
            <div className="flex items-center gap-2.5 text-[#ff916d] uppercase tracking-[0.14em] text-[10px] font-bold">
              03 <span className="text-[#b9c4d2] tracking-[0.08em]">Featured issue</span>
            </div>
            <h2 className="font-['Playfair_Display'] font-medium text-[clamp(45px,5.5vw,68px)] leading-[1.03] mt-4 mb-5">
              New research.<br /><em className="text-[#eb5526] italic">Wider horizons.</em>
            </h2>
            <p className="text-[#bdc7d5] text-base leading-[1.65] max-w-[440px] mb-7">
              Volume {currentVolume ? String(currentVolume.number).padStart(2, '0') : '01'}, Issue {currentIssue ? String(currentIssue.number).padStart(2, '0') : '01'} brings together new perspectives on the systems shaping our shared future — from responsible computation to resilient environments.
            </p>
            <Link to="/current-issue" className="button button-light">
              Read the current issue <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#fbfaf8]">
        <div className="max-w-[1160px] mx-auto px-8">
          <div className="flex items-center gap-2.5 text-[#eb5526] uppercase tracking-[0.14em] text-[10px] font-bold mb-3.5">
            04 <span className="text-[#737b88] tracking-[0.08em]">For our community</span>
          </div>
          <h2 className="font-['Playfair_Display'] font-medium text-[clamp(34px,4vw,52px)] leading-[1.08] text-[#102342] mb-10">Take the next step.</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#f1f0ec] p-7 border-t-[3px] border-transparent hover:border-[#eb5526] hover:bg-[#eeece7] hover:-translate-y-1 transition-all flex flex-col justify-between">
              <div>
                <div className="w-11 h-11 bg-white text-[#eb5526] flex items-center justify-center mb-6">
                  <FileText size={22} />
                </div>
                <h3 className="font-['Playfair_Display'] font-medium text-[25px] mb-3 text-[#102342]">Submit your research</h3>
                <p className="text-[#717b8a] text-[13px] leading-[1.6] mb-6">Share rigorous, original work with a global scientific audience.</p>
              </div>
              <div className="flex flex-col gap-2.5">
                <Link to="/dashboard/submit" className="inline-flex items-center gap-2 text-xs font-bold text-[#eb5526] hover:underline">
                  Submit a manuscript <ArrowRight size={15} />
                </Link>
                <a href="/assets/templates/TJASF_PaperTemplate.docx" download className="inline-flex items-center gap-2 text-xs font-bold text-[#102342] hover:text-[#eb5526] transition-colors">
                  <Download size={14} /> Download Word Template (.docx)
                </a>
              </div>
            </div>
            <Link to="/join" className="bg-[#f1f0ec] p-7 border-t-[3px] border-transparent hover:border-[#eb5526] hover:bg-[#eeece7] hover:-translate-y-1 transition-all">
              <div className="w-11 h-11 bg-white text-[#eb5526] flex items-center justify-center mb-6">
                <Users size={22} />
              </div>
              <h3 className="font-['Playfair_Display'] font-medium text-[25px] mb-3 text-[#102342]">Join our editorial board</h3>
              <p className="text-[#717b8a] text-[13px] leading-[1.6] mb-5">Apply to join the TJASF Editorial Board or reviewer panel to guide peer review in your specialty.</p>
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[#eb5526]">Apply to join us <ArrowRight size={16} /></span>
            </Link>
            <Link to="/policies" className="bg-[#f1f0ec] p-7 border-t-[3px] border-transparent hover:border-[#eb5526] hover:bg-[#eeece7] hover:-translate-y-1 transition-all">
              <div className="w-11 h-11 bg-white text-[#eb5526] flex items-center justify-center mb-6">
                <ShieldCheck size={22} />
              </div>
              <h3 className="font-['Playfair_Display'] font-medium text-[25px] mb-3 text-[#102342]">Our editorial promise</h3>
              <p className="text-[#717b8a] text-[13px] leading-[1.6] mb-5">Transparent, ethical publishing built around research integrity.</p>
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[#eb5526]">Read our policies <ArrowRight size={16} /></span>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#eb5526] text-white py-16">
        <div className="max-w-[1160px] mx-auto px-8 grid grid-cols-1 md:grid-cols-[0.8fr_1.2fr] gap-14 items-center">
        <div>
          <div className="text-[#ff916d] uppercase tracking-[0.14em] text-[10px] font-bold">Find a paper</div>
          <h2 className="font-['Playfair_Display'] font-medium text-[38px] mt-3">Search the TJASF archive.</h2>
        </div>
        <Link to="/search" className="bg-white flex items-center pl-4 h-14 text-[#7d8792] hover:shadow-lg transition-shadow">
          <Search size={20} className="mr-2" />
          <span className="flex-1 text-sm text-[#7d8792]">Search by title, author or keyword...</span>
          <span className="h-14 bg-[#102342] text-white px-6 flex items-center text-[11px] font-bold">Search</span>
        </Link>
      </div>
      </section>
    </div>
  );
}
