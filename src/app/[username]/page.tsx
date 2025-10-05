"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../lib/firebase';
import { findTechnicianByUsername } from '../../lib/techniciansApi';
import { sendFreeThankYou } from '../../lib/token-firebase';
import TokenSendModal from '../../components/TokenSendModal';
import Footer from '../../components/Footer';
import { ProfileHeader } from '../../components/ProfileHeader';
import UniversalHeader from '@/components/UniversalHeader';
import { AppreciationActions } from '../../components/AppreciationActions';
import { ContactInfo } from '../../components/ContactInfo';

interface Technician {
  id: string;
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
  const [user] = useAuthState(auth);

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

  useEffect(() => {
    if (username) {
      loadTechnician();
    }
  }, [username, loadTechnician]);

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

  const handleThankYou = async () => {
    if (!user) {
      // Redirect to main page for authentication
      router.push('/');
      return;
    }

    if (!technician) return;

    try {
      const result = await sendFreeThankYou(user.uid, technician.id);
      
      if (!result.success) {
        setError(result.error || 'Failed to send thank you. Please try again.');
        return;
      }
      
      // Update technician's stats locally
      setTechnician(prev => prev ? {
        ...prev,
        totalThankYous: (prev.totalThankYous || 0) + 1,
        points: (prev.points || 0) + 1
      } : null);
      
      // Clear any existing error
      setError(null);
      
    } catch (error) {
      setError('Failed to send thank you. Please try again.');
    }
  };

  const handleSignIn = () => {
    router.push('/');
  };

  const handleRegister = () => {
    router.push('/');
  };

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
        onSignIn={handleSignIn}
        onRegister={handleRegister}
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
                <p className="text-slate-300 leading-relaxed text-lg">{technician.experience}</p>
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
            <AppreciationActions 
              onThankYou={handleThankYou}
              onSendTOA={() => {
                if (!user) {
                  // Redirect to main page for authentication
                  router.push('/');
                  return;
                }
                setShowTokenSendModal(true);
              }}
              technicianName={technician.name}
            />

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

      <Footer onOpenRegistration={() => {}} />
    </div>
  );
}