"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { registerUser, registerTechnician, isUsernameTaken, generateUsernameSuggestions, validateUsername } from '../lib/firebase';
import { TECHNICIAN_CATEGORIES, getSubcategoriesForCategory } from '../lib/categories';
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
    username: '', // New username field
    // Technician-specific fields
    businessName: '',
    category: '',
    subcategory: '',
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
  
  // Username validation states
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Handle username validation
    if (name === 'username') {
      handleUsernameChange(value);
    }
  };

  const handleUsernameChange = async (username: string) => {
    if (!username.trim()) {
      setUsernameStatus('idle');
      setUsernameError(null);
      setUsernameSuggestions([]);
      return;
    }

    // Validate format first
    const validation = validateUsername(username);
    if (!validation.isValid) {
      setUsernameStatus('invalid');
      setUsernameError(validation.error);
      setUsernameSuggestions([]);
      return;
    }

    // Check availability
    setUsernameStatus('checking');
    setUsernameError(null);
    
    try {
      const isTaken = await isUsernameTaken(username);
      
      if (isTaken) {
        setUsernameStatus('taken');
        setUsernameError('This username is already taken');
        
        // Generate suggestions
        const suggestions = await generateUsernameSuggestions(username);
        setUsernameSuggestions(suggestions);
      } else {
        setUsernameStatus('available');
        setUsernameError(null);
        setUsernameSuggestions([]);
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameStatus('invalid');
      setUsernameError('Error checking username availability');
      setUsernameSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setFormData(prev => ({ ...prev, username: suggestion }));
    handleUsernameChange(suggestion);
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

    // Validate username for technicians
    if (userType === 'technician') {
      if (!formData.username.trim()) {
        setError('Username is required for technicians');
        setLoading(false);
        return;
      }
      
      if (usernameStatus !== 'available') {
        setError('Please choose an available username');
        setLoading(false);
        return;
      }
    }

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
          username: formData.username,
          businessName: formData.businessName,
          category: formData.category,
          subcategory: formData.subcategory,
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
                <Image 
                  src={googleUser.photoURL} 
                  alt="Profile" 
                  width={48}
                  height={48}
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

          {/* Username Field - Only for technicians */}
          {userType === 'technician' && (
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-blue-200 mb-1">
                Username * <span className="text-xs text-blue-300">(will be your profile URL: thankatech.com/username)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., johnplumber, techexpert, mikeelectric"
                  className={`w-full px-3 py-2 pr-10 border rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 transition-all duration-200 ${
                    usernameStatus === 'checking' ? 'border-yellow-400 focus:ring-yellow-400' :
                    usernameStatus === 'available' ? 'border-green-400 focus:ring-green-400' :
                    usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-400 focus:ring-red-400' :
                    'border-blue-500/30 focus:ring-blue-400'
                  } focus:border-transparent`}
                />
                
                {/* Status Icon */}
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {usernameStatus === 'checking' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                  )}
                  {usernameStatus === 'available' && (
                    <svg className="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                    <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              </div>
              
              {/* Username Status Messages */}
              {usernameError && (
                <p className="mt-1 text-sm text-red-300">{usernameError}</p>
              )}
              {usernameStatus === 'available' && (
                <p className="mt-1 text-sm text-green-300">✓ Username is available!</p>
              )}
              
              {/* Username Suggestions */}
              {usernameSuggestions.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-blue-200 mb-2">Try these suggestions:</p>
                  <div className="flex flex-wrap gap-2">
                    {usernameSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-3 py-1 text-xs bg-blue-500/30 hover:bg-blue-500/50 text-blue-200 rounded-full transition-colors duration-200"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
                    <option className="bg-slate-800 text-white" value="">Select main category...</option>
                    {TECHNICIAN_CATEGORIES.map((category) => (
                      <option key={category.id} className="bg-slate-800 text-white" value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Subcategory Selection */}
                {formData.category && (
                  <div>
                    <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-1">
                      Specialization <span className="text-gray-500">(Optional)</span>
                    </label>
                    <select
                      id="subcategory"
                      name="subcategory"
                      value={formData.subcategory}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-blue-500/30 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                    >
                      <option className="bg-slate-800 text-white" value="">Select specialization...</option>
                      {getSubcategoriesForCategory(formData.category).map((subcategory) => (
                        <option key={subcategory} className="bg-slate-800 text-white" value={subcategory}>
                          {subcategory}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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

          <div className="flex space-x-3 pt-6 pb-6">
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




