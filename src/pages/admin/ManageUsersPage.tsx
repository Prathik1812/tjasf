import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Eye, X, User, Trash2 } from 'lucide-react';
import type { Profile, UserRole } from '@/types';

export default function ManageUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Custom Modal States
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    oldRole: UserRole;
    newRole: UserRole;
  } | null>(null);

  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    userEmail: string;
  } | null>(null);

  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('*').order('full_name');
      if (data) setUsers(data as Profile[]);
      setLoading(false);
    })();
  }, []);

  const changeRole = async (userId: string, role: UserRole) => {
    setUpdatingId(userId);
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
    
    if (error) {
      alert(`Failed to save role update permanently: ${error.message}\nEnsure you have run the admin update SQL policy in Supabase.`);
      const { data } = await supabase.from('profiles').select('*').order('full_name');
      if (data) setUsers(data as Profile[]);
    } else {
      setUsers(users.map((u) => u.id === userId ? { ...u, role } : u));
    }
    setUpdatingId(null);
  };

  const deleteUser = async (userId: string) => {
    setUpdatingId(userId);
    try {
      // Call secure postgres definer function to delete auth user + profile
      const { error } = await supabase.rpc('delete_user_by_admin', { user_id: userId });
      if (error) throw error;
      
      setUsers(users.filter((u) => u.id !== userId));
      alert('User deleted successfully.');
    } catch (err: any) {
      console.error(err);
      alert(`Failed to delete user: ${err.message || err.details || 'Ensure you have executed the delete SQL trigger in Supabase.'}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRoleSelect = (userId: string, newRole: UserRole) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    if (user.role === newRole) return;

    setConfirmModal({
      isOpen: true,
      userId,
      userName: user.full_name,
      oldRole: user.role,
      newRole
    });
  };

  const toggleUserActive = async (user: Profile) => {
    setUpdatingId(user.id);
    const { error } = await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id);
    if (error) {
      alert(`Failed to toggle status: ${error.message}`);
    } else {
      setUsers(users.map((u) => u.id === user.id ? { ...u, is_active: !user.is_active } : u));
    }
    setUpdatingId(null);
  };

  const rolesList: UserRole[] = ['author', 'reviewer', 'section_editor', 'editor_in_chief', 'associate_editor', 'editorial_board_member'];

  const roleLabel: Record<UserRole, string> = {
    author: 'Author',
    reviewer: 'Reviewer',
    section_editor: 'Section Editor',
    editor_in_chief: 'Editor in Chief',
    admin: 'Administrator',
    associate_editor: 'Associate Editor',
    editorial_board_member: 'Editorial Board Member',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342]">Manage Users</h1>
        <p className="text-[#667082] text-sm mt-1">Assign system roles, inspect academic profiles, and control account states</p>
      </div>

      {loading ? (
        <p className="text-[#667082]">Loading users...</p>
      ) : (
        <div className="bg-white rounded-lg border border-[#e6e5e0] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f1f0ec] text-xs font-bold uppercase tracking-wider text-[#102342] border-b border-[#e6e5e0]">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f0ec] text-sm">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#fbfaf8]">
                    <td className="p-4 font-medium text-[#102342]">{u.full_name}</td>
                    <td className="p-4 text-[#667082]">{u.email}</td>
                    <td className="p-4">
                      {u.role === 'admin' ? (
                        <span className="px-2.5 py-1 bg-[#102342] text-white rounded text-xs font-bold">
                          Administrator (Protected)
                        </span>
                      ) : (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleSelect(u.id, e.target.value as UserRole)}
                          disabled={updatingId === u.id}
                          className="border border-[#d8d8d1] rounded px-2.5 py-1 bg-white text-xs outline-none focus:border-[#eb5526] disabled:opacity-50"
                        >
                          {rolesList.map((r) => (
                            <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleUserActive(u)}
                        disabled={updatingId === u.id || u.role === 'admin'}
                        className={`text-xs font-bold px-3 py-1 rounded-full cursor-pointer ${
                          u.is_active
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedProfile(u)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#eb5526] hover:text-[#d7461c] cursor-pointer"
                        >
                          <Eye size={14} /> Profile
                        </button>
                        {u.role !== 'admin' ? (
                          <button
                            onClick={() => setDeleteConfirmModal({
                              isOpen: true,
                              userId: u.id,
                              userName: u.full_name,
                              userEmail: u.email
                            })}
                            disabled={updatingId === u.id}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic font-medium">Protected System Admin</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Profile Details Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-[#08172f]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-[#e6e5e0] shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#e6e5e0] flex items-center justify-between">
              <h3 className="font-['Playfair_Display'] font-semibold text-lg text-[#102342] flex items-center gap-2">
                <User size={18} className="text-[#eb5526]" /> {selectedProfile.title || ''} {selectedProfile.full_name}
              </h3>
              <button
                onClick={() => setSelectedProfile(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Account Basic Info */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Email Address</span>
                  <p className="text-sm font-medium text-[#102342] mt-0.5">{selectedProfile.email}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Current Role</span>
                  <p className="text-sm font-medium mt-0.5">
                    <span className="bg-[#f1f0ec] px-2 py-0.5 rounded text-xs font-semibold">
                      {roleLabel[selectedProfile.role]}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Affiliation</span>
                  <p className="text-sm font-medium text-[#102342] mt-0.5">{selectedProfile.affiliation || 'None'}</p>
                </div>
                <div>
                  <span className="font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Department</span>
                  <p className="text-sm font-medium text-[#102342] mt-0.5">{selectedProfile.department || 'None'}</p>
                </div>
              </div>

              {/* Academic Identifiers Info */}
              <div className="bg-[#fbfaf8] border border-[#e6e5e0] rounded-lg p-4 space-y-3">
                <h4 className="font-bold text-[#102342] text-xs">Academic Identifiers</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 font-semibold">ORCID iD:</span>
                    <p className="font-mono text-[#102342] mt-0.5">{selectedProfile.orcid || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-semibold">Google Scholar ID:</span>
                    <p className="font-mono text-[#102342] mt-0.5">{selectedProfile.google_scholar_id || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-semibold">Scopus Author ID:</span>
                    <p className="font-mono text-[#102342] mt-0.5">{selectedProfile.scopus_id || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-semibold">ResearcherID:</span>
                    <p className="font-mono text-[#102342] mt-0.5">{selectedProfile.researcher_id || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Biography Section */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-[#102342] text-xs">Biography & Research Focus</h4>
                <p className="text-xs text-gray-700 leading-relaxed bg-[#fbfaf8] p-3 rounded-lg border border-[#e6e5e0] whitespace-pre-line">
                  {selectedProfile.bio || 'No biography details provided.'}
                </p>
              </div>

              {/* Keywords Section */}
              <div className="space-y-2">
                <h4 className="font-bold text-[#102342] text-xs">Expertise Keywords</h4>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedProfile.keywords || []).map((keyword, idx) => (
                    <span key={idx} className="bg-[#f1f0ec] border border-[#d8d8d1] px-2.5 py-0.5 rounded-full text-xs text-[#102342] font-semibold">
                      {keyword}
                    </span>
                  ))}
                  {(!selectedProfile.keywords || selectedProfile.keywords.length === 0) && (
                    <p className="text-xs text-gray-400 italic">No expertise keywords specified.</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-[#f1f0ec] px-6 py-4 flex justify-end">
              <button
                onClick={() => setSelectedProfile(null)}
                className="px-4 py-2 bg-[#102342] hover:bg-[#1d3556] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmModal && deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-[#08172f]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-[#e6e5e0] shadow-xl max-w-[440px] w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h3 className="font-['Playfair_Display'] font-semibold text-lg text-red-600 mb-2">
                Delete Account Permanently
              </h3>
              <p className="text-sm text-[#667082] leading-relaxed">
                Are you sure you want to permanently delete the account for <strong>{deleteConfirmModal.userName}</strong> ({deleteConfirmModal.userEmail})?
              </p>
              <p className="text-xs text-red-500 mt-2 font-medium">
                ⚠️ WARNING: This action is irreversible and will delete all their papers, review history, and login access.
              </p>
            </div>
            <div className="bg-[#f1f0ec] px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 border border-[#d8d8d1] rounded-lg text-xs font-bold text-[#102342] bg-white hover:bg-[#fbfaf8] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteUser(deleteConfirmModal.userId);
                  setDeleteConfirmModal(null);
                }}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Role Confirmation Web Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-[#08172f]/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-[#e6e5e0] shadow-xl max-w-[440px] w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h3 className="font-['Playfair_Display'] font-semibold text-lg text-[#102342] mb-2">
                Confirm Role Change
              </h3>
              <p className="text-sm text-[#667082] leading-relaxed">
                Are you sure you want to permanently change the role of <strong>{confirmModal.userName}</strong> from <span className="font-bold text-[#102342] uppercase text-xs">{confirmModal.oldRole.replace(/_/g, ' ')}</span> to <span className="font-bold text-[#eb5526] uppercase text-xs">{confirmModal.newRole.replace(/_/g, ' ')}</span>?
              </p>
            </div>
            <div className="bg-[#f1f0ec] px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 border border-[#d8d8d1] rounded-lg text-xs font-bold text-[#102342] bg-white hover:bg-[#fbfaf8] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  changeRole(confirmModal.userId, confirmModal.newRole);
                  setConfirmModal(null);
                }}
                className="px-5 py-2.5 bg-[#eb5526] hover:bg-[#d7461c] text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
