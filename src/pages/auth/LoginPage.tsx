import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Pre-configured demo details for on-the-fly registration if they don't exist yet
    const demoAccounts: Record<string, { name: string; role: string }> = {
      'reviewer@tjasf.org': { name: 'Prof. Alan Turing', role: 'reviewer' },
      'rajesh.thumma@anurag.edu.in': { name: 'Dr. Rajesh Thumma', role: 'editor_in_chief' },
      'admin@tjasf.org': { name: 'Prathik Kumar', role: 'admin' },
    };

    const isDemo = email in demoAccounts;

    // 1. Try to sign in directly
    const { error: signInError } = await signIn(email, password);
    if (!signInError) {
      navigate(from);
      return;
    }

    // 2. If it failed and matches a demo credential, attempt auto-registration
    if (isDemo && password === 'password123') {
      try {
        const cred = demoAccounts[email];
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

          const { error: profileError } = await supabase.from('profiles').insert({
            id: signUpData.user.id,
            email,
            full_name: cred.name,
            role: cred.role,
            is_active: true,
            email_verified: true,
          });

          if (profileError) {
            throw new Error(profileError.message);
          }

          // 3. Final sign in
          const { error: finalSignInError } = await signIn(email, password);
          if (finalSignInError) {
            throw new Error(finalSignInError);
          }

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
