import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ClipboardList, BookOpen, FileEdit, Users, Megaphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { StatCard, StatusBadge } from '@/components/DashboardLayout';
import type { Manuscript, Review, UserRole } from '@/types';

export default function DashboardHome() {
  const { profile } = useAuth();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [editorManuscripts, setEditorManuscripts] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!profile) return;
      const { data: ms } = await supabase.from('manuscripts').select('*').eq('submitter_id', profile.id).order('created_at', { ascending: false });
      if (ms) setManuscripts(ms as Manuscript[]);
      const { data: rv } = await supabase.from('reviews').select('*').eq('reviewer_id', profile.id).order('created_at', { ascending: false });
      if (rv) setReviews(rv as Review[]);
      if (['section_editor', 'managing_editor', 'editor_in_chief', 'admin'].includes(profile.role)) {
        const { data: em } = await supabase.from('manuscripts').select('*').order('created_at', { ascending: false }).limit(10);
        if (em) setEditorManuscripts(em as Manuscript[]);
      }
      setLoading(false);
    })();
  }, [profile]);

  if (!profile) return null;

  const roleLabel: Record<UserRole, string> = {
    author: 'Author',
    reviewer: 'Reviewer',
    section_editor: 'Section Editor',
    managing_editor: 'Managing Editor',
    editor_in_chief: 'Editor in Chief',
    admin: 'Administrator',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342]">Welcome, {profile.full_name.split(' ')[0]}</h1>
        <p className="text-[#667082] text-sm mt-1">You are signed in as {roleLabel[profile.role]}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Manuscripts" value={manuscripts.length} icon={FileText} />
        {(profile.role === 'reviewer' || profile.role === 'admin') && (
          <StatCard label="Reviews" value={reviews.length} icon={ClipboardList} />
        )}
        {['section_editor', 'managing_editor', 'editor_in_chief', 'admin'].includes(profile.role) && (
          <StatCard label="In Editorial" value={editorManuscripts.length} icon={BookOpen} />
        )}
        {profile.role === 'author' && (
          <StatCard label="Submitted" value={manuscripts.filter((m) => m.status !== 'draft').length} icon={FileEdit} />
        )}
      </div>

      {profile.role === 'author' && (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#102342]">Recent Manuscripts</h2>
            <Link to="/dashboard/manuscripts" className="text-xs font-bold text-[#eb5526] hover:underline">View all</Link>
          </div>
          {manuscripts.length === 0 ? (
            <p className="text-sm text-[#667082]">No manuscripts yet. <Link to="/submit" className="text-[#eb5526] font-semibold">Submit your first paper</Link></p>
          ) : (
            <div className="space-y-3">
              {manuscripts.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between border-b border-[#f1f0ec] pb-3 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#102342] truncate">{m.title || 'Untitled manuscript'}</p>
                    <p className="text-xs text-[#667082]">{new Date(m.created_at).toLocaleDateString('en-GB')}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {profile.role === 'reviewer' && (
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
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {['section_editor', 'managing_editor', 'editor_in_chief', 'admin'].includes(profile.role) && (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#102342]">Manuscripts in Pipeline</h2>
            <Link to="/dashboard/editor" className="text-xs font-bold text-[#eb5526] hover:underline">View all</Link>
          </div>
          {loading ? (
            <p className="text-sm text-[#667082]">Loading...</p>
          ) : editorManuscripts.length === 0 ? (
            <p className="text-sm text-[#667082]">No manuscripts in the pipeline.</p>
          ) : (
            <div className="space-y-3">
              {editorManuscripts.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between border-b border-[#f1f0ec] pb-3 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#102342] truncate">{m.title || 'Untitled'}</p>
                    <p className="text-xs text-[#667082]">{new Date(m.created_at).toLocaleDateString('en-GB')}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {profile.role === 'admin' && (
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
