/**
 * Forgot Password Component - Allows users to reset their password
 */

"use client";

import { useState } from 'react';
import { logger } from '../lib/logger';

interface ForgotPasswordProps {
  onClose: () => void;
  onBackToSignIn: () => void;
}

export default function ForgotPassword({ onClose, onBackToSignIn }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Send password reset email using custom API with Brevo templates
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Failed to send password reset email. Please try again.');
      }
    } catch (error: any) {
      logger.error('Password reset error:', error);
      setError('Failed to send password reset email. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/60 to-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-blue-500/20 backdrop-blur-sm">
        {/* Header */}
        <div className="px-8 py-6 border-b border-blue-500/20">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-white">Reset Password</h2>
              <p className="text-blue-200 mt-1">Enter your email to reset your password</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          {!success ? (
            <>
              <div className="mb-6">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="text-blue-400 font-medium">Password Reset</h4>
                      <p className="text-blue-300 text-sm mt-1">
                        We'll send you a secure link to reset your password. The link will expire in 1 hour.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-blue-200 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="reset-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-blue-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                    placeholder="Enter your email address"
                  />
                </div>

                {error && (
                  <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-3 px-4 rounded-lg font-semibold hover:from-red-700 hover:to-red-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {loading ? 'Sending Reset Link...' : '🔑 Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Reset Link Sent!</h3>
                <p className="text-gray-300 text-sm mb-4">
                  We've sent a password reset link to <strong className="text-blue-400">{email}</strong>
                </p>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-left">
                  <h4 className="text-green-400 font-medium mb-2">Next Steps:</h4>
                  <ul className="text-green-300 text-sm space-y-1">
                    <li>• Check your email inbox</li>
                    <li>• Click the "Reset Password" button in the email</li>
                    <li>• Create a new password</li>
                    <li>• Sign in with your new password</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Back to Sign In */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Remember your password?{' '}
              <button
                onClick={onBackToSignIn}
                className="text-blue-400 hover:text-blue-300 font-medium underline transition-colors"
              >
                Back to Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
