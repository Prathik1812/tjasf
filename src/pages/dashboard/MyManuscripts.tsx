import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/DashboardLayout';
import type { Manuscript, Domain } from '@/types';

export default function MyManuscripts() {
  const { user, profile } = useAuth();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);

  const activeProfile = profile || (user ? {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    role: 'author' as any,
  } : null);

  useEffect(() => {
    (async () => {
      const targetUserId = activeProfile?.id;
      if (!targetUserId) return;
      const { data } = await supabase.from('manuscripts').select('*').eq('submitter_id', targetUserId).order('created_at', { ascending: false });
      if (data) setManuscripts(data as Manuscript[]);
      const { data: doms } = await supabase.from('domains').select('*');
      if (doms) setDomains(doms as Domain[]);
      setLoading(false);
    })();
  }, [activeProfile]);

  const domainName = (id: string | null) => domains.find((d) => d.id === id)?.name || 'Unassigned';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342]">My Manuscripts</h1>
          <p className="text-[#667082] text-sm mt-1">Track and manage your submissions</p>
        </div>
        <Link to="/dashboard/submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c]">
          <Plus size={16} /> New Submission
        </Link>
      </div>

      {loading ? (
        <p className="text-[#667082]">Loading...</p>
      ) : manuscripts.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-12 text-center">
          <FileText size={40} className="mx-auto text-[#d8d8d1] mb-4" />
          <p className="text-[#667082] text-lg mb-2">No manuscripts yet</p>
          <p className="text-[#667082] text-sm mb-6">Start your first submission to see it here.</p>
          <Link to="/dashboard/submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c]">
            <Plus size={16} /> Submit a Manuscript
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {manuscripts.map((m) => (
            <div key={m.id} className="bg-white rounded-lg border border-[#e6e5e0] p-5 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-[#102342] truncate">{m.title || 'Untitled manuscript'}</h3>
                <div className="flex gap-4 text-xs text-[#667082] mt-1">
                  <span>{domainName(m.domain_id)}</span>
                  <span>v{m.version}</span>
                  <span>{new Date(m.created_at).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
              <StatusBadge status={m.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
