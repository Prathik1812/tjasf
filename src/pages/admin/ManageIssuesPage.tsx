import { useEffect, useState } from 'react';
import { Plus, Trash2, BookOpen, Archive } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Volume, Issue } from '@/types';

export default function ManageIssuesPage() {
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // Volume Form
  const [showVolumeForm, setShowVolumeForm] = useState(false);
  const [volNum, setVolNum] = useState('');
  const [volYear, setVolYear] = useState(new Date().getFullYear().toString());
  const [volTitle, setVolTitle] = useState('');

  // Issue Form
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [selectedVolId, setSelectedVolId] = useState('');
  const [issNum, setIssNum] = useState('');
  const [issTitle, setIssTitle] = useState('');
  const [issCover, setIssCover] = useState('');
  const [issPubDate, setIssPubDate] = useState(new Date().toISOString().slice(0, 10));

  const loadData = async () => {
    setLoading(true);
    const { data: vols } = await supabase.from('volumes').select('*').order('number', { ascending: false });
    if (vols) setVolumes(vols as Volume[]);
    const { data: iss } = await supabase.from('issues').select('*').order('number', { ascending: true });
    if (iss) setIssues(iss as Issue[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const addVolume = async () => {
    if (!volNum || !volYear) return;
    const { data, error } = await supabase.from('volumes').insert({
      number: parseInt(volNum),
      year: parseInt(volYear),
      title: volTitle,
    }).select().single();
    if (!error && data) {
      setVolumes([data as Volume, ...volumes]);
      setVolNum('');
      setVolTitle('');
      setShowVolumeForm(false);
    }
  };

  const addIssue = async () => {
    if (!selectedVolId || !issNum) return;
    const { data, error } = await supabase.from('issues').insert({
      volume_id: selectedVolId,
      number: parseInt(issNum),
      title: issTitle,
      cover_url: issCover,
      publication_date: issPubDate ? new Date(issPubDate).toISOString().slice(0, 10) : null,
      is_published: false,
    }).select().single();
    if (!error && data) {
      setIssues([...issues, data as Issue]);
      setIssNum('');
      setIssTitle('');
      setIssCover('');
      setShowIssueForm(false);
    }
  };

  const deleteVolume = async (id: string) => {
    await supabase.from('volumes').delete().eq('id', id);
    setVolumes(volumes.filter((v) => v.id !== id));
  };

  const deleteIssue = async (id: string) => {
    await supabase.from('issues').delete().eq('id', id);
    setIssues(issues.filter((i) => i.id !== id));
  };

  const togglePublishIssue = async (issue: Issue) => {
    const { error } = await supabase.from('issues').update({
      is_published: !issue.is_published,
      publication_date: !issue.is_published ? new Date().toISOString().slice(0, 10) : issue.publication_date,
    }).eq('id', issue.id);
    if (!error) {
      setIssues(issues.map((i) => i.id === issue.id ? { ...i, is_published: !i.is_published } : i));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342]">Volumes &amp; Issues</h1>
          <p className="text-[#667082] text-sm mt-1">Create volumes, define issues, and manage release states</p>
        </div>
        <div className="flex gap-2.5">
          <button onClick={() => setShowVolumeForm(!showVolumeForm)} className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#d8d8d1] text-[#102342] text-xs font-bold rounded-lg hover:bg-[#f1f0ec] bg-white">
            <Archive size={15} /> New Volume
          </button>
          <button onClick={() => { if (volumes.length > 0 && !selectedVolId) setSelectedVolId(volumes[0].id); setShowIssueForm(!showIssueForm); }} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c]">
            <Plus size={16} /> New Issue
          </button>
        </div>
      </div>

      {/* Forms */}
      {showVolumeForm && (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#102342]">Create New Volume</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="number" placeholder="Volume Number *" value={volNum} onChange={(e) => setVolNum(e.target.value)} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526]" />
            <input type="number" placeholder="Year *" value={volYear} onChange={(e) => setVolYear(e.target.value)} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526]" />
            <input type="text" placeholder="Title/Topic (optional)" value={volTitle} onChange={(e) => setVolTitle(e.target.value)} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526]" />
          </div>
          <button onClick={addVolume} className="px-4 py-2 bg-[#102342] text-white text-xs font-bold rounded-lg hover:bg-[#1d3556]">Save Volume</button>
        </div>
      )}

      {showIssueForm && (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-5 space-y-3">
          <h2 className="text-sm font-bold text-[#102342]">Create New Issue</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={selectedVolId} onChange={(e) => setSelectedVolId(e.target.value)} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526] bg-white">
              <option value="">Choose Volume *</option>
              {volumes.map((v) => <option key={v.id} value={v.id}>Volume {v.number} ({v.year})</option>)}
            </select>
            <input type="number" placeholder="Issue Number *" value={issNum} onChange={(e) => setIssNum(e.target.value)} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526]" />
            <input type="text" placeholder="Issue Title (e.g. Frontiers in ML)" value={issTitle} onChange={(e) => setIssTitle(e.target.value)} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526]" />
            <input type="text" placeholder="Cover Image URL" value={issCover} onChange={(e) => setIssCover(e.target.value)} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526]" />
            <input type="date" placeholder="Pub Date" value={issPubDate} onChange={(e) => setIssPubDate(e.target.value)} className="border border-[#d8d8d1] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#eb5526]" />
          </div>
          <button onClick={addIssue} className="px-4 py-2 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c]">Save Issue</button>
        </div>
      )}

      {loading ? (
        <p className="text-[#667082]">Loading archives...</p>
      ) : volumes.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-12 text-center">
          <BookOpen size={40} className="mx-auto text-[#d8d8d1] mb-4" />
          <p className="text-[#667082] text-lg">No volumes created yet</p>
          <p className="text-[#667082] text-sm mt-1">Create a volume first before publishing issues.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {volumes.map((vol) => {
            const volIssues = issues.filter((i) => i.volume_id === vol.id);
            return (
              <div key={vol.id} className="bg-white rounded-lg border border-[#e6e5e0] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[#f1f0ec] pb-3">
                  <div>
                    <h2 className="font-['Playfair_Display'] text-xl font-semibold text-[#102342]">
                      Volume {vol.number} <span className="text-sm font-normal text-[#667082]">({vol.year})</span>
                    </h2>
                    {vol.title && <p className="text-xs text-[#667082] mt-0.5">{vol.title}</p>}
                  </div>
                  <button onClick={() => deleteVolume(vol.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                </div>
                {volIssues.length === 0 ? (
                  <p className="text-xs text-[#667082]">No issues created in this volume yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {volIssues.map((iss) => (
                      <div key={iss.id} className="border border-[#e6e5e0] p-4 rounded-lg flex flex-col justify-between bg-[#fbfaf8]">
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className="text-[10px] font-bold text-[#eb5526] uppercase">Issue {iss.number}</span>
                            <h3 className="font-semibold text-sm text-[#102342] mt-0.5">{iss.title || 'Untitled Issue'}</h3>
                            <p className="text-[11px] text-[#667082] mt-1">Date: {iss.publication_date ? new Date(iss.publication_date).toLocaleDateString('en-GB') : 'TBA'}</p>
                          </div>
                          <button onClick={() => deleteIssue(iss.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                        <div className="flex items-center justify-between border-t border-[#e6e5e0] mt-4 pt-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${iss.is_published ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                            {iss.is_published ? 'Published' : 'Draft'}
                          </span>
                          <button onClick={() => togglePublishIssue(iss)} className="text-xs text-[#eb5526] font-bold hover:underline">
                            {iss.is_published ? 'Unpublish' : 'Publish Now'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
