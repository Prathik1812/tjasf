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
            <div key={m.id} className="bg-white rounded-lg border border-[#e6e5e0] p-6 hover:shadow-md transition-shadow">
              <p className="text-xs font-bold text-[#eb5526] uppercase tracking-wider mb-1">{m.role_title}</p>
              <h3 className="font-['Playfair_Display'] font-semibold text-[#102342] text-xl mb-2">{m.name}</h3>
              {m.affiliation && <p className="text-[#667082] text-sm">{m.affiliation}</p>}
              {m.domain && <p className="text-[#667082] text-xs mt-1 italic">{m.domain}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
