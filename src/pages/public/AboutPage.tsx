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
        <p className="text-xl text-[#667082] whitespace-pre-line text-justify">
          {content.about_intro || "The Journal of Advanced Scientific Frontiers (TJASF) is a tri-annually published, open-access journal dedicated to publishing high-quality research across science, engineering, and technology."}
        </p>
        <h2 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mt-10 mb-3">Aims &amp; Scope</h2>
        <p className="whitespace-pre-line text-sm text-[#667082] leading-relaxed text-justify">
          {content.about_aims || `The Journal of Advanced Scientific Frontiers (TJASF) is an international, peer-reviewed journal dedicated to publishing high-quality original research articles, review papers, short communications, and case studies that advance the theory, methodologies, and practical applications of modern science, engineering, and technology. The journal serves as a multidisciplinary platform for researchers, academics, industry professionals, and practitioners to disseminate innovative findings and emerging developments across scientific frontiers.

The journal welcomes contributions spanning a broad range of topics, including physical sciences, computational sciences, environmental systems, engineering disciplines, artificial intelligence, data science, cybersecurity, robotics, materials science, mathematics, renewable energy, and smart technologies. We encourage submissions that bridge traditional boundaries and offer new perspectives on scientific challenges.

TJASF particularly encourages research that demonstrates a transformative impact across diverse application domains. These include engineering and technology, healthcare and medical diagnostics, renewable energy and smart grids, transportation and autonomous mobility, smart cities, agriculture, environmental sustainability, education, finance, manufacturing, industrial automation, and public services.

By fostering the exchange of novel ideas, advanced methodologies, and real-world implementations, TJASF aims to promote the responsible development and deployment of scientific and technological innovations that contribute to scientific advancement, technological innovation, economic growth, and societal well-being.`}
        </p>
        <h2 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mt-10 mb-3">Editorial &amp; Peer Review Policy</h2>
        <p className="whitespace-pre-line text-sm text-[#667082] leading-relaxed">
          {content.about_editorial || 'All manuscripts undergo a rigorous double-blind peer review process to ensure academic integrity and objectivity. The initial screening by editorial board members takes 7–10 days. Shortlisted manuscripts are evaluated by two independent subject matter expert reviewers for double-blind peer review (approx. 4–6 weeks). Final decisions are made by the handling editor or Editor-in-Chief based on reviewer feedback.'}
        </p>
        <h2 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mt-10 mb-3">Publication Frequency</h2>
        <p className="whitespace-pre-line text-sm text-[#667082] leading-relaxed">
          TJASF is published tri-annually with three issues per year (every 4 months), ensuring regular, consistent, and timely dissemination of cutting-edge scientific research.
        </p>
        <h2 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mt-10 mb-3">Open Access</h2>
        <p className="whitespace-pre-line text-sm text-[#667082] leading-relaxed">
          {content.about_open_access || 'TJASF is fully open access. All published articles are freely available to readers worldwide without subscription fees. Authors retain copyright of their work under a Creative Commons license.'}
        </p>
        <h2 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mt-10 mb-3">Publisher Imprint</h2>
        <p className="whitespace-pre-line text-sm text-[#667082] leading-relaxed">
          <strong>Publisher:</strong> TJASF Editorial Office<br />
          <strong>Contact:</strong> editor@tjasf.com | editorial@tjasf.com
        </p>
        <h2 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mt-10 mb-3">Indexing &amp; Impact</h2>
        <p className="whitespace-pre-line text-sm text-[#667082] leading-relaxed">
          {content.about_indexing || 'TJASF is committed to achieving broad indexing coverage. In the future, we are rigorously working to include ourselves in major databases.'}
        </p>
      </div>
    </div>
  );
}
