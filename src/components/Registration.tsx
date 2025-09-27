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
      // User already exists, sign them in
      onRegistrationComplete(result.user);
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

    try {
      let result;
      
      const userData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
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
      
      onRegistrationComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">
            {showGoogleOptions ? 'Join ThankATech' : `Complete Your ${userType === 'customer' ? 'Customer' : 'Technician'} Profile`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Google Sign-In Section */}
        {showGoogleOptions && (
          <div className="mb-6">
            <div className="text-center mb-4">
              <GoogleSignIn 
                onSignInSuccess={handleGoogleSignInSuccess}
                onError={handleGoogleSignInError}
              />
              <div className="flex items-center my-4">
                <div className="flex-1 border-t border-gray-300"></div>
                <div className="px-3 text-gray-500 text-sm">or sign up manually</div>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>
            </div>
          </div>
        )}

        {/* Google User Info */}
        {googleUser && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              {googleUser.photoURL && (
                <img 
                  src={googleUser.photoURL} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div>
                <p className="font-medium text-green-800">Signed in with Google</p>
                <p className="text-sm text-green-600">{googleUser.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* User Type Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">I want to join as a:</h3>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setUserType('customer')}
              className={`flex-1 p-4 rounded-lg border-2 text-center transition-colors ${
                userType === 'customer' 
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-2xl mb-2">👤</div>
              <div className="font-semibold">Customer</div>
              <div className="text-sm text-gray-600">Thank and tip technicians</div>
            </button>
            
            <button
              type="button"
              onClick={() => setUserType('technician')}
              className={`flex-1 p-4 rounded-lg border-2 text-center transition-colors ${
                userType === 'technician' 
                  ? 'border-green-500 bg-green-50 text-green-700' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="text-2xl mb-2">🔧</div>
              <div className="font-semibold">Technician</div>
              <div className="text-sm text-gray-600">Receive thanks and tips</div>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info for Everyone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email * {googleUser && <span className="text-green-600 text-xs">(from Google)</span>}
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                readOnly={!!googleUser}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  googleUser ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>

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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select category...</option>
                    <option value="plumber">Plumber</option>
                    <option value="electrician">Electrician</option>
                    <option value="hvac">HVAC Technician</option>
                    <option value="mechanic">Auto Mechanic</option>
                    <option value="appliance">Appliance Repair</option>
                    <option value="handyman">Handyman</option>
                    <option value="other">Other</option>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 text-white rounded-md hover:opacity-90 disabled:opacity-50 ${
                userType === 'customer' ? 'bg-indigo-600' : 'bg-green-600'
              }`}
            >
              {loading ? 'Joining...' : `Join as ${userType === 'customer' ? 'Customer' : 'Technician'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}