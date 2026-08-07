import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { HomepageContent } from '@/types';

export default function ManageHomepagePage() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('homepage_content').select('*');
      if (data) {
        const map: Record<string, string> = {};
        (data as HomepageContent[]).forEach((item) => {
          map[item.key] = item.value;
        });
        setContent(map);
      }
      setLoading(false);
    })();
  }, []);

  const handleChange = (key: string, value: string) => {
    setContent({ ...content, [key]: value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const payload = Object.entries(content).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('homepage_content').upsert(payload);
    setSaving(false);
    if (!error) {
      setMessage('Homepage content saved successfully.');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Error saving homepage content: ' + error.message);
    }
  };

  const keys = [
    { key: 'hero_title', label: 'Hero Title', type: 'text' },
    { key: 'hero_subtitle', label: 'Hero Subtitle', type: 'text' },
    { key: 'hero_lede', label: 'Hero Lede/Summary', type: 'textarea' },
    { key: 'about_title', label: 'About Page Title', type: 'text' },
    { key: 'about_intro', label: 'About Page Introduction', type: 'textarea' },
    { key: 'about_aims', label: 'Aims & Scope Content', type: 'textarea' },
    { key: 'about_editorial', label: 'Editorial Policy Content', type: 'textarea' },
    { key: 'about_open_access', label: 'Open Access Policy Content', type: 'textarea' },
    { key: 'about_indexing', label: 'Indexing Details Content', type: 'textarea' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342]">Homepage Content</h1>
        <p className="text-[#667082] text-sm mt-1">Configure layout copy for public and about sections</p>
      </div>

      {loading ? (
        <p className="text-[#667082]">Loading content configuration...</p>
      ) : (
        <form onSubmit={handleSave} className="bg-white rounded-lg border border-[#e6e5e0] p-6 space-y-6 max-w-[800px]">
          {message && (
            <div className={`p-3 rounded-lg text-sm ${message.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {message}
            </div>
          )}

          <div className="space-y-4">
            {keys.map((k) => (
              <div key={k.key}>
                <label className="block text-sm font-semibold text-[#102342] mb-1">{k.label}</label>
                {k.type === 'textarea' ? (
                  <textarea
                    rows={4}
                    value={content[k.key] || ''}
                    onChange={(e) => handleChange(k.key, e.target.value)}
                    className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526] resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={content[k.key] || ''}
                    onChange={(e) => handleChange(k.key, e.target.value)}
                    className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526]"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}
    </div>
  );
}
