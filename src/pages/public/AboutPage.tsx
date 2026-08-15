import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { HomepageContent } from '@/types';

export default function AboutPage() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('homepage_content').select('*');
      if (data) {
        const map: Record<string, string> = {};
        (data as HomepageContent[]).forEach((item) => {
          map[item.key] = item.value;
        });
        setContent(map);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="py-20 text-center text-[#667082]">Loading...</div>;

  return (
    <div className="max-w-[900px] mx-auto px-8 py-20">
      <div className="text-[#eb5526] uppercase tracking-[0.14em] text-[10px] font-bold mb-4">About the journal</div>
      <h1 className="font-['Playfair_Display'] font-medium text-[clamp(36px,5vw,56px)] leading-[1.08] text-[#102342] mb-8">
        {content.about_title || 'The Journal of Advanced Scientific Frontiers'}
      </h1>
      <div className="prose prose-lg max-w-none text-[#27334a] leading-[1.7] space-y-6">
        <p className="text-xl text-[#667082] whitespace-pre-line">
          {content.about_intro || 'TJASF is an international, open-access, peer-reviewed journal dedicated to publishing high-quality research across all scientific disciplines.'}
        </p>
        <h2 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mt-10 mb-3">Aims &amp; Scope</h2>
        <p className="whitespace-pre-line">
          {content.about_aims || 'Our mission is to advance scientific knowledge by publishing rigorous, original research that crosses disciplinary boundaries. We welcome work from the physical sciences, computational science, environmental systems, engineering, and social sciences.'}
        </p>
        <h2 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mt-10 mb-3">Editorial Policy</h2>
        <p className="whitespace-pre-line">
          {content.about_editorial || 'All manuscripts undergo rigorous peer review by qualified experts in the field. We follow a double-blind review process to ensure fairness and objectivity. Our editorial board comprises distinguished researchers from institutions worldwide.'}
        </p>
        <h2 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mt-10 mb-3">Open Access</h2>
        <p className="whitespace-pre-line">
          {content.about_open_access || 'TJASF is fully open access. All published articles are freely available to readers worldwide without subscription fees. Authors retain copyright of their work under a Creative Commons license.'}
        </p>
        <h2 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mt-10 mb-3">Indexing &amp; Impact</h2>
        <p className="whitespace-pre-line">
          {content.about_indexing || 'TJASF is committed to achieving broad indexing coverage. In the future, we are rigorously working to include ourselves in major databases.'}
        </p>
      </div>
    </div>
  );
}
