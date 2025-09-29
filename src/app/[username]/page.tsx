"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { findTechnicianByUsername } from '../../lib/firebase';
import { TipModal } from '../../components/TipModal';
import Footer from '../../components/Footer';

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
  const username = params.username as string;

  const [technician, setTechnician] = useState<Technician | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTipModal, setShowTipModal] = useState(false);

  useEffect(() => {
    if (username) {
      loadTechnician();
    }
  }, [username]);

  const loadTechnician = async () => {
    try {
      setLoading(true);
      const technicianData = await findTechnicianByUsername(username);
      
      if (!technicianData) {
        setError('Technician not found');
        return;
      }

      setTechnician(technicianData);
    } catch (err) {
      console.error('Error loading technician:', err);
      setError('Failed to load technician profile');
    } finally {
      setLoading(false);
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
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-blue-600/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Header */}
      <header className="relative bg-white/10 backdrop-blur-xl border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group cursor-pointer" prefetch={false}>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-xl font-bold">🔧</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent group-hover:text-blue-400 transition-colors">
                ThankATech
              </span>
            </Link>
            
            <div className="text-sm text-blue-200 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
              <span className="hidden sm:inline opacity-70">thankatech.com/</span>
              <span className="font-semibold text-white">{technician.username}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Profile Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl overflow-hidden mb-8">
          {/* Profile Header with Enhanced Glassmorphism */}
          <div className="relative bg-gradient-to-r from-blue-600/60 via-cyan-600/60 to-blue-800/60 backdrop-blur-xl p-8">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/20 rounded-full blur-xl"></div>
            
            <div className="relative flex flex-col lg:flex-row items-center gap-8">
              {/* Enhanced Profile Image */}
              <div className="relative group">
                <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white/40 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-sm shadow-2xl group-hover:scale-105 transition-transform duration-300">
                  {technician.image ? (
                    <img
                      src={technician.image}
                      alt={technician.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/30 to-purple-500/30">
                      <svg className="w-20 h-20 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Online Status Indicator */}
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>

              {/* Enhanced Profile Info */}
              <div className="text-center lg:text-left flex-1 space-y-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent drop-shadow-lg">
                    {technician.name}
                  </h1>
                  <p className="text-2xl text-blue-200 font-medium mb-3">{technician.businessName}</p>
                  {technician.title && (
                    <p className="text-lg text-purple-200 italic">{technician.title}</p>
                  )}
                </div>
                
                {/* Enhanced Tags */}
                <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                  <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium border border-white/30 hover:bg-white/30 transition-colors">
                    🔧 {technician.category}
                  </span>
                  {technician.serviceArea && (
                    <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium border border-white/30 hover:bg-white/30 transition-colors">
                      📍 {technician.serviceArea}
                    </span>
                  )}
                  {technician.experience && (
                    <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium border border-white/30 hover:bg-white/30 transition-colors">
                      ⭐ {technician.experience} experience
                    </span>
                  )}
                  {technician.hourlyRate && (
                    <span className="px-4 py-2 bg-green-500/30 backdrop-blur-sm rounded-full text-white text-sm font-medium border border-green-400/50 hover:bg-green-500/40 transition-colors">
                      💰 {technician.hourlyRate}
                    </span>
                  )}
                </div>
              </div>

              {/* Enhanced Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-6">
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/30 hover:bg-white/30 transition-colors">
                  <div className="text-3xl font-bold text-white mb-1">{technician.points || 0}</div>
                  <div className="text-sm text-blue-200 font-medium">Points</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/30 hover:bg-white/30 transition-colors">
                  <div className="text-3xl font-bold text-white mb-1">{technician.totalThankYous || 0}</div>
                  <div className="text-sm text-blue-200 font-medium">Thank Yous</div>
                </div>
                {technician.totalTips && (
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/30 hover:bg-white/30 transition-colors lg:col-span-1 col-span-2">
                    <div className="text-3xl font-bold text-white mb-1">{technician.totalTips}</div>
                    <div className="text-sm text-blue-200 font-medium">Tips Received</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="bg-white/5 backdrop-blur-sm border-y border-white/10 px-8 py-4">
            <div className="flex flex-wrap justify-center gap-8 text-center">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-slate-300 text-sm">Available for hire</span>
              </div>
              {technician.totalTips && technician.totalTips > 0 && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span className="text-slate-300 text-sm">Highly rated technician</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-slate-300 text-sm">Verified professional</span>
              </div>
            </div>
          </div>

          {/* Enhanced Profile Content */}
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* About Section */}
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

                {/* Professional Experience */}
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

                {/* Certifications & Qualifications */}
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

                {/* Availability Schedule */}
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

              {/* Enhanced Sidebar */}
              <div className="space-y-6">
                {/* Action Buttons */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 space-y-4">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-rose-500 rounded-lg flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </div>
                    Show Appreciation
                  </h3>
                  
                  <button
                    onClick={() => setShowTipModal(true)}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  >
                    <span className="text-xl">💝</span>
                    Send a Tip
                  </button>
                  
                  <button
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  >
                    <span className="text-xl">🙏</span>
                    Say Thank You
                  </button>
                </div>

                {/* Enhanced Contact Information */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    Contact Information
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Business Phone */}
                    {technician.businessPhone && (
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                        <div className="w-8 h-8 bg-green-500/30 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm text-slate-400">Business Phone</div>
                          <a href={`tel:${technician.businessPhone}`} className="text-white hover:text-green-300 transition-colors font-medium">
                            {technician.businessPhone}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Personal Phone */}
                    {technician.phone && technician.phone !== technician.businessPhone && (
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                        <div className="w-8 h-8 bg-blue-500/30 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm text-slate-400">Mobile Phone</div>
                          <a href={`tel:${technician.phone}`} className="text-white hover:text-blue-300 transition-colors font-medium">
                            {technician.phone}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Business Email */}
                    {technician.businessEmail && (
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                        <div className="w-8 h-8 bg-purple-500/30 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm text-slate-400">Business Email</div>
                          <a href={`mailto:${technician.businessEmail}`} className="text-white hover:text-purple-300 transition-colors font-medium break-all">
                            {technician.businessEmail}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Personal Email */}
                    {technician.email && technician.email !== technician.businessEmail && (
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                        <div className="w-8 h-8 bg-cyan-500/30 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm text-slate-400">Personal Email</div>
                          <a href={`mailto:${technician.email}`} className="text-white hover:text-cyan-300 transition-colors font-medium break-all">
                            {technician.email}
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Website */}
                    {technician.website && (
                      <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                        <div className="w-8 h-8 bg-orange-500/30 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm text-slate-400">Website</div>
                          <a href={technician.website} target="_blank" rel="noopener noreferrer" className="text-white hover:text-orange-300 transition-colors font-medium break-all">
                            Visit Website
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Business Address */}
                    {technician.businessAddress && (
                      <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                        <div className="w-8 h-8 bg-red-500/30 rounded-lg flex items-center justify-center mt-0.5">
                          <svg className="w-4 h-4 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm text-slate-400">Business Address</div>
                          <address className="text-white not-italic leading-relaxed">
                            {technician.businessAddress}
                          </address>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Service Details */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.121c3.845-1.414 8.485-1.414 12.33 0l1.414 1.414c.707.707.707 1.853 0 2.56L12 17.5 2.421 8.095c-.707-.707-.707-1.853 0-2.56l1.414-1.414z" />
                      </svg>
                    </div>
                    Service Details
                  </h3>
                  
                  <div className="space-y-3">
                    {technician.hourlyRate && (
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                        <span className="text-slate-300 flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          Rate:
                        </span>
                        <span className="text-white font-semibold">{technician.hourlyRate}</span>
                      </div>
                    )}
                    
                    {technician.serviceArea && (
                      <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                        <span className="text-slate-300 flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Service Area:
                        </span>
                        <span className="text-white font-semibold">{technician.serviceArea}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Tip Modal */}
      {showTipModal && technician && (
        <TipModal
          isOpen={showTipModal}
          technician={{
            id: technician.id,
            name: technician.name,
            businessName: technician.businessName,
            category: technician.category
          }}
          customer={{
            id: 'guest', // For now, we'll use a guest customer
            name: 'Guest User',
            email: ''
          }}
          onClose={() => setShowTipModal(false)}
          onTipSuccess={() => {
            setShowTipModal(false);
            // Optionally reload technician data to update stats
            loadTechnician();
          }}
        />
      )}

      {/* Enhanced Footer */}
      <footer className="relative mt-16 bg-white/5 backdrop-blur-xl border-t border-white/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="text-xl font-bold text-white">ThankATech</span>
            </div>
            <p className="text-slate-300 mb-4">Connecting customers with exceptional service providers</p>
            <div className="flex justify-center gap-6 text-sm text-slate-400">
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="/contact" className="hover:text-white transition-colors">Contact Us</a>
            </div>
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-slate-400 text-sm">
                © 2025 ThankATech. All rights reserved. • 
                <span className="text-blue-400 ml-1">Profile: thankatech.com/{technician.username}</span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}