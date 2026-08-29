import { useEffect, useState } from 'react';
import { Plus, Trash2, Pin, Edit3, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Announcement } from '@/types';

export default function ManageAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', body: '', date: new Date().toISOString().slice(0, 10), pinned: false });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('announcements').select('*').order('date', { ascending: false });
      if (data) setAnnouncements(data as Announcement[]);
      setLoading(false);
    })();
  }, []);

  const openNewForm = () => {
    setEditingId(null);
    setForm({ title: '', body: '', date: new Date().toISOString().slice(0, 10), pinned: false });
    setShowForm(true);
  };

  const openEditForm = (a: Announcement) => {
    setEditingId(a.id);
    setForm({
      title: a.title,
      body: a.body,
      date: new Date(a.date).toISOString().slice(0, 10),
      pinned: a.pinned,
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setEditingId(null);
    setForm({ title: '', body: '', date: new Date().toISOString().slice(0, 10), pinned: false });
    setShowForm(false);
  };

  const save = async () => {
    if (!form.title.trim()) return;

    if (editingId) {
      // Update existing announcement
      const updatedDate = new Date(form.date).toISOString();
      const { error } = await supabase.from('announcements').update({ ...form, date: updatedDate }).eq('id', editingId);
      if (error) {
        alert(`Failed to update announcement: ${error.message}`);
        return;
      }
      setAnnouncements(announcements.map((ann) => ann.id === editingId ? { ...ann, ...form, date: updatedDate } : ann));
    } else {
      // Insert new announcement
      const { data, error } = await supabase.from('announcements').insert({ ...form, date: new Date(form.date).toISOString() }).select().single();
      if (error) {
        alert(`Failed to create announcement: ${error.message}`);
        return;
      }
      if (data) setAnnouncements([data as Announcement, ...announcements]);
    }

    cancelForm();
  };

  const remove = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
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
          <p className="text-[#667082] text-sm mt-1">Post and manage news updates visible on the homepage</p>
        </div>
        <button onClick={openNewForm} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c] cursor-pointer">
          <Plus size={16} /> New Announcement
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-5 space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex justify-between items-center border-b border-[#e6e5e0] pb-3">
            <h3 className="font-semibold text-[#102342] text-sm">{editingId ? 'Edit Announcement' : 'New Announcement'}</h3>
            <button onClick={cancelForm} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={18} /></button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#102342] mb-1">Title</label>
            <input type="text" placeholder="Announcement title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#102342] mb-1">Content / Body</label>
            <textarea rows={4} placeholder="Announcement content..." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526] resize-none" />
          </div>
          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-[#102342] mb-1">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526]" />
            </div>
            <div className="pt-5">
              <label className="flex items-center gap-2 text-sm text-[#667082] cursor-pointer font-medium">
                <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} className="w-4 h-4 accent-[#eb5526]" />
                Pin to homepage
              </label>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={cancelForm} className="px-4 py-2 border border-[#d8d8d1] bg-white hover:bg-[#fbfaf8] text-[#102342] text-xs font-bold rounded-lg cursor-pointer">Cancel</button>
            <button onClick={save} className="px-4 py-2 bg-[#102342] hover:bg-[#1d3556] text-white text-xs font-bold rounded-lg cursor-pointer">{editingId ? 'Save Changes' : 'Publish Announcement'}</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-[#667082]">Loading announcements...</p>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-12 text-center">
          <p className="text-[#667082]">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-lg border border-[#e6e5e0] p-5 flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {a.pinned && <Pin size={14} className="text-[#eb5526]" />}
                  <h3 className="font-semibold text-[#102342] text-base">{a.title}</h3>
                </div>
                <p className="text-xs text-[#667082] mt-1">{new Date(a.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <p className="text-sm text-[#667082] mt-2 leading-relaxed whitespace-pre-line">{a.body}</p>
              </div>
              <div className="flex items-center gap-3 ml-6 pt-1">
                <button onClick={() => openEditForm(a)} className="inline-flex items-center gap-1 text-xs font-bold text-[#eb5526] hover:text-[#d7461c] cursor-pointer">
                  <Edit3 size={15} /> Edit
                </button>
                <button onClick={() => togglePin(a)} className={`text-xs font-semibold cursor-pointer ${a.pinned ? 'text-[#eb5526]' : 'text-[#667082]'}`}>{a.pinned ? 'Unpin' : 'Pin'}</button>
                <button onClick={() => remove(a.id)} className="text-red-400 hover:text-red-600 cursor-pointer" title="Delete announcement"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
