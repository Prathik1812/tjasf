import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Password Strength Logic
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        throw updateError;
      }

      setMessage('Your password has been reset successfully. Redirecting you to login page...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update your password.');
    } finally {
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
          <h1 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mb-2">Reset Password</h1>
          <p className="text-sm text-[#667082] mb-6">Enter your new password below to regain access to your account.</p>
          
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>}
          {message && <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">{message}</div>}

          {!message && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#102342] mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526]"
                />

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
                <label className="block text-sm font-semibold text-[#102342] mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#eb5526] text-white text-sm font-bold rounded-lg hover:bg-[#d7461c] transition-colors disabled:opacity-50"
              >
                {loading ? 'Updating Password...' : 'Reset Password'}
              </button>
            </form>
          )}

          <p className="text-sm text-[#667082] text-center mt-6">
            Back to <Link to="/login" className="text-[#eb5526] font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
