"use client";

import { useState } from 'react';

export default function Footer() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const faqData = [
    {
      question: "How does ThankATech work?",
      answer: "ThankATech is a platform where customers can find skilled technicians and show appreciation through thank yous and tips. Technicians register their profiles, and customers can interact with them, view ratings, and send appreciation."
    },
    {
      question: "How do I register as a technician?",
      answer: "Click the 'Register as Technician' button on the main page. You can sign up with Google or email, then complete your business profile with services, rates, and contact information."
    },
    {
      question: "How are ratings calculated?",
      answer: "Ratings start at 3.5 stars and increase based on customer feedback. Thank yous add +0.1 stars each, and tips add +0.2 stars each, up to a maximum of 5.0 stars."
    },
    {
      question: "What are achievement badges?",
      answer: "Achievement badges recognize technicians for milestones like receiving thank yous, tips, high ratings, experience levels, and certifications. They help customers identify top-performing technicians."
    },
    {
      question: "How do tips work?",
      answer: "Customers can send monetary tips to show extra appreciation for excellent service. Tips contribute to higher ratings and achievement badges, helping technicians build their reputation."
    },
    {
      question: "Is ThankATech free to use?",
      answer: "Yes! Registration and basic features are completely free for both technicians and customers. Tips are optional and go directly to the technicians."
    },
    {
      question: "How do I contact a technician?",
      answer: "Use the chat button to send an email or the phone button to call directly. Contact information is displayed on each technician's expanded profile details."
    },
    {
      question: "Can I edit my technician profile?",
      answer: "Yes, registered technicians can update their profiles, business information, rates, and availability at any time through their account dashboard."
    }
  ];

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <footer className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* FAQ Section */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-300 mt-2">Everything you need to know about ThankATech</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {faqData.map((faq, index) => (
            <div 
              key={index}
              className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full text-left p-6 hover:bg-white/5 transition-colors duration-200 flex justify-between items-center"
              >
                <span className="font-semibold text-white pr-4">{faq.question}</span>
                <span className={`text-indigo-400 transition-transform duration-200 ${expandedFAQ === index ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              {expandedFAQ === index && (
                <div className="px-6 pb-6">
                  <p className="text-gray-300 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            
            {/* Company Info */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-xl font-bold">🔧</span>
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  ThankATech
                </h3>
              </div>
              <p className="text-gray-300 mb-4 leading-relaxed">
                Connecting customers with skilled technicians and enabling meaningful appreciation through our innovative platform. 
                Building stronger communities one thank you at a time.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                  <span className="text-lg">📧</span>
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                  <span className="text-lg">📱</span>
                </a>
                <a href="#" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                  <span className="text-lg">🌐</span>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-indigo-400">Quick Links</h4>
              <ul className="space-y-3">
                <li><a href="/" className="text-gray-300 hover:text-white transition-colors">Find Technicians</a></li>
                <li><a href="/#register" className="text-gray-300 hover:text-white transition-colors">Register as Technician</a></li>
                <li><a href="/about" className="text-gray-300 hover:text-white transition-colors">How It Works</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-indigo-400">Support</h4>
              <ul className="space-y-3">
                <li><a href="/contact" className="text-gray-300 hover:text-white transition-colors">Contact Support</a></li>
                <li><a href="/about" className="text-gray-300 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="mailto:support@thankatech.com" className="text-gray-300 hover:text-white transition-colors">Report an Issue</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 bg-black/20">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-gray-400 text-sm">
              © 2025 ThankATech. All rights reserved. Built with ❤️ for amazing technicians.
            </div>
            <div className="flex gap-6 text-sm">
              <a href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}