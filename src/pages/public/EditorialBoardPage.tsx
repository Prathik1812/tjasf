import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { EditorialBoardMember } from '@/types';

export default function EditorialBoardPage() {
  const [members, setMembers] = useState<EditorialBoardMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('editorial_board')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (data) setMembers(data as EditorialBoardMember[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-[1160px] mx-auto px-8 py-20">
      <div className="text-[#eb5526] uppercase tracking-[0.14em] text-[10px] font-bold mb-4">Editorial Board</div>
      <h1 className="font-['Playfair_Display'] font-medium text-[clamp(36px,5vw,56px)] leading-[1.08] text-[#102342] mb-4">
        The people behind the journal.
      </h1>
      <p className="text-[#667082] text-lg max-w-[700px] mb-12">
        Our editorial board comprises distinguished researchers and academics from institutions around the world, committed to maintaining the highest standards of peer review and scientific integrity.
      </p>

      {loading ? (
        <p className="text-[#667082]">Loading...</p>
      ) : members.length === 0 ? (
        <div className="bg-[#f1f0ec] rounded-lg p-12 text-center">
          <p className="text-[#667082] text-lg">Editorial board members will be announced soon.</p>
          <p className="text-[#667082] text-sm mt-2">We are currently assembling our international editorial team.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((m) => (
            <div key={m.id} className="bg-white rounded-lg border border-[#e6e5e0] p-6 hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 rounded-full bg-[#f1f0ec] flex items-center justify-center text-[#eb5526] font-['Playfair_Display'] text-2xl font-medium mb-4 overflow-hidden">
                {m.photo_url ? <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover" /> : m.name.charAt(0)}
              </div>
              <h3 className="font-semibold text-[#102342] text-lg">{m.name}</h3>
              <p className="text-[#eb5526] text-sm font-semibold mt-1">{m.role_title}</p>
              {m.affiliation && <p className="text-[#667082] text-sm mt-1">{m.affiliation}</p>}
              {m.domain && <p className="text-[#667082] text-xs mt-1">{m.domain}</p>}
              {m.bio && <p className="text-[#667082] text-sm mt-3 line-clamp-3">{m.bio}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
