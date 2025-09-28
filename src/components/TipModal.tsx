import React, { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe, formatCurrency, dollarsToCents, calculatePlatformFee, calculateTechnicianPayout } from '@/lib/stripe';
import { recordTransaction } from '../lib/firebase';

const stripePromise = getStripe();

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  technician: {
    id: string;
    name: string;
    businessName: string;
    category: string;
  };
  customerId: string;
}

const TipForm: React.FC<Omit<TipModalProps, 'isOpen' | 'onClose'> & { onClose: () => void }> = ({
  technician,
  customerId,
  onClose,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const presetAmounts = [5, 10, 20, 50, 100];

  const getCurrentAmount = () => {
    if (isCustom) {
      const parsed = parseFloat(customAmount);
      return isNaN(parsed) ? 0 : parsed;
    }
    return amount;
  };

  const currentAmountCents = dollarsToCents(getCurrentAmount());
  const platformFee = calculatePlatformFee(currentAmountCents);
  const technicianPayout = calculateTechnicianPayout(currentAmountCents);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    const currentAmount = getCurrentAmount();
    if (currentAmount < 1 || currentAmount > 500) {
      setError('Amount must be between $1.00 and $500.00');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: dollarsToCents(currentAmount),
          technicianId: technician.id,
          customerId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret } = await response.json();

      // Confirm payment
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        setError(error.message || 'Payment failed');
      } else if (paymentIntent?.status === 'succeeded') {
        // Record the successful transaction in Firebase
        try {
          await recordTransaction({
            technicianId: technician.id,
            customerId: customerId,
            amount: dollarsToCents(currentAmount), // Store in cents
            paymentIntentId: paymentIntent.id,
            technicianName: technician.name,
            customerNote: '', // Could add a note field later
          });
          
          // Payment successful and recorded!
          alert(`Thank you! Your ${formatCurrency(dollarsToCents(currentAmount))} tip has been sent to ${technician.name}!`);
          onClose();
        } catch (recordError) {
          console.error('Failed to record transaction:', recordError);
          // Still show success since payment went through
          alert(`Thank you! Your ${formatCurrency(dollarsToCents(currentAmount))} tip has been sent to ${technician.name}!`);
          onClose();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-2xl font-bold text-white mb-2">
          Send a Tip to {technician.name}
        </h3>
        <p className="text-blue-200">
          {technician.businessName} • {technician.category}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Amount Selection */}
        <div>
          <label className="block text-sm font-medium text-blue-200 mb-3">
            Choose Tip Amount
          </label>
          
          {/* Preset Amounts */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {presetAmounts.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setAmount(preset);
                  setIsCustom(false);
                  setError('');
                }}
                className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                  !isCustom && amount === preset
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-white/10 text-blue-200 hover:bg-white/20'
                }`}
              >
                ${preset}
              </button>
            ))}
            
            {/* Custom Amount Button */}
            <button
              type="button"
              onClick={() => {
                setIsCustom(true);
                setError('');
              }}
              className={`py-3 px-4 rounded-xl font-semibold transition-all ${
                isCustom
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white/10 text-blue-200 hover:bg-white/20'
              }`}
            >
              Custom
            </button>
          </div>

          {/* Custom Amount Input */}
          {isCustom && (
            <div className="mb-4">
              <input
                type="number"
                min="1"
                max="500"
                step="0.01"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setError('');
                }}
                placeholder="Enter amount"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          )}
        </div>

        {/* Fee Breakdown */}
        {getCurrentAmount() > 0 && (
          <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-blue-200">
              <span>Tip Amount:</span>
              <span>{formatCurrency(currentAmountCents)}</span>
            </div>
            <div className="flex justify-between text-blue-300">
              <span>ThankATech Platform Fee:</span>
              <span>{formatCurrency(platformFee)}</span>
            </div>
            <div className="flex justify-between font-semibold text-green-300 border-t border-white/20 pt-2">
              <span>Technician Receives:</span>
              <span>{formatCurrency(technicianPayout)}</span>
            </div>
          </div>
        )}

        {/* Card Input */}
        <div>
          <label className="block text-sm font-medium text-blue-200 mb-3">
            Payment Method
          </label>
          <div className="bg-white/10 rounded-xl p-4 border border-white/20">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#ffffff',
                    '::placeholder': {
                      color: '#93c5fd',
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!stripe || isProcessing || getCurrentAmount() < 1}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold py-4 rounded-xl transition-all shadow-lg disabled:opacity-50"
        >
          {isProcessing
            ? 'Processing...'
            : `Send ${formatCurrency(currentAmountCents)} Tip`}
        </button>
      </form>
    </div>
  );
};

export const TipModal: React.FC<TipModalProps> = ({ isOpen, onClose, technician, customerId }) => {
  if (!isOpen) return null;

  // Check if Stripe is configured
  const isStripeConfigured = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  if (!isStripeConfigured) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/60 to-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-gradient-to-br from-slate-800/90 to-blue-900/90 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full p-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white mb-4">Payment System Coming Soon!</h3>
            <p className="text-blue-200 mb-6">
              We're working on integrating secure payments. For now, you can send a thank you message!
            </p>
            <button
              onClick={onClose}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/60 to-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-slate-800/90 to-blue-900/90 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <div className="flex justify-end p-4 pb-0">
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <Elements stripe={stripePromise}>
          <TipForm technician={technician} customerId={customerId} onClose={onClose} />
        </Elements>
      </div>
    </div>
  );
};