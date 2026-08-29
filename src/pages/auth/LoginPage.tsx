import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<'author' | 'reviewer' | 'editor' | 'admin'>('author');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const emailLower = email.toLowerCase().trim();

      // Enforce strict @tjasf.com email usage
      if (emailLower.endsWith('@tjasf.com')) {
        if (emailLower !== 'editor@tjasf.com' && emailLower !== 'editorial@tjasf.com') {
          setError('Unauthorized email address under the @tjasf.com domain.');
          setLoading(false);
          return;
        }
      }

      // Perform Supabase Sign In and receive loaded profile directly
      const { error: signInError, profile: userProfile } = await signIn(email, password);

      if (signInError) {
        setError(signInError);
        setLoading(false);
        return;
      }

      if (userProfile) {
        const getMappedRoleGroup = (dbRole: string): 'author' | 'reviewer' | 'editor' | 'admin' => {
          if (dbRole === 'admin') return 'admin';
          if (dbRole === 'reviewer') return 'reviewer';
          if (
            dbRole.includes('editor') ||
            dbRole.includes('chief') ||
            dbRole.includes('board') ||
            dbRole.includes('member')
          ) return 'editor';
          return 'author';
        };

        const matchedGroup = getMappedRoleGroup(userProfile.role || 'author');
        // Admins can log into any workspace, otherwise enforce matched role group
        if (userProfile.role !== 'admin' && matchedGroup !== selectedRole) {
          setError(`Access Denied: You selected "${selectedRole.toUpperCase()}" but this account is registered as a ${userProfile.role.replace(/_/g, ' ').toUpperCase()}.`);
          setLoading(false);
          return;
        }
      }

      navigate(from);
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.message || 'An unexpected error occurred during sign in.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f1ed] px-4 py-12">
      <div className="max-w-[420px] w-full">
        <Link to="/" className="flex justify-center mb-8">
          <img src="/assets/images/TJASF_logo_light.svg" alt="TJASF" className="w-[180px] mix-blend-multiply" />
        </Link>
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-8">
          <h1 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mb-2">Sign in to TJASF</h1>
          <p className="text-sm text-[#667082] mb-6">Welcome back. Enter your credentials to access your dashboard.</p>
          
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-semibold text-[#102342]">Password</label>
                <Link to="/forgot-password" className="text-xs text-[#eb5526] hover:underline font-semibold">Forgot password?</Link>
              </div>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
            </div>

            {/* Role Selection Radio Buttons */}
            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1">Select Workspace Role</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'author', label: 'Author' },
                  { value: 'reviewer', label: 'Reviewer' },
                  { value: 'editor', label: 'Editor' },
                  { value: 'admin', label: 'Admin' },
                ].map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                      selectedRole === r.value
                        ? 'border-[#eb5526] bg-[#eb5526]/5 text-[#eb5526]'
                        : 'border-[#d8d8d1] bg-white text-[#667082] hover:bg-[#fbfaf8]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="loginRole"
                      value={r.value}
                      checked={selectedRole === r.value}
                      onChange={() => setSelectedRole(r.value as any)}
                      className="accent-[#eb5526]"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-[#8a919b] mt-1.5 leading-relaxed">
                * Personal emails default to <strong>Author</strong> on registration. Assigned database roles (e.g. Reviewer or Editor) are preserved and will not be overwritten upon sign in.
              </p>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3 bg-[#eb5526] text-white text-sm font-bold rounded-lg hover:bg-[#d7461c] transition-colors disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-sm text-[#667082] text-center mt-6">
            Don't have an account? <Link to="/register" className="text-[#eb5526] font-semibold hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
