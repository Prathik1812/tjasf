import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types';

export default function ManageUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
    if (!error) {
      setUsers(users.map((u) => u.id === userId ? { ...u, role } : u));
    }
    setUpdatingId(null);
  };

  const toggleUserActive = async (user: Profile) => {
    setUpdatingId(user.id);
    const { error } = await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id);
    if (!error) {
      setUsers(users.map((u) => u.id === user.id ? { ...u, is_active: !user.is_active } : u));
    }
    setUpdatingId(null);
  };

  const rolesList: UserRole[] = ['author', 'reviewer', 'section_editor', 'managing_editor', 'editor_in_chief', 'admin'];

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
                        onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
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
    </div>
  );
}
