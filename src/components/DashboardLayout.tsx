import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import { Menu, X, LayoutDashboard, FileText, Users, BookOpen, Settings, LogOut, ClipboardList, Megaphone, FileEdit, Archive, Mail, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';

export default function DashboardLayout() {
  const { user, profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const activeProfile = profile || (user ? {
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    role: 'author' as UserRole,
  } : null);

  const roleLabel: Record<UserRole, string> = {
    author: 'Author',
    reviewer: 'Reviewer',
    section_editor: 'Section Editor',
    editor_in_chief: 'Editor in Chief',
    admin: 'Administrator',
    associate_editor: 'Associate Editor',
    editorial_board_member: 'Editorial Board Member',
  };

  const navItems = getNavItems(activeProfile?.role);

  return (
    <div className="min-h-screen bg-[#f5f4f0] flex">
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:sticky top-0 left-0 z-40 w-64 h-screen bg-[#102342] text-white flex flex-col transition-transform duration-200`}>
        <div className="p-5 border-b border-[#1d3556]">
          <Link to="/" className="block" onClick={() => setSidebarOpen(false)}>
            <img src="/assets/images/TJASF_logo_light.svg" alt="TJASF" className="w-[140px] brightness-0 invert opacity-90" />
          </Link>
        </div>
        <div className="px-5 py-4 border-b border-[#1d3556]">
          <p className="text-[10px] uppercase tracking-wider text-[#7e8da4]">Signed in as</p>
          <p className="text-sm font-semibold mt-1">{activeProfile?.full_name || 'User'}</p>
          <p className="text-xs text-[#7e8da4] mt-0.5">{activeProfile ? roleLabel[activeProfile.role] : ''}</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-[#1d3556] text-white border-l-2 border-[#eb5526]' : 'text-[#a4b0c4] hover:text-white hover:bg-[#1d3556]/50'
                }`
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-[#1d3556]">
          <button onClick={handleSignOut} className="flex items-center gap-2 text-sm text-[#a4b0c4] hover:text-white transition-colors w-full text-left">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden bg-white border-b border-[#e6e5e0] flex items-center justify-between px-4 h-14 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-[#102342]">
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <span className="text-sm font-semibold text-[#102342]">Dashboard</span>
          <Link to="/" className="text-xs text-[#eb5526] font-semibold">Home</Link>
        </header>
        <div className="flex-1 p-6 md:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
}

function getNavItems(role?: UserRole): NavItem[] {
  const items: NavItem[] = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  ];

  if (role) {
    items.push(
      { to: '/dashboard/manuscripts', label: 'My Manuscripts', icon: FileText },
      { to: '/dashboard/profile', label: 'My Profile', icon: User }
    );
  }

  if (role === 'author') {
    items.push({ to: '/dashboard/submit', label: 'Submit New', icon: FileEdit });
  }

  if (role === 'reviewer') {
    items.push({ to: '/dashboard/reviews', label: 'My Reviews', icon: ClipboardList });
  }

  if (
    role === 'section_editor' ||
    role === 'editor_in_chief' ||
    role === 'associate_editor' ||
    role === 'editorial_board_member' ||
    role === 'admin'
  ) {
    items.push({ to: '/dashboard/editor', label: 'Editor Workspace', icon: BookOpen });
  }

  if (role === 'admin') {
    items.push(
      { to: '/dashboard/admin/users', label: 'Users', icon: Users },
      { to: '/dashboard/admin/domains', label: 'Domains', icon: Settings },
      { to: '/dashboard/admin/editorial-board', label: 'Editorial Board', icon: Users },
      { to: '/dashboard/admin/issues', label: 'Issues & Volumes', icon: Archive },
      { to: '/dashboard/admin/policies', label: 'Policies', icon: FileText },
      { to: '/dashboard/admin/announcements', label: 'Announcements', icon: Megaphone },
      { to: '/dashboard/admin/homepage', label: 'Homepage', icon: Settings },
      { to: '/dashboard/admin/emails', label: 'Email Templates', icon: Mail },
    );
  }

  return items;
}

export function DashboardCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-[#e6e5e0] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#102342]">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof LayoutDashboard }) {
  return (
    <div className="bg-white rounded-lg border border-[#e6e5e0] p-5 flex items-center gap-4">
      <div className="w-11 h-11 bg-[#f1f0ec] rounded-lg flex items-center justify-center text-[#eb5526]">
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-[#102342]">{value}</p>
        <p className="text-xs text-[#667082] uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-blue-100 text-blue-700',
    technical_screening: 'bg-yellow-100 text-yellow-700',
    desk_review: 'bg-purple-100 text-purple-700',
    under_review: 'bg-indigo-100 text-indigo-700',
    revision_requested: 'bg-orange-100 text-orange-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    published: 'bg-emerald-100 text-emerald-700',
    pending_invitation: 'bg-yellow-100 text-yellow-700',
    accepted_review: 'bg-blue-100 text-blue-700',
    declined: 'bg-red-100 text-red-700',
    in_progress: 'bg-indigo-100 text-indigo-700',
  };
  const label = status.replace(/_/g, ' ');
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  );
}
