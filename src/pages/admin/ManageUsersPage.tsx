import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types';

export default function ManageUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Custom Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    oldRole: UserRole;
    newRole: UserRole;
  } | null>(null);

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
      // Force state update to trigger list reload
      const { data } = await supabase.from('profiles').select('*').order('full_name');
      if (data) setUsers(data as Profile[]);
    } else {
      setUsers(users.map((u) => u.id === userId ? { ...u, role } : u));
    }
    setUpdatingId(null);
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

  const rolesList: UserRole[] = ['author', 'reviewer', 'section_editor', 'managing_editor', 'editor_in_chief', 'admin', 'associate_editor', 'editorial_board_member'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-['Playfair_Display'] font-medium text-3xl text-[#102342]">Manage Users</h1>
        <p className="text-[#667082] text-sm mt-1">Assign system roles and control user account states</p>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f0ec] text-sm">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#fbfaf8]">
                    <td className="p-4 font-medium text-[#102342]">{u.full_name}</td>
                    <td className="p-4 text-[#667082]">{u.email}</td>
                    <td className="p-4">
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
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => toggleUserActive(u)}
                        disabled={updatingId === u.id}
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          u.is_active
                            ? 'bg-green-50 text-green-700 hover:bg-green-100'
                            : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Custom Confirmation Web Modal */}
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
                className="px-4 py-2 border border-[#d8d8d1] rounded-lg text-xs font-bold text-[#102342] bg-white hover:bg-[#fbfaf8] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  changeRole(confirmModal.userId, confirmModal.newRole);
                  setConfirmModal(null);
                }}
                className="px-5 py-2.5 bg-[#eb5526] hover:bg-[#d7461c] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
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
