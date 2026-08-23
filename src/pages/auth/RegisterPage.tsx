import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { sendInvitationAcceptedNotification } from '@/lib/email';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const roleParam = searchParams.get('role') || '';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(emailParam);
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
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
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
      if (roleParam) {
        try {
          await sendInvitationAcceptedNotification(fullName, email, roleParam);
        } catch (err) {
          console.error('Failed to send registration notification email to admin:', err);
        }
      }
      navigate('/dashboard');
    }
  };

  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const meetsLength = password.length >= 8;
  const meetsCapital = /[A-Z]/.test(password);
  const meetsNumber = /[0-9]/.test(password);
  const meetsSpecial = /[^A-Za-z0-9]/.test(password);

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
              
              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-1 h-1 w-full bg-[#f1f0ec] rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${
                      getPasswordStrength(password) >= 1 ? 'bg-red-500 w-1/4' : 'w-0'
                    }`} />
                    <div className={`h-full transition-all duration-300 ${
                      getPasswordStrength(password) >= 2 ? 'bg-orange-500 w-1/4' : 'w-0'
                    }`} />
                    <div className={`h-full transition-all duration-300 ${
                      getPasswordStrength(password) >= 3 ? 'bg-yellow-500 w-1/4' : 'w-0'
                    }`} />
                    <div className={`h-full transition-all duration-300 ${
                      getPasswordStrength(password) >= 4 ? 'bg-emerald-500 w-1/4' : 'w-0'
                    }`} />
                  </div>
                  
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-[#667082]">Password Strength:</span>
                    <span className={`font-bold uppercase ${
                      getPasswordStrength(password) === 4 ? 'text-emerald-600' :
                      getPasswordStrength(password) === 3 ? 'text-yellow-600' :
                      getPasswordStrength(password) === 2 ? 'text-orange-600' :
                      'text-red-500'
                    }`}>
                      {getPasswordStrength(password) === 4 ? 'Strong' :
                       getPasswordStrength(password) === 3 ? 'Good' :
                       getPasswordStrength(password) === 2 ? 'Fair' :
                       'Weak'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-[#667082] bg-[#fbfaf8] border border-[#e6e5e0] rounded-lg p-2">
                    <div className="flex items-center gap-1">
                      <span className={meetsLength ? 'text-emerald-600 font-bold' : 'text-red-500'}>
                        {meetsLength ? '✓' : '✗'}
                      </span>
                      <span>Min 8 chars</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={meetsCapital ? 'text-emerald-600 font-bold' : 'text-red-500'}>
                        {meetsCapital ? '✓' : '✗'}
                      </span>
                      <span>Capital letter</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={meetsNumber ? 'text-emerald-600 font-bold' : 'text-red-500'}>
                        {meetsNumber ? '✓' : '✗'}
                      </span>
                      <span>One number</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={meetsSpecial ? 'text-emerald-600 font-bold' : 'text-red-500'}>
                        {meetsSpecial ? '✓' : '✗'}
                      </span>
                      <span>Special char</span>
                    </div>
                  </div>
                </div>
              )}
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
