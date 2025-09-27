"use client";

import { useState } from 'react';
import { claimBusiness } from '../lib/firebase';

interface ClaimBusinessProps {
  technician: any;
  onClaimed: () => void;
  onClose: () => void;
}

export default function ClaimBusiness({ technician, onClaimed, onClose }: ClaimBusinessProps) {
  const [formData, setFormData] = useState({
    ownerName: '',
    email: '',
    phone: '',
    verificationCode: '',
    additionalInfo: ''
  });
  const [step, setStep] = useState<'verify' | 'details' | 'submitted'>('verify');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (step === 'verify') {
        // In a real app, you'd send a verification code to the business phone/email
        // For now, we'll just move to the next step
        setStep('details');
      } else if (step === 'details') {
        await claimBusiness(technician.id, {
          ...formData,
          businessName: technician.name,
          businessAddress: technician.address,
          googlePlaceId: technician.placeId,
          claimedAt: new Date()
        });
        setStep('submitted');
        setTimeout(() => {
          onClaimed();
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Claim Your Business</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800">{technician.name}</h3>
          {technician.address && (
            <p className="text-sm text-blue-600">{technician.address}</p>
          )}
        </div>

        {step === 'verify' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
              <p>To claim this business, we need to verify you're the owner.</p>
            </div>

            <div>
              <label htmlFor="ownerName" className="block text-sm font-medium text-gray-700 mb-1">
                Business Owner Name *
              </label>
              <input
                type="text"
                id="ownerName"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Business Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Business Phone *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>
            )}

            <div className="flex space-x-3">
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
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify Ownership'}
              </button>
            </div>
          </form>
        )}

        {step === 'details' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-sm text-green-600 mb-4 bg-green-50 p-3 rounded">
              ✅ Ownership verified! Complete your business profile:
            </div>

            <div>
              <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-700 mb-1">
                Tell customers about your business
              </label>
              <textarea
                id="additionalInfo"
                name="additionalInfo"
                value={formData.additionalInfo}
                onChange={handleInputChange}
                rows={4}
                placeholder="Years of experience, specialties, what makes your service great..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setStep('verify')}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Claiming...' : 'Claim Business'}
              </button>
            </div>
          </form>
        )}

        {step === 'submitted' && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-bold text-green-600 mb-2">Business Claimed!</h3>
            <p className="text-gray-600 mb-4">
              Your business claim has been submitted. You'll receive an email confirmation and 
              can now manage your ThankATech profile.
            </p>
            <button
              onClick={onClaimed}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Great!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}