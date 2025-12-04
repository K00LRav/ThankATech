"use client";

// Force dynamic rendering to prevent Firebase auth errors during build
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, getUser } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { findTechnicianByUsername } from '../../lib/techniciansApi';
import { sendFreeThankYou, getUserTokenBalance } from '../../lib/token-firebase';
import TokenSendModal from '../../components/TokenSendModal';
import TokenPurchaseModal from '../../components/TokenPurchaseModal';
import Footer from '../../components/Footer';
import { ProfileHeader } from '../../components/ProfileHeader';
import UniversalHeader from '@/components/UniversalHeader';
import { AppreciationActions } from '../../components/AppreciationActions';
import { ContactInfo } from '../../components/ContactInfo';
import { logger } from '../../lib/logger';

interface Technician {
  id: string;
  authUid?: string;
  name: string;
  username: string;
  businessName: string;
  category: string;
  email: string;
  phone?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  website?: string;
  about?: string;
  experience?: string;
  certifications?: string;
  serviceArea?: string;
  hourlyRate?: string;
  availability?: string;
  image?: string;
  title?: string;
  points?: number;
  totalThankYous?: number;
  totalTips?: number;
}

export default function TechnicianProfile() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [technician, setTechnician] = useState<Technician | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTokenSendModal, setShowTokenSendModal] = useState(false);
  const [showTokenPurchaseModal, setShowTokenPurchaseModal] = useState(false);
  const [user] = useAuthState(auth);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  const loadTechnician = useCallback(async () => {
    try {
      setLoading(true);
      const technicianData = await findTechnicianByUsername(username);
      
      if (!technicianData) {
        setError('Technician not found');
        return;
      }

      setTechnician(technicianData);
    } catch (err) {
      setError('Failed to load technician profile');
    } finally {
      setLoading(false);
    }
  }, [username]);

  // Load current user profile data
  useEffect(() => {
    if (user) {
      const loadUserProfile = async () => {
        try {
          const profile = await getUser(user.uid);
          setCurrentUserProfile(profile);
        } catch (error) {
          logger.error('Error loading user profile:', error);
          setCurrentUserProfile(null);
        }
      };
      loadUserProfile();
    } else {
      setCurrentUserProfile(null);
    }
  }, [user]);


  useEffect(() => {
    if (username) {
      loadTechnician();
    }
  }, [username, loadTechnician]);

  const handleThankYou = async () => {
    if (!user) {
      // Save return URL and redirect to main page for authentication
      const returnUrl = `/${username}`;
      router.push(`/?returnTo=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (!technician) return;

    try {
      logger.info('Sending free thank you to technician:', technician.id);
      const result = await sendFreeThankYou(user.uid, technician.id);
      
      if (result.success) {
        // Show success message
        alert('Thank you sent! 🎉');
        // Reload technician data to update stats
        await loadTechnician();
      } else {
        alert(result.error || 'Failed to send thank you');
      }
    } catch (error) {
      logger.error('Error sending thank you:', error);
      alert('Failed to send thank you. Please try again.');
    }
  };

  const handleSignIn = () => {
    const returnUrl = `/${username}`;
    router.push(`/?returnTo=${encodeURIComponent(returnUrl)}`);
  };

  const handleRegister = () => {
    const returnUrl = `/${username}`;
    router.push(`/?returnTo=${encodeURIComponent(returnUrl)}`);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      logger.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !technician) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Profile Not Found</h1>
          <p className="text-slate-300 mb-6">
            {error || `We couldn't find a technician with the username "${username}".`}
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden hidden sm:block">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-blue-600/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <UniversalHeader 
        currentPath={`/${technician.username}`}
        customSubtitle={`thankatech.com/${technician.username}`}
        currentUser={user && currentUserProfile ? {
          id: user.uid,
          name: currentUserProfile.name || currentUserProfile.businessName || user.displayName || 'User',
          email: user.email || '',
          photoURL: currentUserProfile.image || currentUserProfile.photoURL || user.photoURL || undefined,
          userType: currentUserProfile.userType,
          points: currentUserProfile.points
        } : undefined}
        onSignIn={handleSignIn}
        onRegister={handleRegister}
        onSignOut={handleSignOut}
      />

      <main className="relative max-w-md mx-auto px-3 py-6 sm:max-w-6xl sm:px-4 lg:px-8 sm:py-12">
        <div className="mb-6 sm:mb-8">
          <ProfileHeader technician={technician} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {technician.about && (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-500/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold text-white">About Me</h2>
                </div>
                <p className="text-slate-300 leading-relaxed text-lg">{technician.about}</p>
              </div>
            )}

            {technician.experience && (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-500/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2V6" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold text-white">Professional Experience</h2>
                </div>
                <p className="text-slate-300 leading-relaxed text-lg">
                  {/* If experience is just a number, format it nicely */}
                  {/^\d+$/.test(technician.experience.trim()) 
                    ? `${technician.experience} years of professional experience`
                    : technician.experience
                  }
                </p>
              </div>
            )}

            {technician.certifications && (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-yellow-500/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.121c3.845-1.414 8.485-1.414 12.33 0l1.414 1.414c.707.707.707 1.853 0 2.56L12 17.5 2.421 8.095c-.707-.707-.707-1.853 0-2.56l1.414-1.414z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold text-white">Certifications & Qualifications</h2>
                </div>
                <div className="text-slate-300 leading-relaxed text-lg whitespace-pre-line">{technician.certifications}</div>
              </div>
            )}

            {technician.availability && (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-purple-500/30 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-semibold text-white">Availability</h2>
                </div>
                <p className="text-slate-300 leading-relaxed text-lg">{technician.availability}</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Only show appreciation actions if not viewing own profile */}
            {user?.uid !== technician.authUid ? (
              <AppreciationActions
                onThankYou={handleThankYou}
                onSendTOA={async () => {
                  if (!user) {
                    // Save return URL and redirect to main page for authentication
                    const returnUrl = `/${username}`;
                    router.push(`/?returnTo=${encodeURIComponent(returnUrl)}`);
                    return;
                  }

                  try {
                    // Check user's token balance first
                    const tokenBalance = await getUserTokenBalance(user.uid);

                    if (tokenBalance.tokens > 0) {
                      // User has tokens, open send modal
                      setShowTokenSendModal(true);
                    } else {
                      // User has no tokens, open purchase modal
                      setShowTokenPurchaseModal(true);
                    }
                  } catch (error) {
                    logger.error('Error checking token balance:', error);
                    // Fallback to purchase modal on error
                    setShowTokenPurchaseModal(true);
                  }
                }}
                technicianName={technician.name}
              />
            ) : (
              <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/30 shadow-xl">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-3xl">👤</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">This is your profile</h3>
                  <p className="text-slate-300 text-sm">
                    You're viewing your own technician profile. Share your profile link with customers to receive appreciation!
                  </p>
                  <div className="pt-3">
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <span>Go to Dashboard</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <ContactInfo technician={technician} />
          </div>
        </div>
      </main>

      <TokenSendModal
        isOpen={showTokenSendModal}
        onClose={() => setShowTokenSendModal(false)}
        technicianId={technician?.id || ''}
        technicianName={technician?.name || technician?.businessName || ''}
        userId={user?.uid || ''}
      />

      <TokenPurchaseModal
        isOpen={showTokenPurchaseModal}
        onClose={() => setShowTokenPurchaseModal(false)}
        userId={user?.uid || ''}
        onPurchaseSuccess={(tokens) => {
          // After successful purchase, close purchase modal and open send modal
          setShowTokenPurchaseModal(false);
          setShowTokenSendModal(true);
        }}
      />

      <Footer onOpenRegistration={() => {}} />
    </div>
  );
}