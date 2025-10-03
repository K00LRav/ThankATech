"use client";

import { useState } from 'react';
import Link from 'next/link';

interface FooterProps {
  onOpenRegistration?: () => void;
}

export default function Footer({ onOpenRegistration }: FooterProps) {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const faqData = [
    {
      question: "How does ThankATech work?",
      answer: "ThankATech is a revolutionary closed-loop appreciation economy where customers find skilled technicians and show appreciation through free thank yous and TOA tokens. Both customers and technicians earn ThankATech Points for every interaction, creating a self-sustaining cycle of appreciation!"
    },
    {
      question: "How do I register as a technician?",
      answer: "Click 'Register as Technician' and sign up with Google or email. You'll need to choose a unique username (mandatory) and complete your business profile with services, rates, and contact information. Your profile will be accessible at thankatech.com/yourusername"
    },
    {
      question: "What are ThankATech Points?",
      answer: "ThankATech Points power our closed-loop economy! Earn 1 point for sending/receiving thank yous, 1 point per TOA token sent, and 2 points per TOA received. Convert 5 points → 1 TOA token to keep the appreciation cycle going without spending money!"
    },
    {
      question: "What are achievement badges?",
      answer: "Achievement badges recognize technicians for milestones like receiving thank yous, TOA tokens, ThankATech Points earned, experience levels, and certifications. They help customers identify top-performing technicians based on community appreciation!"
    },
    {
      question: "How do TOA tokens work?",
      answer: "TOA (Token of Appreciation) is our appreciation currency. Customers buy 1000 TOA for $10, technicians get 85% payout, platform takes 15% fee. Everyone earns ThankATech Points, creating viral appreciation cycles across industries!"
    },
    {
      question: "Is ThankATech free to use?",
      answer: "Yes! Registration, profiles, and thank yous are completely free. TOA tokens are optional ($10 for 1000 tokens) but create a beautiful closed-loop where points convert back to TOA - reducing reliance on purchases and increasing engagement!"
    },
    {
      question: "How does the closed-loop economy work?",
      answer: "1) Send thank you/TOA → earn points, 2) Convert 5 points → 1 TOA, 3) Send TOA → recipient gets money + points, 4) They convert points → more TOA, 5) Cycle continues infinitely! It's customer-funded, self-sustaining appreciation!"
    },
    {
      question: "How do I contact a technician?",
      answer: "Visit their profile at thankatech.com/username or use the chat button to email them directly. Phone contact information is displayed on expanded profile details for registered technicians."
    },
    {
      question: "Can I edit my technician profile?",
      answer: "Yes! Update your profile, business information, rates, availability, profile picture, and even your username through your account dashboard. Your unique profile URL (thankatech.com/yourusername) updates automatically."
    }
  ];

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* FAQ Section */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-300 mt-2">Everything you need to know about ThankATech</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {faqData.map((faq, index) => (
            <div 
              key={index}
              className={`bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden ${
                index === 8 ? 'md:col-start-1 md:col-end-3 md:max-w-md md:mx-auto' : ''
              }`}
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full text-left p-4 hover:bg-white/5 transition-colors duration-200 flex justify-between items-center"
              >
                <span className="font-semibold text-white pr-4">{faq.question}</span>
                <span className={`text-blue-400 transition-transform duration-200 ${expandedFAQ === index ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              {expandedFAQ === index && (
                <div className="px-4 pb-4">
                  <p className="text-gray-300 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid md:grid-cols-4 gap-6">
            
            {/* Company Info */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
                  <span className="text-xl font-bold">🔧</span>
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                  ThankATech
                </h3>
              </div>
              <p className="text-gray-300 mb-3 leading-relaxed">
                Revolutionary closed-loop appreciation economy connecting customers with skilled technicians. Earn ThankATech Points for every appreciation, convert points to TOA tokens, creating endless cycles of gratitude across industries!
              </p>
              <div className="flex gap-4">
                <a 
                  href="mailto:support@thankatech.com" 
                  className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                  title="Email us"
                >
                  <span className="text-lg">📧</span>
                </a>
                <button 
                  disabled
                  className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center opacity-50 cursor-not-allowed"
                  title="Phone number coming soon"
                >
                  <span className="text-lg">📱</span>
                </button>
                <a 
                  href="https://thankatech.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                  title="Visit our website"
                >
                  <span className="text-lg">🌐</span>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-3 text-blue-400">Quick Links</h4>
              <ul className="space-y-3">
                <li><Link href="/" className="text-gray-300 hover:text-white transition-colors">Find Technicians</Link></li>
                <li>
                  <button 
                    onClick={onOpenRegistration}
                    className="text-gray-300 hover:text-white transition-colors text-left"
                  >
                    Register as Technician
                  </button>
                </li>
                <li><Link href="/about" className="text-gray-300 hover:text-white transition-colors">How It Works</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-lg font-semibold mb-3 text-blue-400">Support</h4>
              <ul className="space-y-2">
                <li><Link href="/contact" className="text-gray-300 hover:text-white transition-colors">Contact Support</Link></li>
                <li><Link href="/about" className="text-gray-300 hover:text-white transition-colors">Help Center</Link></li>
                <li><a href="mailto:support@thankatech.com" className="text-gray-300 hover:text-white transition-colors">Report an Issue</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2">
            <div className="text-gray-400 text-sm">
              © 2025 ThankATech. All rights reserved. Built with ❤️ for amazing technicians.
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}




