import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Domain } from '@/types';

export default function ManageDomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('domains').select('*').order('name');
      if (data) setDomains(data as Domain[]);
      setLoading(false);
    })();
  }, []);

  const addDomain = async () => {
    if (!name.trim()) return;
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const { data } = await supabase.from('domains').insert({ name, slug, description }).select().single();
    if (data) setDomains([...domains, data as Domain]);
    setName('');
    setDescription('');
    setShowForm(false);
  };

  const deleteDomain = async (id: string) => {
    await supabase.from('domains').delete().eq('id', id);
    setDomains(domains.filter((d) => d.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342]">Research Domains</h1>
          <p className="text-[#667082] text-sm mt-1">Manage scientific domains for manuscript categorization</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c]">
          <Plus size={16} /> Add Domain
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-5 space-y-3">
          <input type="text" placeholder="Domain name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526]" />
          <input type="text" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526]" />
          <button onClick={addDomain} className="px-4 py-2 bg-[#102342] text-white text-xs font-bold rounded-lg hover:bg-[#1d3556]">Save Domain</button>
        </div>
      )}

      {loading ? (
        <p className="text-[#667082]">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {domains.map((d) => (
            <div key={d.id} className="bg-white rounded-lg border border-[#e6e5e0] p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#102342]">{d.name}</h3>
                <p className="text-xs text-[#667082] mt-0.5">{d.description || 'No description'}</p>
              </div>
              <button onClick={() => deleteDomain(d.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
