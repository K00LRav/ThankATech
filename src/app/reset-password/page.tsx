/**
 * Password Reset Page - Handle password reset tokens
 * Users land here from email links to reset their passwords
 */

'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tokenValidated, setTokenValidated] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    // Validate token on component mount
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/auth/validate-reset-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        setTokenValidated(true);
        setUserEmail(data.email);
      } else {
        setError(data.message || 'Invalid or expired reset link.');
      }
    } catch (error) {
      console.error('Token validation error:', error);
      setError('Error validating reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Reset password through our API
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Password reset successfully! You can now sign in with your new password.');
        
        // Redirect to sign in after 3 seconds
        setTimeout(() => {
          router.push('/?signin=true');
        }, 3000);
      } else {
        setError(data.message || 'Failed to reset password. Please try again.');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setError('Error resetting password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const requestNewResetLink = async () => {
    if (!userEmail) {
      setError('Unable to resend reset link. Please start over.');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('New reset link sent! Please check your email.');
      } else {
        setError(data.message || 'Failed to send new reset link.');
      }
    } catch (error) {
      console.error('Resend reset link error:', error);
      setError('Error sending new reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl">
              🔐
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ThankATech
            </h1>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Reset Your Password</h2>
          <p className="text-gray-600 text-sm">
            {tokenValidated ? 'Enter your new password below' : 'Validating reset link...'}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && !tokenValidated && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Validating reset link...</p>
          </div>
        )}

        {/* Error State */}
        {error && !tokenValidated && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-red-500">❌</span>
              <span className="text-red-700 text-sm">{error}</span>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => router.push('/?signin=true')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Go to Sign In
              </button>
              <span className="text-gray-400">•</span>
              <button
                onClick={() => router.push('/?forgot-password=true')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Request New Link
              </button>
            </div>
          </div>
        )}

        {/* Success State */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✅</span>
              <span className="text-green-700 text-sm">{success}</span>
            </div>
          </div>
        )}

        {/* Password Reset Form */}
        {tokenValidated && !success && (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            {userEmail && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-blue-700 text-sm">
                  <strong>Account:</strong> {userEmail}
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-red-500">❌</span>
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new password (min 6 characters)"
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm your new password"
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Resetting Password...
                </div>
              ) : (
                '🔑 Reset Password'
              )}
            </button>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={requestNewResetLink}
                disabled={isLoading}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Send New Reset Link
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="text-center mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium"
          >
            ← Back to ThankATech
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}