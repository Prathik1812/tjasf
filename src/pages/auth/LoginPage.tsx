import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const { signIn, refreshProfile } = useAuth();
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

    // Pre-configured demo details for on-the-fly registration if they don't exist yet
    const demoAccounts: Record<string, { name: string; role: string }> = {
      'author@tjasf.org': { name: 'Author Candidate', role: 'author' },
      'reviewer@tjasf.org': { name: 'Prof. Alan Turing', role: 'reviewer' },
      'rajesh.thumma@anurag.edu.in': { name: 'Dr. Rajesh Thumma', role: 'editor_in_chief' },
      'admin@tjasf.org': { name: 'Prathik Kumar', role: 'admin' },
    };

    const isDemo = email.toLowerCase() in demoAccounts;

    // 1. Try to sign in directly
    const { error: signInError } = await signIn(email, password);
    
    if (!signInError) {
      // Direct sign in succeeded! Self-heal or update the user's role profile
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      if (sessionUser) {
        const dbRole = selectedRole === 'editor' ? 'editor_in_chief' : selectedRole;
        const { data: existingProfile } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).maybeSingle();
        
        if (existingProfile) {
          if (isDemo) {
            // Demo accounts can switch roles on the fly using the radio buttons
            await supabase.from('profiles').update({ role: dbRole }).eq('id', sessionUser.id);
          } else {
            // Personal email accounts preserve their database role (do NOT overwrite it)
            // Unless it is 'user' or invalid, in which case we make sure it is 'author'
            if (existingProfile.role === 'user' || !existingProfile.role) {
              await supabase.from('profiles').update({ role: 'author' }).eq('id', sessionUser.id);
            }
          }
        } else {
          // If no profile row exists (e.g. registered directly in Auth tab or custom flow), create it
          // Defaults to 'author' for personal email, or uses selectedRole for demo
          const initialRole = isDemo ? dbRole : 'author';
          await supabase.from('profiles').insert({
            id: sessionUser.id,
            email,
            full_name: sessionUser.user_metadata?.full_name || email.split('@')[0],
            role: initialRole,
            is_active: true,
            email_verified: true,
          });
        }
        await refreshProfile();
      }
      navigate(from);
      return;
    }

    // 2. If direct login failed and matches a demo credential, attempt auto-registration
    if (isDemo && password === 'password123') {
      try {
        const cred = demoAccounts[email.toLowerCase()];
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        if (signUpData.user) {
          // Clean up any old auto-profiles for this ID
          await supabase.from('profiles').delete().eq('id', signUpData.user.id);

          const dbRole = selectedRole === 'editor' ? 'editor_in_chief' : selectedRole;
          const { error: profileError } = await supabase.from('profiles').insert({
            id: signUpData.user.id,
            email,
            full_name: cred.name,
            role: dbRole,
            is_active: true,
            email_verified: true,
          });

          if (profileError) {
            throw new Error(profileError.message);
          }

          // 3. Final sign in after registering
          const { error: finalSignInError } = await signIn(email, password);
          if (finalSignInError) {
            throw new Error(finalSignInError);
          }

          await refreshProfile();
          navigate(from);
          return;
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred during quick sign in');
        setLoading(false);
        return;
      }
    }

    // Standard credential error if not demo
    setError(signInError);
    setLoading(false);
  };

  const handleQuickFill = (roleKey: 'author' | 'reviewer' | 'editor' | 'admin') => {
    const credentials = {
      author: 'author@tjasf.org',
      reviewer: 'reviewer@tjasf.org',
      editor: 'rajesh.thumma@anurag.edu.in',
      admin: 'admin@tjasf.org',
    };
    setEmail(credentials[roleKey]);
    setPassword('password123');
    setSelectedRole(roleKey);
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
              <label className="block text-sm font-semibold text-[#102342] mb-1">Password</label>
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

          <div className="mt-8 border-t border-[#e6e5e0] pt-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#737b88] mb-3 text-center">Auto-Fill Test Credentials</h2>
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button" 
                onClick={() => handleQuickFill('author')} 
                disabled={loading}
                className="py-2.5 px-3 bg-[#f1f0ec] text-[#27334a] rounded-lg text-xs font-semibold hover:bg-[#eb5526] hover:text-white transition-colors text-center disabled:opacity-50"
              >
                Author
              </button>
              <button 
                type="button" 
                onClick={() => handleQuickFill('reviewer')} 
                disabled={loading}
                className="py-2.5 px-3 bg-[#f1f0ec] text-[#27334a] rounded-lg text-xs font-semibold hover:bg-[#eb5526] hover:text-white transition-colors text-center disabled:opacity-50"
              >
                Reviewer
              </button>
              <button 
                type="button" 
                onClick={() => handleQuickFill('editor')} 
                disabled={loading}
                className="py-2.5 px-3 bg-[#f1f0ec] text-[#27334a] rounded-lg text-xs font-semibold hover:bg-[#eb5526] hover:text-white transition-colors text-center disabled:opacity-50"
              >
                Editor
              </button>
              <button 
                type="button" 
                onClick={() => handleQuickFill('admin')} 
                disabled={loading}
                className="py-2.5 px-3 bg-[#f1f0ec] text-[#27334a] rounded-lg text-xs font-semibold hover:bg-[#eb5526] hover:text-white transition-colors text-center disabled:opacity-50"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
