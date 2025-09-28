"use client";

import { useState } from 'react';
import { registerUser, registerTechnician } from '../lib/firebase';
import GoogleSignIn from './GoogleSignIn';

interface RegistrationProps {
  onRegistrationComplete: (user: any) => void;
  onClose: () => void;
}

export default function Registration({ onRegistrationComplete, onClose }: RegistrationProps) {
  const [userType, setUserType] = useState<'customer' | 'technician'>('customer');
  const [showGoogleOptions, setShowGoogleOptions] = useState(true);
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    location: '',
    // Technician-specific fields
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
    availability: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGoogleSignInSuccess = (result: any) => {
    if (!result.isNewUser) {
      // User already exists, sign them in (no welcome message)
      onRegistrationComplete({ ...result.user, isNewUser: false });
    } else {
      // New user, pre-fill form with Google data and continue registration
      setGoogleUser(result.firebaseUser);
      setFormData(prev => ({
        ...prev,
        name: result.user.name || '',
        email: result.user.email || ''
      }));
      setShowGoogleOptions(false);
    }
  };

  const handleGoogleSignInError = (error: string) => {
    setError(error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate passwords for manual registration
    if (!googleUser) {
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        setLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
    }

    try {
      let result;
      
      const userData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        // Include password for manual registration
        ...(!googleUser && { password: formData.password }),
        // Include Google user data if available
        ...(googleUser && {
          uid: googleUser.uid,
          photoURL: googleUser.photoURL,
          googleSignIn: true
        })
      };
      
      if (userType === 'customer') {
        // Register as customer
        result = await registerUser({
          ...userData,
          userType: 'customer'
        });
      } else {
        // Register as technician
        result = await registerTechnician({
          ...userData,
          businessName: formData.businessName,
          category: formData.category,
          experience: formData.experience,
          certifications: formData.certifications,
          description: formData.description,
          businessAddress: formData.businessAddress,
          website: formData.website,
          businessPhone: formData.businessPhone,
          businessEmail: formData.businessEmail,
          serviceArea: formData.serviceArea,
          hourlyRate: formData.hourlyRate,
          availability: formData.availability,
          userType: 'technician'
        });
      }
      
      onRegistrationComplete({ ...result, isNewUser: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/60 to-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      {/* Animated background elements matching main page */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-blue-700/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-blue-800/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-blue-300/10 to-blue-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      
      <div className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-blue-500/20 backdrop-blur-sm">
        {/* ThankATech Header */}
        <div className="text-center mb-6 px-6 pt-6">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent mb-2">
            ThankATech
          </div>
          <h2 className="text-lg font-semibold text-white">
            {showGoogleOptions ? 'Join ThankATech' : `Complete Your ${userType === 'customer' ? 'Customer' : 'Technician'} Profile`}
          </h2>
        </div>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-blue-200 hover:text-white text-2xl p-2 hover:bg-white/10 rounded-full transition-colors duration-200"
        >
          ✕
        </button>

        {/* Google Sign-In Section */}
        {showGoogleOptions && (
          <div className="mb-6 px-6">
            <div className="text-center mb-4">
              <GoogleSignIn 
                onSignInSuccess={handleGoogleSignInSuccess}
                onError={handleGoogleSignInError}
              />
              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-blue-500/30"></div>
                <div className="px-3 text-blue-200 text-sm">or sign up manually</div>
                <div className="flex-1 border-t border-blue-500/30"></div>
              </div>
            </div>
          </div>
        )}

        {/* Google User Info */}
        {googleUser && (
          <div className="mb-4 mx-6 p-4 bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-xl shadow-sm">
            <div className="flex items-center space-x-3">
              {googleUser.photoURL && (
                <img 
                  src={googleUser.photoURL} 
                  alt="Profile" 
                  className="w-12 h-12 rounded-full border-2 border-green-400/50 shadow-sm"
                />
              )}
              <div>
                <p className="font-semibold text-green-300">✓ Signed in with Google</p>
                <p className="text-sm text-green-200">{googleUser.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* User Type Selection */}
        <div className="mb-8 px-6">
          <h3 className="text-lg font-semibold mb-4 text-white">I want to join as a:</h3>
          <div className="flex space-x-4 py-2">
            <button
              type="button"
              onClick={() => setUserType('customer')}
              className={`flex-1 p-4 rounded-xl backdrop-blur-sm border-2 text-center transition-all duration-200 hover:shadow-lg hover:border-blue-300 ${
                userType === 'customer' 
                  ? 'border-blue-400 bg-blue-500/20 text-blue-300 shadow-lg' 
                  : 'border-blue-500/30 bg-white/10 hover:border-blue-400 hover:bg-blue-500/10 text-blue-200'
              }`}
            >
              <div className="text-3xl mb-2">👤</div>
              <div className="font-semibold">Customer</div>
              <div className="text-sm text-blue-300">Thank and tip technicians</div>
            </button>
            
            <button
              type="button"
              onClick={() => setUserType('technician')}
              className={`flex-1 p-4 rounded-xl backdrop-blur-sm border-2 text-center transition-all duration-200 hover:shadow-lg hover:border-green-300 ${
                userType === 'technician' 
                  ? 'border-green-400 bg-green-500/20 text-green-300 shadow-lg' 
                  : 'border-blue-500/30 bg-white/10 hover:border-green-400 hover:bg-green-500/10 text-blue-200'
              }`}
            >
              <div className="text-3xl mb-2">🔧</div>
              <div className="font-semibold">Technician</div>
              <div className="text-sm text-green-300">Receive thanks and tips</div>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6">
          {/* Basic Info for Everyone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-blue-200 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-blue-200 mb-1">
                Email * {googleUser && <span className="text-green-300 text-xs">(from Google)</span>}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                readOnly={!!googleUser}
                className={`w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ${
                  googleUser ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>

          {/* Password Fields - Only show for manual registration */}
          {!googleUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-blue-200 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required={!googleUser}
                  minLength={6}
                  className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-blue-200 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required={!googleUser}
                  minLength={6}
                  className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  placeholder="Confirm your password"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                Location (City, State)
              </label>
              <input
                type="text"
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Atlanta, GA"
                className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Technician-Specific Fields */}
          {userType === 'technician' && (
            <div className="border-t pt-4 mt-4">
              <h4 className="text-lg font-semibold mb-3 text-green-700">Technician Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    required={userType === 'technician'}
                    placeholder="ABC Plumbing Services"
                    className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                    Service Category *
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required={userType === 'technician'}
                    className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  >
                    <option className="bg-slate-800 text-white" value="">Select category...</option>
                    <option className="bg-slate-800 text-white" value="plumbing">Plumber</option>
                    <option className="bg-slate-800 text-white" value="electrical">Electrician</option>
                    <option className="bg-slate-800 text-white" value="hvac">HVAC Technician</option>
                    <option className="bg-slate-800 text-white" value="automotive">Auto Mechanic</option>
                    <option className="bg-slate-800 text-white" value="appliance">Appliance Repair</option>
                    <option className="bg-slate-800 text-white" value="handyman">Handyman</option>
                    <option className="bg-slate-800 text-white" value="computer">Computer Technician</option>
                    <option className="bg-slate-800 text-white" value="locksmith">Locksmith</option>
                    <option className="bg-slate-800 text-white" value="contractor">General Contractor</option>
                    <option className="bg-slate-800 text-white" value="roofing">Roofing Contractor</option>
                    <option className="bg-slate-800 text-white" value="landscaping">Landscaping</option>
                    <option className="bg-slate-800 text-white" value="cleaning">House Cleaning</option>
                    <option className="bg-slate-800 text-white" value="painting">Painting</option>
                    <option className="bg-slate-800 text-white" value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">
                  Years of Experience
                </label>
                <input
                  type="text"
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  placeholder="5 years"
                  className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="certifications" className="block text-sm font-medium text-gray-700 mb-1">
                  Certifications/Licenses
                </label>
                <input
                  type="text"
                  id="certifications"
                  name="certifications"
                  value={formData.certifications}
                  onChange={handleInputChange}
                  placeholder="Licensed Master Plumber, EPA Certified"
                  className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  Business Address *
                </label>
                <input
                  type="text"
                  id="businessAddress"
                  name="businessAddress"
                  value={formData.businessAddress}
                  onChange={handleInputChange}
                  required={userType === 'technician'}
                  placeholder="123 Main St, Atlanta, GA 30309"
                  className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="businessPhone" className="block text-sm font-medium text-gray-700 mb-1">
                    Business Phone *
                  </label>
                  <input
                    type="tel"
                    id="businessPhone"
                    name="businessPhone"
                    value={formData.businessPhone}
                    onChange={handleInputChange}
                    required={userType === 'technician'}
                    placeholder="(555) 123-4567"
                    className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="businessEmail" className="block text-sm font-medium text-gray-700 mb-1">
                    Business Email *
                  </label>
                  <input
                    type="email"
                    id="businessEmail"
                    name="businessEmail"
                    value={formData.businessEmail}
                    onChange={handleInputChange}
                    required={userType === 'technician'}
                    placeholder="contact@yourbusiness.com"
                    className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    id="website"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://www.yourbusiness.com"
                    className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate
                  </label>
                  <input
                    type="text"
                    id="hourlyRate"
                    name="hourlyRate"
                    value={formData.hourlyRate}
                    onChange={handleInputChange}
                    placeholder="$75/hour"
                    className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="serviceArea" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Area
                </label>
                <input
                  type="text"
                  id="serviceArea"
                  name="serviceArea"
                  value={formData.serviceArea}
                  onChange={handleInputChange}
                  placeholder="Atlanta Metro Area, within 25 miles"
                  className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-1">
                  Availability
                </label>
                <input
                  type="text"
                  id="availability"
                  name="availability"
                  value={formData.availability}
                  onChange={handleInputChange}
                  placeholder="Monday-Friday 8AM-6PM, Emergency calls 24/7"
                  className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  About Your Services *
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required={userType === 'technician'}
                  rows={4}
                  placeholder="Tell customers about your services, specialties, what makes you great, your experience, and why they should choose you..."
                  className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>
          )}

          <div className="flex space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-blue-500/30 rounded-xl text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-6 py-3 text-white rounded-xl font-semibold transition-all duration-200 hover:shadow-xl disabled:opacity-50 shadow-lg ${
                userType === 'customer' 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Joining...</span>
                </div>
              ) : (
                `Join as ${userType === 'customer' ? 'Customer' : 'Technician'}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}




