import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, Upload, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { StatusBadge } from '@/components/DashboardLayout';
import type { Manuscript, Domain } from '@/types';

export default function MyManuscripts() {
  const { user, profile } = useAuth();
  const [manuscripts, setManuscripts] = useState<Manuscript[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);

  // Revision states
  const [revisingId, setRevisingId] = useState<string | null>(null);
  const [revisionFileName, setRevisionFileName] = useState('');
  const [revisionFileUrl, setRevisionFileUrl] = useState('');
  const [uploadingRevision, setUploadingRevision] = useState(false);
  const [revisionError, setRevisionError] = useState('');

  const activeProfile = profile || (user ? {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    role: 'author' as any,
  } : null);

  const fetchManuscripts = async () => {
    const targetUserId = activeProfile?.id;
    if (!targetUserId) return;
    const { data } = await supabase.from('manuscripts').select('*').eq('submitter_id', targetUserId).order('created_at', { ascending: false });
    if (data) setManuscripts(data as Manuscript[]);
  };

  useEffect(() => {
    (async () => {
      await fetchManuscripts();
      const { data: doms } = await supabase.from('domains').select('*');
      if (doms) setDomains(doms as Domain[]);
      setLoading(false);
    })();
  }, [activeProfile?.id, activeProfile?.role]);

  const domainName = (id: string | null) => domains.find((d) => d.id === id)?.name || 'Unassigned';

  const handleRevisionFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict compliance name check (same as submission page)
    const isCompliant = file.name.toLowerCase().includes('template') || file.name.toLowerCase().includes('tjasf');
    if (!isCompliant) {
      setRevisionError('Template Compliance Error: The file must conform to the TJASF template layout and include "template" or "tjasf" in the file name.');
      setRevisionFileName('');
      setRevisionFileUrl('');
      e.target.value = '';
      return;
    }

    setRevisionFileName(file.name);
    setUploadingRevision(true);
    setRevisionError('');

    try {
      const filePath = `manuscripts/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from('manuscripts').upload(filePath, file);
      if (upErr) throw upErr;

      const { data: pubData } = supabase.storage.from('manuscripts').getPublicUrl(filePath);
      setRevisionFileUrl(pubData.publicUrl);
    } catch (err: any) {
      setRevisionError('Failed to upload file: ' + (err.message || err));
      setRevisionFileName('');
      setRevisionFileUrl('');
    } finally {
      setUploadingRevision(false);
    }
  };

  const submitRevision = async (m: Manuscript) => {
    if (!revisionFileUrl) {
      setRevisionError('Please select a valid compliant file first.');
      return;
    }
    setUploadingRevision(true);
    setRevisionError('');

    try {
      const { error: updErr } = await supabase
        .from('manuscripts')
        .update({
          file_url: revisionFileUrl,
          file_name: revisionFileName,
          status: 'submitted', // Return to submitted queue
          version: (m.version || 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', m.id);

      if (updErr) throw updErr;

      // Record new version in versions archive
      await supabase.from('manuscript_versions').insert({
        manuscript_id: m.id,
        version: (m.version || 1) + 1,
        file_url: revisionFileUrl,
        file_name: revisionFileName,
      });

      // Clean up states
      setRevisingId(null);
      setRevisionFileName('');
      setRevisionFileUrl('');
      
      // Refresh list
      await fetchManuscripts();
    } catch (err: any) {
      setRevisionError('Failed to update manuscript: ' + (err.message || err));
    } finally {
      setUploadingRevision(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342]">My Manuscripts</h1>
          <p className="text-[#667082] text-sm mt-1">Track and manage your submissions</p>
        </div>
        <Link to="/dashboard/submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c] shadow-sm">
          <Plus size={16} /> New Submission
        </Link>
      </div>

      {loading ? (
        <p className="text-[#667082]">Loading...</p>
      ) : manuscripts.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-12 text-center shadow-sm">
          <FileText size={40} className="mx-auto text-[#d8d8d1] mb-4" />
          <p className="text-[#667082] text-lg mb-2">No manuscripts yet</p>
          <p className="text-[#667082] text-sm mb-6">Start your first submission to see it here.</p>
          <Link to="/dashboard/submit" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#eb5526] text-white text-xs font-bold rounded-lg hover:bg-[#d7461c] shadow-sm">
            <Plus size={16} /> Submit a Manuscript
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {manuscripts.map((m) => (
            <div key={m.id} className="bg-white rounded-lg border border-[#e6e5e0] p-5 flex flex-col gap-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-[#102342] truncate text-base">{m.title || 'Untitled manuscript'}</h3>
                  <div className="flex gap-4 text-xs text-[#667082] mt-1.5">
                    <span>Domain: <strong className="text-[#102342]">{domainName(m.domain_id)}</strong></span>
                    <span>Version: <strong className="text-[#102342]">v{m.version}</strong></span>
                    <span>Submitted: <strong className="text-[#102342]">{new Date(m.created_at).toLocaleDateString('en-GB')}</strong></span>
                  </div>
                </div>
                <StatusBadge status={m.status} />
              </div>

              {/* Revision requested action box */}
              {m.status === 'revision_requested' && (
                <div className="border-t border-[#f1f0ec] pt-4">
                  {revisingId === m.id ? (
                    <div className="bg-[#fbfaf8] border border-[#d8d8d1] rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#eb5526] uppercase tracking-wide">Submit Revised File (v{m.version + 1})</span>
                        <button 
                          onClick={() => { setRevisingId(null); setRevisionFileName(''); setRevisionFileUrl(''); setRevisionError(''); }} 
                          className="text-xs text-[#667082] hover:text-[#102342]"
                        >
                          Cancel
                        </button>
                      </div>

                      {revisionError && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 p-2.5 rounded text-xs">
                          <AlertCircle size={15} className="mt-0.5 shrink-0" />
                          <span>{revisionError}</span>
                        </div>
                      )}

                      <div className="border-2 border-dashed border-[#d8d8d1] rounded bg-white p-6 text-center">
                        {uploadingRevision ? (
                          <div className="space-y-2">
                            <div className="w-6 h-6 border-2 border-t-[#eb5526] border-[#f1f0ec] rounded-full animate-spin mx-auto" />
                            <p className="text-xs text-[#102342]">Uploading revised manuscript...</p>
                          </div>
                        ) : revisionFileName ? (
                          <div className="flex items-center justify-center gap-2 text-xs text-[#102342]">
                            <Upload size={14} className="text-[#eb5526]" /> {revisionFileName}
                            <button onClick={() => { setRevisionFileName(''); setRevisionFileUrl(''); }} className="ml-2 text-red-500 hover:text-red-700">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-[#667082] mb-2">Select your updated manuscript file</p>
                            <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleRevisionFileChange(e)} id={`revision-file-${m.id}`} className="hidden" />
                            <label htmlFor={`revision-file-${m.id}`} className="inline-block px-3 py-1.5 bg-[#f1f0ec] text-xs font-bold text-[#102342] rounded cursor-pointer hover:bg-[#eeece7]">
                              Choose File
                            </label>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => submitRevision(m)}
                        disabled={!revisionFileUrl || uploadingRevision}
                        className="w-full py-2 bg-[#102342] hover:bg-[#eb5526] text-white text-xs font-bold rounded transition-colors disabled:opacity-35"
                      >
                        Submit Revision Document
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-xs text-orange-800">
                        The editor has requested revisions for this manuscript. Please submit your corrected version.
                      </p>
                      <button 
                        onClick={() => setRevisingId(m.id)} 
                        className="px-3.5 py-1.5 bg-[#eb5526] hover:bg-[#d7461c] text-white text-xs font-bold rounded"
                      >
                        Upload Revision
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
