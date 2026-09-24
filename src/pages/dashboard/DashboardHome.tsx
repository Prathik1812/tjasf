import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ClipboardList, BookOpen, FileEdit, Users, Megaphone, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { StatCard, StatusBadge } from '@/components/DashboardLayout';
import { getManuscriptDisplayCode } from '@/data/disciplines';
import type { Manuscript, Review, UserRole } from '@/types';

export default function DashboardHome() {
  const { user, profile, loading } = useAuth();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [editorManuscripts, setEditorManuscripts] = useState<Manuscript[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const activeProfile = profile;

  useEffect(() => {
    (async () => {
      const targetUserId = activeProfile?.id;
      if (!targetUserId) return;
      const { data: ms } = await supabase.from('manuscripts').select('*').eq('submitter_id', targetUserId).order('created_at', { ascending: false });
      if (ms) setManuscripts(ms as Manuscript[]);
      const { data: rv } = await supabase.from('reviews').select('*').eq('reviewer_id', targetUserId).order('created_at', { ascending: false });
      if (rv) setReviews(rv as Review[]);
      if (activeProfile && ['section_editor', 'editor_in_chief', 'admin', 'associate_editor', 'editorial_board_member'].includes(activeProfile.role)) {
        const { data: em } = await supabase.from('manuscripts').select('*').order('created_at', { ascending: false }).limit(10);
        if (em) setEditorManuscripts(em as Manuscript[]);
      }
    })();
  }, [activeProfile?.id, activeProfile?.role]);

  if (loading || !user || !activeProfile) return (
    <div className="flex items-center justify-center h-64 text-[#667082] text-sm">Loading your dashboard...</div>
  );

  const roleLabel: Record<UserRole, string> = {
    author: 'Author',
    reviewer: 'Reviewer',
    section_editor: 'Section Editor',
    editor_in_chief: 'Editor in Chief',
    admin: 'Administrator',
    associate_editor: 'Associate Editor',
    editorial_board_member: 'Editorial Board Member',
  };

  const isProfileIncomplete = !profile?.affiliation || 
    (['reviewer', 'section_editor', 'editor_in_chief', 'associate_editor', 'editorial_board_member'].includes(activeProfile.role) && 
     (!profile?.keywords || profile.keywords.length === 0));

  const allDashboardManuscripts = [
    ...manuscripts,
    ...editorManuscripts.filter((em) => !manuscripts.some((m) => m.id === em.id)),
  ];

  const searchResults = searchQuery.trim()
    ? allDashboardManuscripts.filter((m) => {
        const q = searchQuery.toLowerCase().trim();
        const displayCode = getManuscriptDisplayCode(m).toLowerCase();
        const titleMatch = (m.title || '').toLowerCase().includes(q);
        const codeMatch = displayCode.includes(q) || (m.tracking_code || '').toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
        const statusMatch = (m.status || '').toLowerCase().includes(q);
        const subjectMatch = (m.subject_code || '').toLowerCase().includes(q) || (m.subject_name || '').toLowerCase().includes(q);
        return titleMatch || codeMatch || statusMatch || subjectMatch;
      })
    : [];

  return (
    <div className="space-y-6">
      {isProfileIncomplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-amber-800 text-sm shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <span className="text-lg mt-0.5">⚠️</span>
          <div className="flex-1">
            <h3 className="font-semibold text-amber-900">Please Complete Your Profile</h3>
            <p className="text-xs text-amber-800 mt-1">
              Your profile is missing crucial details.
              {['reviewer', 'section_editor', 'editor_in_chief', 'associate_editor', 'editorial_board_member'].includes(activeProfile.role) ? (
                <span> To enable matching algorithms, please add your <strong>affiliation</strong> and <strong>expertise keywords</strong>.</span>
              ) : (
                <span> Please add your <strong>affiliation</strong> and <strong>ORCID iD</strong>.</span>
              )}
            </p>
            <div className="mt-2">
              <Link to="/dashboard/profile" className="text-xs font-bold text-amber-900 underline hover:text-orange-700 transition-colors">
                Go to Profile Settings &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342]">Welcome, {activeProfile.full_name.split(' ')[0]}</h1>
          <p className="text-[#667082] text-sm mt-1">You are signed in as {roleLabel[activeProfile.role]}</p>
        </div>
      </div>

      {/* Dashboard Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7e8da4]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search manuscripts by tracking code (e.g. 2026-CSE-...), title, or subject..."
          className="w-full pl-10 pr-16 py-2.5 bg-white border border-[#d8d8d1] rounded-lg text-sm text-[#27334a] placeholder-[#7e8da4] focus:outline-none focus:border-[#eb5526] shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#7e8da4] hover:text-[#102342] bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
          >
            Clear
          </button>
        )}
      </div>

      {/* Live Search Results Container if query present */}
      {searchQuery.trim() && (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#102342] uppercase tracking-wider">
              Search Results ({searchResults.length})
            </h2>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-[#667082] hover:text-[#102342]"
            >
              Close
            </button>
          </div>
          {searchResults.length === 0 ? (
            <p className="text-sm text-[#667082]">No manuscripts found matching "{searchQuery}".</p>
          ) : (
            <div className="space-y-3">
              {searchResults.map((m) => (
                <div key={m.id} className="flex items-center justify-between border-b border-[#f1f0ec] pb-3 last:border-0 gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs bg-orange-50 text-[#eb5526] px-2.5 py-0.5 rounded font-bold border border-orange-200">
                        {getManuscriptDisplayCode(m)}
                      </span>
                      {m.subject_name && (
                        <span className="text-[11px] text-[#667082] font-medium hidden sm:inline">
                          • {m.subject_name}
                        </span>
                      )}
                      {m.fast_track && (
                        <span className="bg-[#eb5526] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                          Fast-Track
                        </span>
                      )}
                    </div>
                    <Link
                      to={
                        ['section_editor', 'editor_in_chief', 'admin', 'associate_editor', 'editorial_board_member'].includes(activeProfile.role)
                          ? `/dashboard/editor/${m.id}`
                          : `/dashboard/manuscripts`
                      }
                      className="text-sm font-semibold text-[#102342] hover:text-[#eb5526] truncate block"
                    >
                      {m.title || 'Untitled manuscript'}
                    </Link>
                    <p className="text-xs text-[#667082] mt-0.5">Submitted: {new Date(m.created_at).toLocaleDateString('en-GB')}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Manuscripts" value={manuscripts.length} icon={FileText} />
        {(activeProfile.role === 'reviewer' || activeProfile.role === 'admin') && (
          <StatCard label="Reviews" value={reviews.length} icon={ClipboardList} />
        )}
        {['section_editor', 'editor_in_chief', 'admin', 'associate_editor', 'editorial_board_member'].includes(activeProfile.role) && (
          <StatCard label="In Editorial" value={editorManuscripts.length} icon={BookOpen} />
        )}
        {activeProfile.role === 'author' && (
          <StatCard label="Submitted" value={manuscripts.filter((m) => m.status !== 'draft').length} icon={FileEdit} />
        )}
      </div>

      {activeProfile.role === 'author' && (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#102342]">Recent Manuscripts</h2>
            <Link to="/dashboard/manuscripts" className="text-xs font-bold text-[#eb5526] hover:underline">View all</Link>
          </div>
          {manuscripts.length === 0 ? (
            <p className="text-sm text-[#667082]">No manuscripts yet. <Link to="/dashboard/submit" className="text-[#eb5526] font-semibold">Submit your first paper</Link></p>
          ) : (
            <div className="space-y-3">
              {manuscripts.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between border-b border-[#f1f0ec] pb-3 last:border-0 gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs bg-orange-50 text-[#eb5526] px-2 py-0.5 rounded font-bold border border-orange-200">
                        {getManuscriptDisplayCode(m)}
                      </span>
                      {m.fast_track && (
                        <span className="bg-[#eb5526] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                          Fast-Track
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#102342] truncate">{m.title || 'Untitled manuscript'}</p>
                    <p className="text-xs text-[#667082] mt-0.5">{new Date(m.created_at).toLocaleDateString('en-GB')}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeProfile.role === 'reviewer' && (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#102342]">Review Assignments</h2>
            <Link to="/dashboard/reviews" className="text-xs font-bold text-[#eb5526] hover:underline">View all</Link>
          </div>
          {reviews.length === 0 ? (
            <p className="text-sm text-[#667082]">No review assignments yet.</p>
          ) : (
            <div className="space-y-3">
              {reviews.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between border-b border-[#f1f0ec] pb-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#102342]">Review #{r.id.slice(0, 8)}</p>
                    <p className="text-xs text-[#667082]">Invited: {new Date(r.invited_at).toLocaleDateString('en-GB')}</p>
                  </div>
                  <Link to={`/dashboard/reviews/${r.id}`} className="text-xs font-bold text-[#eb5526] hover:underline">Start Review</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {['section_editor', 'editor_in_chief', 'admin', 'associate_editor', 'editorial_board_member'].includes(activeProfile.role) && (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#102342]">Recent Submissions (Editorial)</h2>
            <Link to="/dashboard/editor" className="text-xs font-bold text-[#eb5526] hover:underline">Go to Editor Workspace</Link>
          </div>
          {editorManuscripts.length === 0 ? (
            <p className="text-sm text-[#667082]">No submissions in active review.</p>
          ) : (
            <div className="space-y-3">
              {editorManuscripts.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between border-b border-[#f1f0ec] pb-3 last:border-0 gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs bg-orange-50 text-[#eb5526] px-2 py-0.5 rounded font-bold border border-orange-200">
                        {getManuscriptDisplayCode(m)}
                      </span>
                      {m.fast_track && (
                        <span className="bg-[#eb5526] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                          Fast-Track
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-[#102342] truncate">{m.title || 'Untitled manuscript'}</p>
                    <p className="text-xs text-[#667082] mt-0.5">{new Date(m.created_at).toLocaleDateString('en-GB')}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeProfile.role === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/dashboard/admin/users" className="bg-white rounded-lg border border-[#e6e5e0] p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-11 h-11 bg-[#f1f0ec] rounded-lg flex items-center justify-center text-[#eb5526]"><Users size={22} /></div>
            <div><p className="font-semibold text-[#102342]">Manage Users</p><p className="text-xs text-[#667082]">Roles and profiles</p></div>
          </Link>
          <Link to="/dashboard/admin/announcements" className="bg-white rounded-lg border border-[#e6e5e0] p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-11 h-11 bg-[#f1f0ec] rounded-lg flex items-center justify-center text-[#eb5526]"><Megaphone size={22} /></div>
            <div><p className="font-semibold text-[#102342]">Announcements</p><p className="text-xs text-[#667082]">Post updates</p></div>
          </Link>
        </div>
      )}
    </div>
  );
}
