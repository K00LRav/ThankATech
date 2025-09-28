"use client";

import Link from 'next/link';

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-50">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-6 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
            <span className="text-xl font-bold">🔧</span>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            ThankATech
          </span>
        </Link>
        <Link 
          href="/"
          className="px-6 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white hover:bg-white/20 transition-all duration-200 font-medium"
        >
          Back to Home
        </Link>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-indigo-400 via-blue-400 to-pink-400 bg-clip-text text-transparent mb-6">
            How ThankATech Works
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Connecting customers with skilled technicians and enabling meaningful appreciation through our innovative platform.
          </p>
        </div>

        {/* For Customers Section */}
        <section className="mb-16">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
            <h2 className="text-3xl font-bold text-blue-400 mb-8 text-center">For Customers</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔍</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Find Technicians</h3>
                <p className="text-gray-300">Browse through skilled technicians in your area. Use our search feature to find specialists by category, location, or service type.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📞</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Connect & Hire</h3>
                <p className="text-gray-300">Contact technicians directly through chat or phone. View their profiles, rates, availability, and customer ratings before hiring.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🙏</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Show Appreciation</h3>
                <p className="text-gray-300">Send thank yous and tips to show appreciation for excellent service. Help great technicians build their reputation.</p>
              </div>
            </div>
          </div>
        </section>

        {/* For Technicians Section */}
        <section className="mb-16">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
            <h2 className="text-3xl font-bold text-blue-400 mb-8 text-center">For Technicians</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Create Your Profile</h3>
                <p className="text-gray-300">Register with Google or email. Complete your business profile with services, rates, contact info, and service areas.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💼</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Get Discovered</h3>
                <p className="text-gray-300">Appear in customer searches based on your location and services. Customers can contact you directly through the platform.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⭐</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Build Your Reputation</h3>
                <p className="text-gray-300">Receive thank yous and tips from satisfied customers. Earn achievement badges and higher ratings to attract more business.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Rating System */}
        <section className="mb-16">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
            <h2 className="text-3xl font-bold text-yellow-400 mb-8 text-center">Rating & Achievement System</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-blue-400">How Ratings Work</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
                    All technicians start with a 3.5-star rating
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    Each thank you adds +0.1 stars to your rating
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                    Each tip adds +0.2 stars to your rating
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                    Maximum rating is 5.0 stars
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 text-blue-400">Achievement Badges</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center gap-3">
                    <span className="text-lg">🌟</span>
                    Rising Star - First 5 thank yous
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-lg">💎</span>
                    Top Rated - 4.5+ star rating
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-lg">🏆</span>
                    Customer Favorite - 25+ thank yous
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-lg">👨‍🔧</span>
                    Veteran Tech - 5+ years experience
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-lg">🎓</span>
                    Certified Pro - Has certifications
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Payment Security */}
        <section className="mb-16">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
            <h2 className="text-3xl font-bold text-green-400 mb-8 text-center">Secure Payment Processing</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-blue-400">Bank-Level Security</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    Powered by Stripe - PCI DSS Level 1 certified
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    End-to-end encryption for all transactions
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    We never store your credit card information
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    3D Secure authentication for added protection
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    Real-time fraud detection and prevention
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 text-blue-400">Simple Fee Structure</h3>
                <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                  <div className="text-center mb-4">
                    <span className="text-3xl font-bold text-green-400">$0.99</span>
                    <p className="text-gray-300">Flat platform fee per tip</p>
                  </div>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>✅ Secure payment processing</li>
                    <li>✅ Platform maintenance & security</li>
                    <li>✅ Customer support</li>
                    <li>✅ Fraud protection</li>
                    <li>✅ Regulatory compliance</li>
                  </ul>
                  <p className="text-xs text-gray-400 mt-4 text-center">
                    Technicians receive tips minus the platform fee
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Get Started CTA */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-indigo-500/20 to-blue-800/20 backdrop-blur-sm rounded-2xl border border-white/10 p-12">
            <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of customers and technicians who are building stronger communities through appreciation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-800 rounded-full text-white font-semibold hover:from-indigo-600 hover:to-blue-900 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Find Technicians
              </Link>
              <Link 
                href="/"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white font-semibold hover:bg-white/20 transition-all duration-200"
              >
                Register as Technician
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}




