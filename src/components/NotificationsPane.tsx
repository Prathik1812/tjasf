import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  X,
  CheckCircle,
  FileText,
  UserPlus,
  Check,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getManuscriptDisplayCode } from '@/data/disciplines';
import type { Manuscript } from '@/types';

export interface AppNotification {
  id: string;
  type: 'assignment' | 'review' | 'submission' | 'decision' | 'system';
  title: string;
  message: string;
  link: string;
  createdAt: string;
  read: boolean;
  priority?: 'high' | 'normal';
  trackingCode?: string;
}

interface NotificationsPaneProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export default function NotificationsPane({
  isOpen,
  onClose,
  onUnreadCountChange
}: NotificationsPaneProps) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'assignments'>('all');

  const storageKey = profile ? `read_notifications_${profile.id}` : 'read_notifications_guest';

  const getReadIds = (): Set<string> => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  };

  const saveReadIds = (ids: Set<string>) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(ids)));
    } catch (e) {
      console.warn('Failed to save read notification IDs to localStorage', e);
    }
  };

  const loadNotifications = async () => {
    if (!profile) return;
    setLoading(true);

    const readIds = getReadIds();
    const items: AppNotification[] = [];

    try {
      const isEditor = [
        'section_editor',
        'editor_in_chief',
        'admin',
        'associate_editor',
        'editorial_board_member'
      ].includes(profile.role);

      // 1. Fetch pending & active editor assignments for this user
      if (isEditor) {
        const { data: assignments } = await supabase
          .from('editor_assignments')
          .select('*, manuscripts(*)')
          .eq('editor_id', profile.id)
          .order('created_at', { ascending: false });

        if (assignments && assignments.length > 0) {
          for (const ea of assignments) {
            let ms: Manuscript | null = ea.manuscripts;
            if (!ms && ea.manuscript_id) {
              const { data: fallbackMs } = await supabase
                .from('manuscripts')
                .select('*')
                .eq('id', ea.manuscript_id)
                .maybeSingle();
              if (fallbackMs) ms = fallbackMs as Manuscript;
            }

            const title = ms?.title || 'Manuscript';
            const code = ms ? getManuscriptDisplayCode(ms) : '';

            if (ea.status === 'pending') {
              items.push({
                id: `ea-pending-${ea.id}`,
                type: 'assignment',
                title: 'New Editorial Assignment',
                message: `You have been assigned to handle manuscript "${title}". Please review and accept or decline.`,
                link: `/dashboard/editor/${ea.manuscript_id}`,
                createdAt: ea.created_at || new Date().toISOString(),
                read: readIds.has(`ea-pending-${ea.id}`),
                priority: 'high',
                trackingCode: code
              });
            } else if (ea.status === 'accepted') {
              items.push({
                id: `ea-accepted-${ea.id}`,
                type: 'assignment',
                title: 'Active Editorial Assignment',
                message: `You are currently handling the peer review process for "${title}".`,
                link: `/dashboard/editor/${ea.manuscript_id}`,
                createdAt: ea.created_at || new Date().toISOString(),
                read: readIds.has(`ea-accepted-${ea.id}`),
                priority: 'normal',
                trackingCode: code
              });
            }
          }
        }

        // Direct assignments on manuscripts where editor_id == profile.id
        const { data: directlyAssigned } = await supabase
          .from('manuscripts')
          .select('*')
          .eq('editor_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(15);

        if (directlyAssigned) {
          directlyAssigned.forEach((m) => {
            const idKey = `ms-assigned-${m.id}`;
            // Avoid duplicate with editor_assignments
            if (!items.some((it) => it.link.includes(m.id))) {
              items.push({
                id: idKey,
                type: 'assignment',
                title: 'Editorial Assignment',
                message: `Assigned as handling editor for "${m.title}".`,
                link: `/dashboard/editor/${m.id}`,
                createdAt: m.created_at,
                read: readIds.has(idKey),
                priority: 'high',
                trackingCode: getManuscriptDisplayCode(m)
              });
            }
          });
        }

        // For EIC and Admin: notifications for newly submitted papers
        if (['editor_in_chief', 'admin'].includes(profile.role)) {
          const { data: recentSubmissions } = await supabase
            .from('manuscripts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

          if (recentSubmissions) {
            recentSubmissions.forEach((m) => {
              const idKey = `ms-submission-${m.id}`;
              items.push({
                id: idKey,
                type: 'submission',
                title: 'New Paper Submitted',
                message: `"${m.title}" is ready for desk screening and editor assignment.`,
                link: `/dashboard/editor/${m.id}`,
                createdAt: m.created_at,
                read: readIds.has(idKey),
                priority: m.fast_track ? 'high' : 'normal',
                trackingCode: getManuscriptDisplayCode(m)
              });
            });
          }
        }
      }

      // 2. Fetch Reviewer Invitations and Tasks
      if (profile.role === 'reviewer' || isEditor) {
        const { data: revs } = await supabase
          .from('reviews')
          .select('*, manuscripts(title, tracking_code)')
          .eq('reviewer_id', profile.id)
          .order('created_at', { ascending: false });

        if (revs) {
          (revs as any[]).forEach((r) => {
            const mTitle = r.manuscripts?.title || 'Assigned Manuscript';
            const mCode = r.manuscripts?.tracking_code || '';
            const idKey = `rev-${r.id}`;

            if (r.status === 'pending_invitation') {
              items.push({
                id: idKey,
                type: 'review',
                title: 'Review Invitation Received',
                message: `You are invited to review "${mTitle}". Please submit your evaluation.`,
                link: `/dashboard/reviews/${r.id}`,
                createdAt: r.invited_at || r.created_at,
                read: readIds.has(idKey),
                priority: 'high',
                trackingCode: mCode
              });
            }
          });
        }
      }

      // 3. Fetch Author Status Updates
      if (profile.role === 'author') {
        const { data: myManuscripts } = await supabase
          .from('manuscripts')
          .select('*')
          .eq('submitter_id', profile.id)
          .order('updated_at', { ascending: false });

        if (myManuscripts) {
          myManuscripts.forEach((m) => {
            const code = getManuscriptDisplayCode(m);
            const idKey = `author-${m.id}-${m.status}-${m.version}`;

            if (m.status === 'revision_requested') {
              items.push({
                id: idKey,
                type: 'decision',
                title: 'Revision Requested by Editor',
                message: `Revisions requested for "${m.title}". Please upload your revised manuscript.`,
                link: `/dashboard/manuscripts`,
                createdAt: m.updated_at || m.created_at,
                read: readIds.has(idKey),
                priority: 'high',
                trackingCode: code
              });
            } else if (m.status === 'accepted') {
              items.push({
                id: idKey,
                type: 'decision',
                title: 'Manuscript Accepted!',
                message: `Congratulations! "${m.title}" has been accepted for publication.`,
                link: `/dashboard/manuscripts`,
                createdAt: m.updated_at || m.created_at,
                read: readIds.has(idKey),
                priority: 'normal',
                trackingCode: code
              });
            } else if (m.status === 'under_review') {
              items.push({
                id: idKey,
                type: 'decision',
                title: 'Manuscript Under Peer Review',
                message: `"${m.title}" is actively undergoing double-blind peer review.`,
                link: `/dashboard/manuscripts`,
                createdAt: m.updated_at || m.created_at,
                read: readIds.has(idKey),
                priority: 'normal',
                trackingCode: code
              });
            }
          });
        }
      }

      // Sort notifications by date descending
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(items);

      const unreadCount = items.filter((n) => !n.read).length;
      if (onUnreadCountChange) {
        onUnreadCountChange(unreadCount);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen || profile) {
      loadNotifications();
    }
  }, [isOpen, profile?.id, profile?.role]);

  const markAsRead = (id: string) => {
    const readIds = getReadIds();
    readIds.add(id);
    saveReadIds(readIds);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );

    const remaining = notifications.filter((n) => n.id !== id && !n.read).length;
    if (onUnreadCountChange) onUnreadCountChange(remaining);
  };

  const markAllAsRead = () => {
    const readIds = getReadIds();
    notifications.forEach((n) => readIds.add(n.id));
    saveReadIds(readIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (onUnreadCountChange) onUnreadCountChange(0);
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filter === 'unread') return !n.read;
      if (filter === 'assignments') return n.type === 'assignment';
      return true;
    });
  }, [notifications, filter]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const formatTimeAgo = (isoDate: string) => {
    const diff = Date.now() - new Date(isoDate).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(isoDate).toLocaleDateString('en-GB');
  };

  const getTypeIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'assignment':
        return <UserPlus size={16} className="text-[#eb5526]" />;
      case 'review':
        return <FileText size={16} className="text-blue-600" />;
      case 'submission':
        return <BookOpen size={16} className="text-amber-600" />;
      case 'decision':
        return <CheckCircle size={16} className="text-emerald-600" />;
      default:
        return <Bell size={16} className="text-slate-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-[#e6e5e0] animate-in slide-in-from-right duration-250">
        
        {/* Header */}
        <div className="p-4 border-b border-[#f1f0ec] flex items-center justify-between bg-[#fbfaf8]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-orange-50 text-[#eb5526] flex items-center justify-center font-bold">
              <Bell size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-[#102342]">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="bg-[#eb5526] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-xs text-[#667082]">Real-time journal & editorial alerts</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-[#eb5526] hover:text-[#d7461c] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
                title="Mark all as read"
              >
                <Check size={14} /> Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#667082] hover:text-[#102342] hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 px-4 py-2.5 border-b border-[#f1f0ec] bg-white text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              filter === 'all'
                ? 'bg-[#102342] text-white'
                : 'bg-gray-100 text-[#667082] hover:bg-gray-200'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-[#eb5526] text-white'
                : 'bg-gray-100 text-[#667082] hover:bg-gray-200'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('assignments')}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              filter === 'assignments'
                ? 'bg-[#102342] text-white'
                : 'bg-gray-100 text-[#667082] hover:bg-gray-200'
            }`}
          >
            Assignments
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#f1f0ec]">
          {loading ? (
            <div className="p-8 text-center text-xs text-[#667082]">
              <div className="w-6 h-6 border-2 border-[#eb5526] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-[#667082] space-y-3">
              <CheckCircle size={36} className="mx-auto text-emerald-500 opacity-80" />
              <p className="font-semibold text-sm text-[#102342]">You're all caught up!</p>
              <p className="text-xs">
                {filter === 'unread'
                  ? 'No unread notifications at the moment.'
                  : 'No notifications found for this filter.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 transition-colors hover:bg-[#fbfaf8] flex items-start gap-3 relative ${
                  !n.read ? 'bg-orange-50/20' : 'bg-white'
                }`}
              >
                {/* Unread indicator dot */}
                {!n.read && (
                  <span className="w-2 h-2 rounded-full bg-[#eb5526] absolute top-4 left-2" />
                )}

                {/* Icon */}
                <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                  {getTypeIcon(n.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-xs text-[#102342] truncate">
                      {n.title}
                    </h3>
                    <span className="text-[10px] text-[#7e8da4] shrink-0">
                      {formatTimeAgo(n.createdAt)}
                    </span>
                  </div>

                  {n.trackingCode && (
                    <span className="inline-block font-mono text-[10px] bg-slate-100 text-[#102342] px-1.5 py-0.5 rounded font-bold border border-slate-200 mb-1">
                      {n.trackingCode}
                    </span>
                  )}

                  <p className="text-xs text-[#27334a] leading-relaxed mb-2.5">
                    {n.message}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        markAsRead(n.id);
                        onClose();
                        navigate(n.link);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#102342] hover:bg-[#eb5526] text-white text-[11px] font-bold rounded transition-colors cursor-pointer"
                    >
                      <span>Open</span>
                      <ExternalLink size={11} />
                    </button>

                    {!n.read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="text-[11px] text-[#667082] hover:text-[#102342] px-2 py-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#f1f0ec] bg-[#fbfaf8] text-center">
          <button
            onClick={() => {
              loadNotifications();
            }}
            className="text-xs text-[#667082] hover:text-[#102342] font-medium"
          >
            Refresh Alerts
          </button>
        </div>
      </div>
    </>
  );
}
