import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { sendEditorResponseEmail } from '@/lib/email';
import { getManuscriptDisplayCode } from '@/data/disciplines';
import type { Manuscript, Domain, Profile } from '@/types';

export default function EditorWorkspacePage() {
  const { profile: currentUser } = useAuth();
  const toast = useToast();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [userAssignments, setUserAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    (async () => {
      let allMs: Manuscript[] = [];
      const { data: ms } = await supabase.from('manuscripts').select('*').order('created_at', { ascending: false });
      if (ms) allMs = [...(ms as Manuscript[])];
      
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

      if (currentUser) {
        // Fetch ALL editor assignments for this editor (both pending and accepted)
        const { data: eas } = await supabase
          .from('editor_assignments')
          .select('*, manuscripts(*)')
          .eq('editor_id', currentUser.id);

        if (eas && eas.length > 0) {
          // If joined manuscripts(*) is null due to RLS, fetch manuscript directly by ID
          const enriched = await Promise.all(
            eas.map(async (ea: any) => {
              if (ea.manuscripts) return ea;
              if (ea.manuscript_id) {
                const { data: fallbackMs } = await supabase
                  .from('manuscripts')
                  .select('*')
                  .eq('id', ea.manuscript_id)
                  .maybeSingle();
                return { ...ea, manuscripts: fallbackMs };
              }
              return ea;
            })
          );

          setUserAssignments(enriched);

          // Set pending invitations for the action card
          const pending = enriched.filter((ea) => ea.status === 'pending');
          setPendingInvitations(pending);

          // Ensure any assigned manuscripts not returned by the general select are added
          enriched.forEach((ea) => {
            if (ea.manuscripts && !allMs.some((m) => m.id === ea.manuscripts.id)) {
              allMs.push(ea.manuscripts);
            }
          });
        }
      }

      setManuscripts(allMs);
      setLoading(false);
    })();
  }, [currentUser]);

  const domainName = (id: string | null) => domains.find((d) => d.id === id)?.name || 'Unassigned';
  const submitterName = (id: string) => profiles[id]?.full_name || 'Unknown';

  const handleAcceptInvitation = async (invitationId: string, manuscriptId: string) => {
    setLoading(true);
    try {
      // 1. Update assignment status to 'accepted'
      const { error: err1 } = await supabase
        .from('editor_assignments')
        .update({ status: 'accepted' })
        .eq('id', invitationId);
      if (err1) console.warn('Could not update assignment status:', err1.message);

      // 2. Set manuscript's editor_id to current user
      const { error: err2 } = await supabase
        .from('manuscripts')
        .update({ editor_id: currentUser?.id })
        .eq('id', manuscriptId);
      if (err2) console.warn('Could not set manuscript editor_id:', err2.message);

      // 3. Delete other pending invitations for this manuscript
      await supabase
        .from('editor_assignments')
        .delete()
        .eq('manuscript_id', manuscriptId)
        .neq('id', invitationId);

      const ms = manuscripts.find((m) => m.id === manuscriptId);
      const title = ms ? ms.title : 'Manuscript';
      if (currentUser) {
        try {
          await sendEditorResponseEmail(
            currentUser.full_name,
            title,
            ms?.tracking_code || manuscriptId.substring(0, 8).toUpperCase(),
            'accepted'
          );
        } catch (mailErr) {
          console.error('Failed to send editor accept email:', mailErr);
        }
      }

      toast.success('Assignment accepted! You are now the handling editor for this manuscript.');
      setPendingInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      setManuscripts((prev) =>
        prev.map((m) => (m.id === manuscriptId ? { ...m, editor_id: currentUser?.id || m.editor_id } : m))
      );
    } catch (err: any) {
      toast.error(err.message || 'Error accepting invitation');
    }
    setLoading(false);
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    setLoading(true);
    try {
      const { data: ea, error } = await supabase
        .from('editor_assignments')
        .update({ status: 'declined' })
        .eq('id', invitationId)
        .select('*, manuscripts(title)')
        .single();
      if (error) throw error;

      if (ea && currentUser) {
        const msTitle = (ea as any).manuscripts?.title || 'Manuscript';
        try {
          await sendEditorResponseEmail(
            currentUser.full_name,
            msTitle,
            ea.manuscript_id.substring(0, 8).toUpperCase(),
            'declined'
          );
        } catch (mailErr) {
          console.error('Failed to send editor decline email:', mailErr);
        }
      }

      alert('Invitation declined.');
      window.location.reload();
    } catch (err: any) {
      alert(err.message || 'Error declining invitation');
    }
    setLoading(false);
  };

  // Filter manuscripts
  const filtered = filter === 'all' ? manuscripts : manuscripts.filter((m) => m.status === filter);
  
  // EIC/Admin can view all papers; Section Editors / Associate Editors see papers assigned to them
  const isEicOrAdmin = currentUser && ['editor_in_chief', 'admin'].includes(currentUser.role);
  const userAssignedManuscriptIds = new Set(
    userAssignments.map((ea: any) => ea.manuscript_id)
  );

  const visibleManuscripts = isEicOrAdmin
    ? filtered
    : filtered.filter(
        (m) => m.editor_id === currentUser?.id || userAssignedManuscriptIds.has(m.id)
      );

  const searchFiltered = visibleManuscripts.filter((m) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    const displayCode = getManuscriptDisplayCode(m).toLowerCase();
    const titleMatch = (m.title || '').toLowerCase().includes(q);
    const codeMatch = displayCode.includes(q) || (m.tracking_code || '').toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
    const authorMatch = submitterName(m.submitter_id).toLowerCase().includes(q);
    const domainMatch = domainName(m.domain_id).toLowerCase().includes(q);
    const subjectMatch = (m.subject_code || '').toLowerCase().includes(q) || (m.subject_name || '').toLowerCase().includes(q);
    return titleMatch || codeMatch || authorMatch || domainMatch || subjectMatch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342]">Editor Workspace</h1>
        <p className="text-[#667082] text-sm mt-1">Manage manuscripts through the review pipeline</p>
      </div>

      {/* Editor Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7e8da4]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search manuscripts by tracking code (e.g. 2026-CSE-...), title, author, or discipline..."
          className="w-full pl-10 pr-16 py-2.5 bg-white border border-[#d8d8d1] rounded-lg text-sm text-[#27334a] placeholder-[#7e8da4] focus:outline-none focus:border-[#eb5526] shadow-sm"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#7e8da4] hover:text-[#102342] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
          >
            Clear
          </button>
        )}
      </div>

      {/* Pending Editorial Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="bg-amber-50/20 border border-amber-200 rounded-lg p-5 space-y-3">
          <h2 className="font-semibold text-[#102342] text-sm flex items-center gap-2">
            ✉ Pending Editorial Invitations ({pendingInvitations.length})
          </h2>
          <p className="text-xs text-[#667082]">You have been invited to handle the peer review process for these papers. You can accept or decline assignments.</p>
          <div className="space-y-3 mt-2">
            {pendingInvitations.map((inv) => {
              const ms = inv.manuscripts;
              if (!ms) return null;
              return (
                <div key={inv.id} className="bg-white rounded-lg border border-[#e6e5e0] p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-xs text-[#102342] flex items-center gap-2">
                      {ms.title}
                      {ms.fast_track && (
                        <span className="bg-[#eb5526] text-white text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
                          Fast-Track
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-[#667082] mt-1">
                      Submitted on {new Date(ms.created_at).toLocaleDateString('en-GB')} | Subject: {domainName(ms.domain_id)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAcceptInvitation(inv.id, ms.id)}
                      className="px-3.5 py-1.5 bg-[#eb5526] hover:bg-[#d7461c] text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Accept Assignment
                    </button>
                    <button
                      onClick={() => handleDeclineInvitation(inv.id)}
                      className="px-3.5 py-1.5 border border-[#d8d8d1] text-[#27334a] hover:bg-gray-50 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {['all', 'submitted', 'technical_screening', 'desk_review', 'under_review', 'revision_requested', 'accepted', 'rejected', 'published'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${filter === s ? 'bg-[#eb5526] text-white' : 'bg-white border border-[#e6e5e0] text-[#667082] hover:bg-[#f1f0ec]'}`}>
            {s === 'all' ? 'All' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[#667082]">Loading...</p>
      ) : searchFiltered.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-12 text-center">
          <BookOpen size={40} className="mx-auto text-[#d8d8d1] mb-4" />
          <p className="text-[#667082] text-lg">No manuscripts found {searchTerm ? `matching "${searchTerm}"` : ''}</p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-bold rounded text-[#102342]"
            >
              Clear Filter
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {searchFiltered.map((m) => (
            <Link key={m.id} to={`/dashboard/editor/${m.id}`} className="block bg-white rounded-lg border border-[#e6e5e0] p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono text-xs bg-orange-50 text-[#eb5526] px-2.5 py-0.5 rounded font-bold border border-orange-200">
                      {getManuscriptDisplayCode(m)}
                    </span>
                    {m.subject_name && (
                      <span className="text-[11px] text-[#667082] font-medium hidden sm:inline">
                        • {m.subject_name}
                      </span>
                    )}
                    {m.fast_track && (
                      <span className="shrink-0 bg-[#eb5526] text-white text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide uppercase">
                        Fast-Track
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-[#102342] truncate text-base">{m.title || 'Untitled'}</h3>
                  <div className="flex gap-4 text-xs text-[#667082] mt-1.5 flex-wrap">
                    <span>{domainName(m.domain_id)}</span>
                    <span>By <strong className="text-[#102342]">{submitterName(m.submitter_id)}</strong></span>
                    <span>Submitted: {new Date(m.created_at).toLocaleDateString('en-GB')}</span>
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
