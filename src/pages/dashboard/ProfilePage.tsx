import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/Toast';
import { Lock, Save, Key, Tag, Plus, X } from 'lucide-react';
import type { Profile } from '@/types';

export default function ProfilePage() {
  const { user, profile: authProfile, fetchProfile } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<Partial<Profile>>({
    full_name: '',
    title: '',
    affiliation: '',
    department: '',
    orcid: '',
    bio: '',
    keywords: [],
  });

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Keyword input tag state
  const [keywordInput, setKeywordInput] = useState('');

  useEffect(() => {
    if (authProfile) {
      setProfileData({
        full_name: authProfile.full_name || '',
        title: authProfile.title || '',
        affiliation: authProfile.affiliation || '',
        department: authProfile.department || '',
        orcid: authProfile.orcid || '',
        bio: authProfile.bio || '',
        keywords: authProfile.keywords || [],
      });
    }
  }, [authProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          title: profileData.title,
          affiliation: profileData.affiliation,
          department: profileData.department,
          bio: profileData.bio,
          keywords: profileData.keywords,
        })
        .eq('id', user.id);

      if (error) throw error;

      await fetchProfile(user.id);
      toast.success('Profile details updated successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match!');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (!trimmed) return;
    
    const currentKeywords = profileData.keywords || [];
    if (currentKeywords.some(k => k.toLowerCase() === trimmed.toLowerCase())) {
      toast.info('Keyword already exists.');
      return;
    }

    setProfileData({
      ...profileData,
      keywords: [...currentKeywords, trimmed],
    });
    setKeywordInput('');
  };

  const removeKeyword = (indexToRemove: number) => {
    const currentKeywords = profileData.keywords || [];
    setProfileData({
      ...profileData,
      keywords: currentKeywords.filter((_, idx) => idx !== indexToRemove),
    });
  };

  const roleLabels: Record<string, string> = {
    author: 'Author',
    reviewer: 'Reviewer',
    section_editor: 'Section Editor',
    editor_in_chief: 'Editor in Chief',
    admin: 'Administrator',
    associate_editor: 'Associate Editor',
    editorial_board_member: 'Editorial Board Member',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-[#102342]">My Profile Settings</h1>
        <p className="text-sm text-[#667082] mt-1">Manage your account details, research keywords, and change your password.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Side: General Profile Card */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleUpdateProfile} className="bg-white rounded-lg border border-[#e6e5e0] p-6 space-y-6">
            <h2 className="font-semibold text-lg text-[#102342] flex items-center gap-2">
              General Information
            </h2>

            {/* Read-Only/Mandatory Fields Badge Info */}
            <div className="bg-[#fcfbf9] border border-[#e6e5e0] rounded-lg p-4 space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#667082]">Locked Verified Attributes</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#667082] uppercase">Email address</label>
                  <div className="mt-1 flex items-center gap-2 text-sm text-[#27334a]">
                    <span>{authProfile?.email || user?.email}</span>
                    <Lock size={13} className="text-[#a4b0c4]" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#667082] uppercase">Assigned Role</label>
                  <div className="mt-1 flex items-center gap-2 text-sm text-[#27334a]">
                    <span className="bg-[#f1f0ec] px-2 py-0.5 rounded text-xs font-semibold">
                      {roleLabels[authProfile?.role || 'author']}
                    </span>
                    <Lock size={13} className="text-[#a4b0c4]" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#667082] uppercase">ORCID iD</label>
                  <div className="mt-1 flex items-center gap-2 text-sm text-[#27334a]">
                    <span className="font-mono text-xs">{authProfile?.orcid || 'Not provided'}</span>
                    <Lock size={13} className="text-[#a4b0c4]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-[#102342] mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526]"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#102342] mb-1.5">Title / Honorific (e.g., Prof., Dr.)</label>
                <input
                  type="text"
                  value={profileData.title}
                  onChange={(e) => setProfileData({ ...profileData, title: e.target.value })}
                  className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526]"
                  placeholder="e.g., Dr."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#102342] mb-1.5">Affiliation / Institution *</label>
                <input
                  type="text"
                  required
                  value={profileData.affiliation}
                  onChange={(e) => setProfileData({ ...profileData, affiliation: e.target.value })}
                  className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526]"
                  placeholder="e.g., Stanford University"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#102342] mb-1.5">Department</label>
                <input
                  type="text"
                  value={profileData.department}
                  onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                  className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526]"
                  placeholder="e.g., Computer Science"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1.5">Biography & Research Focus</label>
              <textarea
                rows={4}
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526] resize-none"
                placeholder="Brief summary of your academic background and research interests..."
              />
            </div>

            {/* Keywords Section */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-[#102342]">Research Keywords / Expertise</label>
              <p className="text-xs text-[#667082] -mt-1">Add keywords that reflect your expertise. These will be matched to incoming manuscripts for review.</p>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  className="flex-1 border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526]"
                  placeholder="e.g., Machine Learning"
                />
                <button
                  type="button"
                  onClick={addKeyword}
                  className="px-4 py-2 bg-[#102342] text-white text-sm font-bold rounded-lg hover:bg-[#1d3556] flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={16} /> Add
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {(profileData.keywords || []).map((keyword, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 bg-[#f1f0ec] border border-[#d8d8d1] px-3 py-1 rounded-full text-xs text-[#102342] font-semibold">
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeKeyword(idx)}
                      className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
                {(!profileData.keywords || profileData.keywords.length === 0) && (
                  <p className="text-xs text-[#a4b0c4] italic">No keywords added yet.</p>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#eb5526] hover:bg-[#d7461c] text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save size={16} /> {loading ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Change Password Card */}
        <div className="space-y-6">
          <form onSubmit={handleChangePassword} className="bg-white rounded-lg border border-[#e6e5e0] p-6 space-y-5">
            <h2 className="font-semibold text-lg text-[#102342] flex items-center gap-2">
              <Key size={18} className="text-[#eb5526]" /> Password Security
            </h2>
            
            <p className="text-xs text-[#667082] leading-relaxed">
              Upon your first login, please update your temporary password to secure your account.
            </p>

            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1.5">New Password *</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526]"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1.5">Confirm New Password *</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2 text-sm outline-none focus:border-[#eb5526]"
                placeholder="Confirm password"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full px-4 py-2.5 bg-[#102342] hover:bg-[#1d3556] text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
