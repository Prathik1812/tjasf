import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';

interface EmailTemplate {
  slug: string;
  title: string;
  subject: string;
  body: string;
  variables: string[];
}

export default function ManageEmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('title', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
      
      // Auto-select the first template if none is selected
      if (data && data.length > 0 && !selectedTemplate) {
        handleSelectTemplate(data[0]);
      } else if (selectedTemplate) {
        const refreshed = data?.find(t => t.slug === selectedTemplate.slug);
        if (refreshed) handleSelectTemplate(refreshed);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
    setLoading(false);
  };

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setSubject(template.subject);
    setBody(template.body);
    setMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('email_templates')
        .update({
          subject,
          body,
        })
        .eq('slug', selectedTemplate.slug);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Email template updated successfully!' });
      
      // Refresh local templates array
      setTemplates(templates.map(t => 
        t.slug === selectedTemplate.slug 
          ? { ...t, subject, body }
          : t
      ));
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Failed to update template' });
    }
    setSaving(false);
  };

  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#eb5526] mx-auto" />
          <p className="text-sm text-[#667082]">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#f1f0ec]">
        <div>
          <h1 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mb-1">Email Templates</h1>
          <p className="text-xs text-[#667082]">Customize automated notification subjects and email body contents.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates Sidebar List */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-[#e6e5e0] overflow-hidden self-start">
          <div className="p-4 bg-gray-50 border-b border-[#e6e5e0]">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#102342]">Automated Templates</h2>
          </div>
          <div className="divide-y divide-[#f1f0ec] max-h-[500px] overflow-y-auto">
            {templates.map((t) => (
              <button
                key={t.slug}
                onClick={() => handleSelectTemplate(t)}
                className={`w-full text-left p-4 hover:bg-gray-50/50 transition-colors block outline-none ${
                  selectedTemplate?.slug === t.slug ? 'bg-amber-50/40 border-l-4 border-[#eb5526]' : 'border-l-4 border-transparent'
                }`}
              >
                <div className="font-semibold text-xs text-[#102342]">{t.title}</div>
                <div className="text-[10px] text-[#667082] mt-1 font-mono truncate">{t.subject}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Edit Panel */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTemplate ? (
            <div className="bg-white rounded-lg border border-[#e6e5e0] p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#f1f0ec]">
                <h3 className="font-semibold text-[#102342]">Edit template: <span className="text-[#eb5526]">{selectedTemplate.title}</span></h3>
              </div>

              {message && (
                <div className={`p-4 rounded-lg text-sm border flex items-start gap-3 mb-6 ${
                  message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {message.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <p>{message.text}</p>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#102342] mb-1.5">Email Subject Line *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526] bg-white text-[#27334a]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#102342] mb-1.5">Email Body Content *</label>
                  <textarea
                    required
                    rows={12}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full border border-[#d8d8d1] rounded-lg px-4 py-3 text-sm outline-none focus:border-[#eb5526] bg-white text-[#27334a] font-mono leading-relaxed"
                  />
                </div>

                {/* Variables Nudge info panel */}
                <div className="bg-[#fbfaf8] border border-[#e6e5e0] rounded-lg p-4 space-y-2">
                  <h4 className="text-xs font-bold text-[#102342] flex items-center gap-1.5">
                    <Info size={14} className="text-[#eb5526]" />
                    Available Placeholders
                  </h4>
                  <p className="text-[11px] text-[#667082]">
                    The following variables are supported inside this template's subject or body and will be replaced dynamically on dispatch:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedTemplate.variables.map((v) => (
                      <span key={v} className="bg-white border border-[#d8d8d1] rounded px-2 py-0.5 font-mono text-xs text-[#eb5526]">
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-[#f1f0ec]">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c] disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} /> Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-[#e6e5e0] p-8 text-center text-[#667082]">
              Select an email template from the sidebar to customize it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
