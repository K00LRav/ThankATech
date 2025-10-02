"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { findTechnicianByUsername } from '../../lib/techniciansApi';
import TokenSendModal from '../../components/TokenSendModal';
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
  const [showTokenSendModal, setShowTokenSendModal] = useState(false);

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
      console.error('Error loading technician:', err);
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
                    <Image
                      src={technician.image}
                      alt={technician.name}
                      width={160}
                      height={160}
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

              {/* Enhanced ThankATech Points Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-6">
                {/* ThankATech Points Balance */}
                <div className="bg-gradient-to-br from-blue-500/30 to-cyan-500/30 backdrop-blur-sm rounded-2xl p-4 text-center border border-blue-400/50 hover:from-blue-500/40 hover:to-cyan-500/40 transition-all duration-300 shadow-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">T</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{technician.points || 0}</div>
                  </div>
                  <div className="text-xs text-blue-200 font-medium">ThankATech Points</div>
                  <div className="text-xs text-blue-300/80 mt-1">${((technician.points || 0) * 0.002).toFixed(4)} value</div>
                </div>

                {/* Thank You Count */}
                <div className="bg-gradient-to-br from-green-500/30 to-emerald-500/30 backdrop-blur-sm rounded-2xl p-4 text-center border border-green-400/50 hover:from-green-500/40 hover:to-emerald-500/40 transition-all duration-300 shadow-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">🙏</span>
                    <div className="text-2xl font-bold text-white">
                      {technician.totalThankYous || 0}
                    </div>
                  </div>
                  <div className="text-xs text-green-200 font-medium">Thank Yous</div>
                  <div className="text-xs text-green-300/80 mt-1">Appreciation received</div>
                </div>

                {/* Achievement Level */}
                <div className="bg-gradient-to-br from-purple-500/30 to-pink-500/30 backdrop-blur-sm rounded-2xl p-4 text-center border border-purple-400/50 hover:from-purple-500/40 hover:to-pink-500/40 transition-all duration-300 shadow-lg lg:col-span-1 col-span-2">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {/* Dynamic badge based on points */}
                    {(() => {
                      const points = technician.points || 0;
                      if (points >= 10000) {
                        return <><span className="text-xl">🏆</span><div className="text-lg font-bold text-white">Master Tech</div></>;
                      } else if (points >= 5000) {
                        return <><span className="text-xl">⭐</span><div className="text-lg font-bold text-white">Expert Pro</div></>;
                      } else if (points >= 2000) {
                        return <><span className="text-xl">🥇</span><div className="text-lg font-bold text-white">Skilled Tech</div></>;
                      } else if (points >= 500) {
                        return <><span className="text-xl">🥈</span><div className="text-lg font-bold text-white">Rising Star</div></>;
                      } else {
                        return <><span className="text-xl">🔰</span><div className="text-lg font-bold text-white">New Tech</div></>;
                      }
                    })()}
                  </div>
                  <div className="text-xs text-purple-200 font-medium">Achievement Level</div>
                  <div className="text-xs text-purple-300/80 mt-1">
                    {technician.totalTips ? `${technician.totalTips} TOA tokens earned` : 'Building reputation'}
                  </div>
                </div>
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
              {(technician.totalThankYous && technician.totalThankYous > 0) && (
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400 text-lg">🙏</span>
                  <span className="text-slate-300 text-sm">Highly appreciated technician</span>
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

                {/* ThankATech Points Reputation Section */}
                <div className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10 backdrop-blur-sm rounded-2xl p-6 border border-blue-400/30 hover:from-blue-500/15 hover:via-purple-500/15 hover:to-cyan-500/15 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">T</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-white">ThankATech Reputation</h2>
                    <div className="ml-auto bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-full px-4 py-2 border border-green-400/30">
                      <span className="text-green-300 font-medium text-sm">
                        {technician.totalThankYous || 0} Thank Yous 🙏
                      </span>
                    </div>
                  </div>

                  {/* Points Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20 hover:bg-white/15 transition-colors">
                      <div className="text-2xl font-bold text-blue-300 mb-1">
                        {technician.points ? Math.floor((technician.points || 0) * 0.4) : 0}
                      </div>
                      <div className="text-xs text-slate-300">Quality Points</div>
                      <div className="text-xs text-blue-400 mt-1">Work Excellence</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20 hover:bg-white/15 transition-colors">
                      <div className="text-2xl font-bold text-green-300 mb-1">
                        {technician.points ? Math.floor((technician.points || 0) * 0.3) : 0}
                      </div>
                      <div className="text-xs text-slate-300">Timeliness Points</div>
                      <div className="text-xs text-green-400 mt-1">On-Time Service</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20 hover:bg-white/15 transition-colors">
                      <div className="text-2xl font-bold text-purple-300 mb-1">
                        {technician.points ? Math.floor((technician.points || 0) * 0.2) : 0}
                      </div>
                      <div className="text-xs text-slate-300">Communication</div>
                      <div className="text-xs text-purple-400 mt-1">Customer Service</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20 hover:bg-white/15 transition-colors">
                      <div className="text-2xl font-bold text-yellow-300 mb-1">
                        {technician.points ? Math.floor((technician.points || 0) * 0.1) : 0}
                      </div>
                      <div className="text-xs text-slate-300">Bonus Points</div>
                      <div className="text-xs text-yellow-400 mt-1">Extra Value</div>
                    </div>
                  </div>

                  {/* Recent Performance Indicators */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Recent Performance</h3>
                      <div className="text-xs text-slate-400">Last 30 days</div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-2">
                          <svg className="w-6 h-6 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="text-sm font-semibold text-white">{technician.totalThankYous || 0}</div>
                        <div className="text-xs text-slate-400">Thank Yous</div>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500/30 to-cyan-500/30 rounded-full flex items-center justify-center mx-auto mb-2">
                          <svg className="w-6 h-6 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="text-sm font-semibold text-white">98%</div>
                        <div className="text-xs text-slate-400">On Time</div>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full flex items-center justify-center mx-auto mb-2">
                          <svg className="w-6 h-6 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div className="text-sm font-semibold text-white">Excellent</div>
                        <div className="text-xs text-slate-400">Communication</div>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-2xl">🙏</span>
                        </div>
                        <div className="text-sm font-semibold text-white">
                          {technician.totalThankYous || 0}
                        </div>
                        <div className="text-xs text-slate-400">Thank Yous</div>
                      </div>
                    </div>
                  </div>

                  {/* Points Earning Info */}
                  <div className="mt-4 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-sm rounded-xl border border-blue-400/20">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-blue-200">How ThankATech Points Work</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Customers earn points for completed jobs and can transfer them to show appreciation. 
                                            Points reflect real value and can be converted to TOA tokens (5 points = 1 TOA = $0.01). 
                      This technician has earned <strong className="text-white">{technician.points || 0} points</strong> through quality service.
                    </p>
                  </div>
                </div>

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

                {/* ThankATech Points Summary */}
                <div className="bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl p-6 border border-cyan-400/30 hover:from-cyan-500/15 hover:via-blue-500/15 hover:to-purple-500/15 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">T</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-white">Points & Appreciation</h2>
                    <div className="ml-auto text-xs text-slate-400">Community Recognition</div>
                  </div>

                  {/* Simple Points Display */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
                      <div className="text-4xl font-bold text-blue-300 mb-2">{technician.points || 0}</div>
                      <div className="text-sm text-slate-300">Total ThankATech Points</div>
                      <div className="text-xs text-blue-400 mt-1">${((technician.points || 0) * 0.01).toFixed(2)} community value</div>
                    </div>
                    <div className="bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
                      <div className="text-4xl font-bold text-green-300 mb-2">{technician.totalThankYous || 0}</div>
                      <div className="text-sm text-slate-300">Thank You Messages</div>
                      <div className="text-xs text-green-400 mt-1">From grateful customers</div>
                    </div>
                  </div>

                  {/* Community Impact */}
                  <div className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-white mb-2">Community Impact</h3>
                      <p className="text-sm text-slate-300 mb-4">
                        This technician contributes to the ThankATech community through quality service and positive interactions.
                      </p>
                      <div className="flex justify-center gap-4 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-green-400">✓</span>
                          <span className="text-slate-300">Verified Professional</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-blue-400">🙏</span>
                          <span className="text-slate-300">Community Member</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-purple-400">💫</span>
                          <span className="text-slate-300">Points Contributor</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Sidebar */}
              <div className="space-y-6">
                {/* TOA Appreciation System */}
                <div className="bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/30 space-y-4 shadow-xl">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">🧡</span>
                    </div>
                    TOA Appreciation
                  </h3>
                  
                  {/* Send TOA Tokens */}
                  <button
                    onClick={() => setShowTokenSendModal(true)}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 group"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="font-bold text-sm">🧡</span>
                      </div>
                      <div className="text-left">
                        <div className="font-bold">Send TOA Tokens</div>
                        <div className="text-xs text-orange-200">You earn 1 point per token sent</div>
                      </div>
                    </div>
                  </button>
                  
                  {/* Quick Thank You */}
                  <button
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 group"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="text-lg">🙏</span>
                      </div>
                      <div className="text-left">
                        <div className="font-bold">Send Thank You</div>
                        <div className="text-xs text-blue-200">Both of you earn 1 point</div>
                      </div>
                    </div>
                  </button>

                  {/* TOA Conversion System */}
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-xl p-4 border border-purple-400/20">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-sm font-medium text-purple-200">Viral Appreciation Cycle</span>
                    </div>
                    
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between p-2 bg-white/10 rounded-lg">
                        <span className="text-xs text-slate-300">Convert Points → TOA</span>
                        <span className="text-xs font-bold text-white">5 Points → 1 TOA</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white/10 rounded-lg">
                        <span className="text-xs text-slate-300">Send Thank You</span>
                        <span className="text-xs font-bold text-green-300">+1 Point Each</span>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-white/10 rounded-lg">
                        <span className="text-xs text-slate-300">Receive TOA Token</span>
                        <span className="text-xs font-bold text-orange-300">+2 Points + Money</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong className="text-purple-200">Appreciation generates more appreciation!</strong> 
                      The more you give, the more points you earn to give even more. 🔄✨
                    </p>
                  </div>
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

      {/* Token Send Modal */}
      <TokenSendModal
        isOpen={showTokenSendModal}
        onClose={() => setShowTokenSendModal(false)}
        technicianId={technician?.id || ''}
        technicianName={technician?.name || technician?.businessName || ''}
        userId="guest" // For now, use guest user ID - will need authentication later
      />

      {/* Standard Footer - Consistent with Main Page */}
      <Footer onOpenRegistration={() => {}} />
    </div>
  );
}