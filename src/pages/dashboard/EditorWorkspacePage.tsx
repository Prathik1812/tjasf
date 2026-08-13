import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/DashboardLayout';
import type { Manuscript, Domain, Profile } from '@/types';

export default function EditorWorkspacePage() {
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    (async () => {
      const { data: ms } = await supabase.from('manuscripts').select('*').order('created_at', { ascending: false });
      if (ms) setManuscripts(ms as Manuscript[]);
      const { data: doms } = await supabase.from('domains').select('*');
      if (doms) setDomains(doms as Domain[]);
      const { data: profs } = await supabase.from('profiles').select('*');
      if (profs) {
        const map: Record<string, Profile> = {};
        (profs as Profile[]).forEach((p) => {
          map[p.id] = p;
        });
        setProfiles(map);
      }
      setLoading(false);
    })();
  }, []);

  const domainName = (id: string | null) => domains.find((d) => d.id === id)?.name || 'Unassigned';
  const submitterName = (id: string) => profiles[id]?.full_name || 'Unknown';

  const filtered = filter === 'all' ? manuscripts : manuscripts.filter((m) => m.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342]">Editor Workspace</h1>
        <p className="text-[#667082] text-sm mt-1">Manage manuscripts through the review pipeline</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'submitted', 'technical_screening', 'desk_review', 'under_review', 'revision_requested', 'accepted', 'rejected', 'published'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filter === s ? 'bg-[#eb5526] text-white' : 'bg-white border border-[#e6e5e0] text-[#667082] hover:bg-[#f1f0ec]'}`}>
            {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[#667082]">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-12 text-center">
          <BookOpen size={40} className="mx-auto text-[#d8d8d1] mb-4" />
          <p className="text-[#667082] text-lg">No manuscripts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <Link key={m.id} to={`/dashboard/editor/${m.id}`} className="block bg-white rounded-lg border border-[#e6e5e0] p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-[#102342] truncate">{m.title || 'Untitled'}</h3>
                    {m.fast_track && (
                      <span className="shrink-0 bg-[#eb5526] text-white text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                        Fast-Track
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-[#667082] mt-1">
                    <span>{domainName(m.domain_id)}</span>
                    <span>By {submitterName(m.submitter_id)}</span>
                    <span>{new Date(m.created_at).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
                <StatusBadge status={m.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
