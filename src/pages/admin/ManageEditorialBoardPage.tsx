import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { EditorialBoardMember } from '@/types';

export default function ManageEditorialBoardPage() {
  const [members, setMembers] = useState<EditorialBoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EditorialBoardMember | null>(null);
  const [form, setForm] = useState({ name: '', role_title: '', affiliation: '', domain: '', bio: '', sort_order: 0 });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('editorial_board').select('*').order('sort_order', { ascending: true });
      if (data) setMembers(data as EditorialBoardMember[]);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (form.name.trim() === '' || form.role_title.trim() === '') return;
    if (editing) {
      const { data } = await supabase.from('editorial_board').update(form).eq('id', editing.id).select().single();
      if (data) setMembers(members.map((m) => m.id === editing.id ? (data as EditorialBoardMember) : m));
    } else {
      const { data } = await supabase.from('editorial_board').insert({ ...form, is_active: true }).select().single();
      if (data) setMembers([...members, data as EditorialBoardMember]);
    }
    setForm({ name: '', role_title: '', affiliation: '', domain: '', bio: '', sort_order: 0 });
    setEditing(null);
    setShowForm(false);
  };

  const edit = (m: EditorialBoardMember) => {
    setEditing(m);
    setForm({ name: m.name, role_title: m.role_title, affiliation: m.affiliation, domain: m.domain, bio: m.bio, sort_order: m.sort_order });
    setShowForm(true);
  };

  const remove = async (id: string) => {
    await supabase.from('editorial_board').delete().eq('id', id);
    setMembers(members.filter((m) => m.id !== id));
  };

  const toggleActive = async (m: EditorialBoardMember) => {
    await supabase.from('editorial_board').update({ is_active: !m.is_active }).eq('id', m.id);
    setMembers(members.map((mem) => mem.id === m.id ? { ...mem, is_active: !mem.is_active } : mem));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342]">Editorial Board</h1>
          <p className="text-[#667082] text-sm mt-1">Manage public profile cards for board members</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ name: '', role_title: '', affiliation: '', domain: '', bio: '', sort_order: 0 }); setShowForm(!showForm); }} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c]">
          <Plus size={16} /> Add Member
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#102342]">{editing ? 'Edit Member' : 'New Member'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526]" />
            <input type="text" placeholder="Role (e.g. Editor-in-Chief)" value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526]" />
            <input type="text" placeholder="Affiliation" value={form.affiliation} onChange={(e) => setForm({ ...form, affiliation: e.target.value })} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526]" />
            <input type="text" placeholder="Domain (e.g. Life Sciences)" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526]" />
            <input type="number" placeholder="Sort order" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526]" />
          </div>
          <textarea rows={3} placeholder="Bio description" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="w-full border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526] resize-none" />
          <div className="flex gap-2">
            <button onClick={save} className="px-4 py-2 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c]">Save</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-white border border-[#d8d8d1] text-[#667082] text-xs font-bold rounded-lg hover:bg-[#f1f0ec]">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-[#667082]">Loading...</p>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-12 text-center">
          <p className="text-[#667082]">No board members configured yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="bg-white rounded-lg border border-[#e6e5e0] p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#102342]">{m.name}</h3>
                <p className="text-xs text-[#eb5526] mt-0.5">{m.role_title} &middot; {m.affiliation}</p>
                {m.domain && <p className="text-[11px] text-[#667082] mt-0.5">Domain: {m.domain}</p>}
              </div>
              <div className="flex gap-3 items-center">
                <button onClick={() => toggleActive(m)} className={`text-xs font-semibold ${m.is_active ? 'text-green-500' : 'text-[#667082]'}`}>{m.is_active ? 'Active' : 'Inactive'}</button>
                <button onClick={() => edit(m)} className="text-[#102342] hover:text-[#eb5526]"><Edit3 size={16} /></button>
                <button onClick={() => remove(m.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
