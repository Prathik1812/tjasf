import { useEffect, useState } from 'react';
import { Plus, Trash2, Pin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Announcement } from '@/types';

export default function ManageAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', date: new Date().toISOString().slice(0, 10), pinned: false });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('announcements').select('*').order('date', { ascending: false });
      if (data) setAnnouncements(data as Announcement[]);
      setLoading(false);
    })();
  }, []);

  const add = async () => {
    if (!form.title.trim()) return;
    const { data } = await supabase.from('announcements').insert({ ...form, date: new Date(form.date).toISOString() }).select().single();
    if (data) setAnnouncements([data as Announcement, ...announcements]);
    setForm({ title: '', body: '', date: new Date().toISOString().slice(0, 10), pinned: false });
    setShowForm(false);
  };

  const remove = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id);
    setAnnouncements(announcements.filter((a) => a.id !== id));
  };

  const togglePin = async (a: Announcement) => {
    await supabase.from('announcements').update({ pinned: !a.pinned }).eq('id', a.id);
    setAnnouncements(announcements.map((ann) => ann.id === a.id ? { ...ann, pinned: !ann.pinned } : ann));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342]">Announcements</h1>
          <p className="text-[#667082] text-sm mt-1">Post news and updates visible on the homepage</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c]">
          <Plus size={16} /> New Announcement
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-5 space-y-3">
          <input type="text" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526]" />
          <textarea rows={4} placeholder="Body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526] resize-none" />
          <div className="flex gap-4 items-center">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526]" />
            <label className="flex items-center gap-2 text-sm text-[#667082] cursor-pointer">
              <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} className="w-4 h-4 accent-[#eb5526]" />
              Pin to top
            </label>
          </div>
          <button onClick={add} className="px-4 py-2 bg-[#102342] text-white text-xs font-bold rounded-lg hover:bg-[#1d3556]">Publish</button>
        </div>
      )}

      {loading ? (
        <p className="text-[#667082]">Loading...</p>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-12 text-center">
          <p className="text-[#667082]">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-lg border border-[#e6e5e0] p-4 flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {a.pinned && <Pin size={14} className="text-[#eb5526]" />}
                  <h3 className="font-semibold text-[#102342]">{a.title}</h3>
                </div>
                <p className="text-xs text-[#667082] mt-1">{new Date(a.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <p className="text-sm text-[#667082] mt-2 line-clamp-2">{a.body}</p>
              </div>
              <div className="flex gap-3 ml-4">
                <button onClick={() => togglePin(a)} className={`text-xs font-semibold ${a.pinned ? 'text-[#eb5526]' : 'text-[#667082]'}`}>{a.pinned ? 'Unpin' : 'Pin'}</button>
                <button onClick={() => remove(a.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
