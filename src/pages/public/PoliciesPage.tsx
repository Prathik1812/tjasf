import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Policy } from '@/types';

export default function PoliciesPage() {
  const { slug } = useParams();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [activePolicy, setActivePolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('policies')
        .select('*')
        .order('category', { ascending: true });
      if (data) {
        setPolicies(data as Policy[]);
        const activeSlug = slug || (data as Policy[])[0]?.slug;
        if (activeSlug) {
          const found = (data as Policy[]).find((p) => p.slug === activeSlug);
          if (found) setActivePolicy(found);
        }
      }
      setLoading(false);
    })();
  }, [slug]);

  const categories = Array.from(new Set(policies.map((p) => p.category))).sort();

  return (
    <div className="max-w-[1160px] mx-auto px-8 py-20">
      <div className="text-[#eb5526] uppercase tracking-[0.14em] text-[10px] font-bold mb-4">Policies</div>
      <h1 className="font-['Playfair_Display'] font-medium text-[clamp(36px,5vw,56px)] leading-[1.08] text-[#102342] mb-4">
        Publication policies &amp; ethics.
      </h1>
      <p className="text-[#667082] text-lg max-w-[700px] mb-12">
        TJASF is committed to the highest standards of publication ethics. Our policies ensure transparency, integrity, and fairness throughout the editorial process.
      </p>

      {loading ? (
        <p className="text-[#667082]">Loading...</p>
      ) : policies.length === 0 ? (
        <div className="bg-[#f1f0ec] rounded-lg p-12 text-center">
          <p className="text-[#667082] text-lg">Policies will be published here soon.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">
          <aside className="md:sticky md:top-28 self-start">
            {categories.map((cat) => (
              <div key={cat} className="mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#102342] mb-2">{cat}</h3>
                <div className="flex flex-col gap-1">
                  {policies.filter((p) => p.category === cat).map((p) => (
                    <Link
                      key={p.id}
                      to={`/policies/${p.slug}`}
                      className={`text-sm py-1.5 px-3 rounded transition-colors ${
                        activePolicy?.id === p.id ? 'bg-[#eb5526] text-white font-semibold' : 'text-[#667082] hover:bg-[#f1f0ec]'
                      }`}
                    >
                      {p.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <div className="mt-8 bg-white border border-[#e6e5e0] rounded-lg p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#102342] mb-2">Author Template</h4>
              <p className="text-xs text-[#667082] mb-4">Please download and use our official Word template to format your manuscript before submission.</p>
              <a
                href="/assets/templates/TJASF_Paper_Template.docx"
                download
                className="inline-flex w-full justify-center items-center gap-1.5 px-4 py-2.5 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c] transition-colors text-center font-semibold"
              >
                Download Template (.docx)
              </a>
            </div>
          </aside>
          <div className="min-w-0">
            {activePolicy ? (
              <div className="bg-white rounded-lg border border-[#e6e5e0] p-8">
                <h2 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342] mb-2">{activePolicy.title}</h2>
                <p className="text-xs text-[#667082] mb-6">
                  Last updated: {new Date(activePolicy.last_updated).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <div className="prose prose-lg max-w-none text-[#27334a] leading-[1.7] whitespace-pre-wrap">
                  {activePolicy.content}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-[#e6e5e0] p-8">
                <h2 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mb-4">Select a policy to read</h2>
                <p className="text-[#667082]">Browse our policies using the menu on the left. Click any policy title to read the full text.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
