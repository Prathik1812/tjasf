import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const nameRegex = /^[a-zA-Z\s\.\-]+$/;
    if (!nameRegex.test(fullName.trim())) {
      setError('Full Name must only contain letters, spaces, periods, or hyphens (no numbers).');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const emailLower = email.toLowerCase().trim();
    let dbRole: 'author' | 'reviewer' | 'editor_in_chief' | 'admin' = 'author';

    // Auto-assign roles only for the 2 authorized email addresses, block other @tjasf.com emails
    if (emailLower.endsWith('@tjasf.com')) {
      if (emailLower === 'editor@tjasf.com') {
        dbRole = 'editor_in_chief';
      } else if (emailLower === 'editorial@tjasf.com') {
        dbRole = 'admin';
      } else {
        setError('Only editor@tjasf.com and editorial@tjasf.com are authorized under the @tjasf.com domain.');
        return;
      }
    }

    setLoading(true);
    const { error: signUpError } = await signUp(email, password, fullName, dbRole);
    if (signUpError) {
      setError(signUpError);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f1ed] px-4 py-12">
      <div className="max-w-[480px] w-full">
        <Link to="/" className="flex justify-center mb-8">
          <img src="/assets/images/TJASF_logo_light.svg" alt="TJASF" className="w-[180px] mix-blend-multiply" />
        </Link>
        <div className="bg-white rounded-lg border border-[#e6e5e0] p-8">
          <h1 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mb-2">Create an account</h1>
          <p className="text-sm text-[#667082] mb-6">Join the TJASF community to submit manuscripts and participate in peer review.</p>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1">Full Name</label>
              <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#102342] mb-1">Confirm Password</label>
              <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526]" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-[#eb5526] text-white text-sm font-bold rounded-lg hover:bg-[#d7461c] transition-colors disabled:opacity-50">
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-sm text-[#667082] text-center mt-6">
            Already have an account? <Link to="/login" className="text-[#eb5526] font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
