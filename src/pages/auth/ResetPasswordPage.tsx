import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ArrowRight, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import PasswordInput from '@/components/PasswordInput';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      // 1. Check for error in hash (e.g. #error=access_denied&error_description=...)
      const hash = window.location.hash;
      if (hash && hash.includes('error=')) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const errorDesc = hashParams.get('error_description') || hashParams.get('error') || '';
        if (isMounted) {
          setError(errorDesc.replace(/\+/g, ' ') || 'This password reset link is invalid or has expired.');
          setCheckingSession(false);
          setHasSession(false);
        }
        return;
      }

      // 2. Check for implicit access_token in hash (#access_token=...&refresh_token=...)
      if (hash && hash.includes('access_token=')) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        if (accessToken && refreshToken) {
          try {
            const { data, error: setSessionErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!setSessionErr && data.session && isMounted) {
              setHasSession(true);
              setCheckingSession(false);
              return;
            }
          } catch (e) {
            console.warn('Hash setSession error:', e);
          }
        }
      }

      // 3. Check for PKCE 'code' in query params (?code=...) or hash
      const urlParams = new URLSearchParams(window.location.search);
      let code = urlParams.get('code') || searchParams.get('code');
      if (!code && hash && hash.includes('code=')) {
        const hashParams = new URLSearchParams(hash.substring(1));
        code = hashParams.get('code');
      }

      if (code) {
        try {
          const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (!exchangeError && exchangeData?.session && isMounted) {
            setHasSession(true);
            setCheckingSession(false);
            return;
          }
          if (exchangeError) {
            console.warn('PKCE exchange error:', exchangeError.message);
          }
        } catch (e: any) {
          console.warn('Code exchange exception:', e);
        }

        // Check if session was already established or exchanged automatically by Supabase client
        const { data: { session: postCodeSession } } = await supabase.auth.getSession();
        if (postCodeSession && isMounted) {
          setHasSession(true);
          setCheckingSession(false);
          return;
        }

        if (isMounted) {
          setError('Your password reset link is invalid or has expired. Please request a new one.');
          setCheckingSession(false);
          setHasSession(false);
        }
        return;
      }

      // 4. Check if active session already exists in Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (session && isMounted) {
        setHasSession(true);
        setCheckingSession(false);
        return;
      }

      // 4. Listen for auth state changes (PASSWORD_RECOVERY or SIGNED_IN)
      const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
        if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && newSession) {
          if (isMounted) {
            setHasSession(true);
            setCheckingSession(false);
          }
        }
      });

      // 5. Short fallback timeout before concluding no session exists
      const timer = setTimeout(async () => {
        if (!isMounted) return;
        const { data: latest } = await supabase.auth.getSession();
        if (latest.session) {
          setHasSession(true);
        } else {
          setHasSession(false);
        }
        setCheckingSession(false);
      }, 1500);

      return () => {
        clearTimeout(timer);
        authListener.subscription.unsubscribe();
      };
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

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

    // Pre-check session to avoid raw "Auth session missing" error
    const { data: currentSession } = await supabase.auth.getSession();
    if (!currentSession.session) {
      setError('Auth session missing or expired. Password reset links expire after 1 hour or after being used. Please request a new link.');
      setHasSession(false);
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

      setMessage('Your password has been reset successfully! Redirecting you to the sign in page...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('auth session missing')) {
        setError('Your password reset session has expired. Please request a new link.');
        setHasSession(false);
      } else {
        setError(msg || 'Failed to update your password.');
      }
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
          {message && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-sm text-green-800 flex items-start gap-2.5">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
              <span>{message}</span>
            </div>
          )}

          {checkingSession ? (
            <div className="p-8 text-center text-xs text-[#667082] space-y-3">
              <RefreshCw size={24} className="animate-spin mx-auto text-[#eb5526]" />
              <p className="font-semibold text-sm text-[#102342]">Verifying reset link...</p>
              <p className="text-xs text-[#667082]">Please wait while we establish your secure session.</p>
            </div>
          ) : !hasSession && !message ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 text-center space-y-3">
              <AlertCircle size={36} className="text-amber-600 mx-auto" />
              <h2 className="font-bold text-base text-[#102342]">Reset Link Expired or Missing</h2>
              <p className="text-xs text-[#667082] leading-relaxed">
                For security reasons, password reset links can only be used once and expire after 1 hour. We could not find an active authentication session.
              </p>
              <div className="pt-2">
                <Link
                  to="/forgot-password"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#eb5526] hover:bg-[#d7461c] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  <span>Request New Reset Link</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : !message && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#102342] mb-1">New Password</label>
                <PasswordInput
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
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
                <PasswordInput
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
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
