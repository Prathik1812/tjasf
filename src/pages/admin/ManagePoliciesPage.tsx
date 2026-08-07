import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Policy } from '@/types';

export default function ManagePoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Policy | null>(null);
  const [form, setForm] = useState({ slug: '', title: '', category: '', content: '' });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('policies').select('*').order('category');
      if (data) setPolicies(data as Policy[]);
      setLoading(false);
    })();
  }, []);

  const savePolicy = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    const slug = form.slug.trim() || form.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const payload = {
      title: form.title,
      slug,
      category: form.category || 'General',
      content: form.content,
      last_updated: new Date().toISOString(),
    };

    if (editing) {
      const { data } = await supabase.from('policies').update(payload).eq('id', editing.id).select().single();
      if (data) setPolicies(policies.map((p) => p.id === editing.id ? data as Policy : p));
    } else {
      const { data } = await supabase.from('policies').insert(payload).select().single();
      if (data) setPolicies([...policies, data as Policy]);
    }

    setForm({ slug: '', title: '', category: '', content: '' });
    setEditing(null);
    setShowForm(false);
  };

  const editPolicy = (p: Policy) => {
    setEditing(p);
    setForm({ slug: p.slug, title: p.title, category: p.category, content: p.content });
    setShowForm(true);
  };

  const deletePolicy = async (id: string) => {
    await supabase.from('policies').delete().eq('id', id);
    setPolicies(policies.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342]">Manage Policies</h1>
          <p className="text-[#667082] text-sm mt-1">Configure legal, editorial, and submissions documentation</p>
        </div>
        <button onClick={() => { setEditing(null); setForm({ slug: '', title: '', category: '', content: '' }); setShowForm(!showForm); }} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c]">
          <Plus size={16} /> New Policy
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#102342]">{editing ? 'Edit Policy Document' : 'New Policy Document'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="text" placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526]" />
            <input type="text" placeholder="Slug (optional)" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526]" />
            <input type="text" placeholder="Category (e.g. Ethics) *" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526]" />
          </div>
          <textarea rows={8} placeholder="Content text (supports Markdown layout)..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="w-full border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526] resize-none" />
          <div className="flex gap-2">
            <button onClick={savePolicy} className="px-4 py-2 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c]">Save</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-white border border-[#d8d8d1] text-[#667082] text-xs font-bold rounded-lg hover:bg-[#f1f0ec]">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-[#667082]">Loading policies...</p>
      ) : policies.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-12 text-center">
          <p className="text-[#667082]">No policies established yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map((p) => (
            <div key={p.id} className="bg-white rounded-lg border border-[#e6e5e0] p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#102342]">{p.title}</h3>
                <p className="text-xs text-[#eb5526] mt-0.5">{p.category} &middot; /{p.slug}</p>
                <p className="text-xs text-[#667082] mt-1 line-clamp-1">{p.content}</p>
              </div>
              <div className="flex gap-3 items-center">
                <button onClick={() => editPolicy(p)} className="text-[#102342] hover:text-[#eb5526]"><Edit3 size={16} /></button>
                <button onClick={() => deletePolicy(p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
