import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase().trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        throw resetError;
      }

      setMessage('If an account exists with this email, a password reset link has been sent. Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'An error occurred while requesting your password reset.');
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
          <h1 className="font-['Playfair_Display'] font-medium text-2xl text-[#102342] mb-2">Forgot Password</h1>
          <p className="text-sm text-[#667082] mb-6">Enter your registered email address and we will send you a link to reset your password.</p>
          
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">{error}</div>}
          {message && <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4 text-sm text-green-700">{message}</div>}

          {!message && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#102342] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. editor@tjasf.com"
                  className="w-full border border-[#d8d8d1] rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#eb5526]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#eb5526] text-white text-sm font-bold rounded-lg hover:bg-[#d7461c] transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending Link...' : 'Send Reset Link'}
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
