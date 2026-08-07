import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Volume, Issue } from '@/types';

export default function ArchivesPage() {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: vols } = await supabase.from('volumes').select('*').order('year', { ascending: false });
      if (vols) setVolumes(vols as Volume[]);
      const { data: iss } = await supabase.from('issues').select('*').order('publication_date', { ascending: false });
      if (iss) setIssues(iss as Issue[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-[1160px] mx-auto px-8 py-20">
      <div className="text-[#eb5526] uppercase tracking-[0.14em] text-[10px] font-bold mb-4">Archives</div>
      <h1 className="font-['Playfair_Display'] font-medium text-[clamp(36px,5vw,56px)] leading-[1.08] text-[#102342] mb-4">
        Issues &amp; Archives.
      </h1>
      <p className="text-[#667082] text-lg max-w-[700px] mb-12">
        Browse all published volumes and issues of TJASF. Click any issue to view its table of contents.
      </p>

      {loading ? (
        <p className="text-[#667082]">Loading...</p>
      ) : volumes.length === 0 ? (
        <div className="bg-[#f1f0ec] rounded-lg p-12 text-center">
          <p className="text-[#667082] text-lg">No volumes published yet.</p>
          <p className="text-[#667082] text-sm mt-2">Archives will appear here once the first issue is published.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {volumes.map((vol) => {
            const volIssues = issues.filter((i) => i.volume_id === vol.id && i.is_published);
            return (
              <div key={vol.id}>
                <h2 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mb-4">
                  Volume {vol.number} ({vol.year})
                </h2>
                {volIssues.length === 0 ? (
                  <p className="text-sm text-[#667082]">No published issues in this volume yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {volIssues.map((iss) => (
                      <Link key={iss.id} to={`/issue/${iss.id}`} className="bg-white rounded-lg border border-[#e6e5e0] p-5 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-xs text-[#eb5526] font-bold uppercase tracking-wide">Issue {iss.number}</p>
                            <h3 className="font-semibold text-[#102342] mt-1">{iss.title || `Volume ${vol.number}, Issue ${iss.number}`}</h3>
                          </div>
                          {iss.cover_url && <img src={iss.cover_url} alt="" className="w-12 h-16 object-cover rounded" />}
                        </div>
                        <p className="text-xs text-[#667082]">
                          {iss.publication_date ? new Date(iss.publication_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Forthcoming'}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
