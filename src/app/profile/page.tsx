'use client';

import React, { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase.js';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface TechnicianProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  businessName: string;
  category: string;
  experience: string;
  certifications: string;
  description: string;
  businessAddress: string;
  website: string;
  businessPhone: string;
  businessEmail: string;
  serviceArea: string;
  hourlyRate: string;
  availability: string;
  photoURL?: string;
  userType: 'technician' | 'customer';
}

export default function EditProfile() {
  const [user, loading, error] = useAuthState(auth);
  const router = useRouter();
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [formData, setFormData] = useState<Partial<TechnicianProfile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      try {
        console.log('Loading profile for user:', user.uid);
        
        // First, try to find the user in the users collection
        let userDoc = await getDoc(doc(db, 'users', user.uid));
        let userData = null;
        
        if (userDoc.exists()) {
          userData = userDoc.data() as TechnicianProfile;
          console.log('Profile data loaded from users collection:', userData);
        } else {
          // If not found in users, check technicians collection by email
          console.log('Not found in users collection, checking technicians collection...');
          const { query, where, getDocs, collection } = await import('firebase/firestore');
          const techniciansQuery = query(
            collection(db, 'technicians'), 
            where('email', '==', user.email)
          );
          const techniciansSnapshot = await getDocs(techniciansQuery);
          
          if (!techniciansSnapshot.empty) {
            const technicianDoc = techniciansSnapshot.docs[0];
            const technicianData = technicianDoc.data();
            console.log('Profile data loaded from technicians collection:', technicianData);
            
            // Convert technician data to user profile format
            userData = {
              uid: user.uid,
              name: technicianData.name || user.displayName || '',
              email: technicianData.email || user.email || '',
              phone: technicianData.phone || '',
              location: technicianData.location || '',
              businessName: technicianData.businessName || '',
              category: technicianData.category || '',
              experience: technicianData.experience || '',
              certifications: technicianData.certifications || '',
              description: technicianData.about || '',
              businessAddress: technicianData.businessAddress || '',
              website: technicianData.website || '',
              businessPhone: technicianData.businessPhone || '',
              businessEmail: technicianData.businessEmail || '',
              serviceArea: technicianData.serviceArea || '',
              hourlyRate: technicianData.hourlyRate || '',
              availability: technicianData.availability || '',
              photoURL: technicianData.image || user.photoURL || '',
              userType: 'technician'
            } as TechnicianProfile;
          }
        }
        
        if (userData) {
          setProfile(userData);
          setFormData(userData);
        } else {
          console.log('No profile document found for user:', user.uid);
          console.log('User info:', { 
            uid: user.uid, 
            email: user.email, 
            displayName: user.displayName,
            photoURL: user.photoURL 
          });
          
          // Create a basic profile structure if none exists
          const basicProfile: Partial<TechnicianProfile> = {
            uid: user.uid,
            name: user.displayName || '',
            email: user.email || '',
            phone: '',
            location: '',
            businessName: '',
            category: '',
            experience: '',
            certifications: '',
            description: '',
            businessAddress: '',
            website: '',
            businessPhone: '',
            businessEmail: '',
            serviceArea: '',
            hourlyRate: '',
            availability: '',
            photoURL: user.photoURL || '',
            userType: 'technician'
          };
          setProfile(basicProfile as TechnicianProfile);
          setFormData(basicProfile);
          setFormError(`Profile not found for user ${user.email}. This might be because:
          
1. You registered recently and the profile wasn't created properly
2. You're signed in with a different account than the one you registered with
3. There was an issue during registration

Please complete your profile information below and click "Save Changes" to create your profile.`);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setFormError('Failed to load profile data: ' + (error instanceof Error ? error.message : 'Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    if (!loading) {
      loadProfile();
    }
  }, [user, loading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setSaveMessage(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    setFormError(null);

    try {
      // Prepare the complete profile data
      const profileData = {
        ...formData,
        uid: user.uid,
        email: user.email,
        photoURL: user.photoURL,
        updatedAt: new Date().toISOString()
      };

      // Try to update first, if that fails, create the document
      try {
        await updateDoc(doc(db, 'users', user.uid), profileData);
        setSaveMessage('Profile updated successfully!');
      } catch (updateError) {
        // If update fails (document doesn't exist), create it
        console.log('Document does not exist, creating new profile...');
        await setDoc(doc(db, 'users', user.uid), {
          ...profileData,
          createdAt: new Date().toISOString()
        });
        setSaveMessage('Profile created successfully!');
      }
      
      setProfile({ ...profile, ...profileData } as TechnicianProfile);
    } catch (error) {
      console.error('Error saving profile:', error);
      setFormError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please sign in to edit your profile</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Profile not found</h1>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-blue-700/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-blue-800/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-blue-300/10 to-blue-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <div className="relative bg-slate-800/50 backdrop-blur border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
              <p className="text-blue-200 mt-1">Update your technician information</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="bg-slate-600 hover:bg-slate-700 text-white px-6 py-2 rounded-xl transition-colors"
              >
                Back to Dashboard
              </Link>
              <Link
                href="/"
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl transition-colors"
              >
                View Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="relative max-w-4xl mx-auto px-4 py-8">
        {/* Status Messages */}
        {saveMessage && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-300 font-medium">{saveMessage}</p>
            </div>
          </div>
        )}

        {formError && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-300 font-medium">{formError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Profile Photo Section */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-4">Profile Photo</h2>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                {formData.photoURL ? (
                  <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-white">
                    {formData.name?.charAt(0) || 'T'}
                  </span>
                )}
              </div>
              <div>
                <p className="text-white font-medium mb-1">Profile Picture</p>
                <p className="text-blue-200 text-sm">
                  {formData.photoURL ? 'Using Google profile photo' : 'Default avatar'}
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
            <h2 className="text-xl font-bold text-white mb-6">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-blue-200 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-blue-200 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-blue-200 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-blue-200 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location || ''}
                  onChange={handleInputChange}
                  placeholder="Atlanta, GA"
                  className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
          </div>

          {/* Business Information */}
          {profile.userType === 'technician' && (
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-6">Business Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-blue-200 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    name="businessName"
                    value={formData.businessName || ''}
                    onChange={handleInputChange}
                    placeholder="ABC Plumbing Services"
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-blue-200 mb-2">
                    Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category || ''}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  >
                    <option className="bg-slate-800 text-white" value="">Select category...</option>
                    <option className="bg-slate-800 text-white" value="plumber">Plumber</option>
                    <option className="bg-slate-800 text-white" value="electrician">Electrician</option>
                    <option className="bg-slate-800 text-white" value="hvac">HVAC Technician</option>
                    <option className="bg-slate-800 text-white" value="mechanic">Auto Mechanic</option>
                    <option className="bg-slate-800 text-white" value="appliance">Appliance Repair</option>
                    <option className="bg-slate-800 text-white" value="handyman">Handyman</option>
                    <option className="bg-slate-800 text-white" value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="businessPhone" className="block text-sm font-medium text-blue-200 mb-2">
                    Business Phone
                  </label>
                  <input
                    type="tel"
                    id="businessPhone"
                    name="businessPhone"
                    value={formData.businessPhone || ''}
                    onChange={handleInputChange}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="businessEmail" className="block text-sm font-medium text-blue-200 mb-2">
                    Business Email
                  </label>
                  <input
                    type="email"
                    id="businessEmail"
                    name="businessEmail"
                    value={formData.businessEmail || ''}
                    onChange={handleInputChange}
                    placeholder="contact@yourbusiness.com"
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-blue-200 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={formData.website || ''}
                    onChange={handleInputChange}
                    placeholder="https://www.yourbusiness.com"
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="hourlyRate" className="block text-sm font-medium text-blue-200 mb-2">
                    Hourly Rate
                  </label>
                  <input
                    type="text"
                    id="hourlyRate"
                    name="hourlyRate"
                    value={formData.hourlyRate || ''}
                    onChange={handleInputChange}
                    placeholder="$75/hour"
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="businessAddress" className="block text-sm font-medium text-blue-200 mb-2">
                    Business Address
                  </label>
                  <input
                    type="text"
                    id="businessAddress"
                    name="businessAddress"
                    value={formData.businessAddress || ''}
                    onChange={handleInputChange}
                    placeholder="123 Main St, Atlanta, GA 30309"
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Professional Details */}
          {profile.userType === 'technician' && (
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-6">Professional Details</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="experience" className="block text-sm font-medium text-blue-200 mb-2">
                      Years of Experience
                    </label>
                    <input
                      type="text"
                      id="experience"
                      name="experience"
                      value={formData.experience || ''}
                      onChange={handleInputChange}
                      placeholder="5 years"
                      className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label htmlFor="serviceArea" className="block text-sm font-medium text-blue-200 mb-2">
                      Service Area
                    </label>
                    <input
                      type="text"
                      id="serviceArea"
                      name="serviceArea"
                      value={formData.serviceArea || ''}
                      onChange={handleInputChange}
                      placeholder="Atlanta Metro Area, within 25 miles"
                      className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="certifications" className="block text-sm font-medium text-blue-200 mb-2">
                    Certifications & Licenses
                  </label>
                  <input
                    type="text"
                    id="certifications"
                    name="certifications"
                    value={formData.certifications || ''}
                    onChange={handleInputChange}
                    placeholder="Licensed Master Plumber, EPA Certified"
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="availability" className="block text-sm font-medium text-blue-200 mb-2">
                    Availability
                  </label>
                  <input
                    type="text"
                    id="availability"
                    name="availability"
                    value={formData.availability || ''}
                    onChange={handleInputChange}
                    placeholder="Monday-Friday 8AM-6PM, Emergency calls 24/7"
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-blue-200 mb-2">
                    Professional Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description || ''}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Tell customers about your services, specialties, what makes you great, your experience, and why they should choose you..."
                    className="w-full px-4 py-3 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Link
              href="/dashboard"
              className="px-8 py-3 border border-blue-500/30 rounded-xl text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-200 font-medium"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="px-8 py-3 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 disabled:opacity-50"
            >
              {isSaving ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </div>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}