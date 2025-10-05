"use client";

import Link from 'next/link';
import UniversalHeader from '@/components/UniversalHeader';

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

      <UniversalHeader currentPath="/about" />

      {/* Main Content */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-indigo-400 via-blue-400 to-pink-400 bg-clip-text text-transparent mb-6">
            How ThankATech Works
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-6">
            Experience the world's first <span className="text-blue-400 font-semibold">closed-loop appreciation economy</span> where your generosity creates more generosity. 
            Every thank you and token of appreciation earns you <span className="text-purple-400 font-semibold">ThankATech Points</span>, 
            which you can convert back into <span className="text-yellow-400 font-semibold">Tokens of Appreciation (TOA)</span> to spread even more kindness.
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-green-400">⚡</span>
              <span>Earn Points</span>
            </div>
            <span>→</span>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">🪙</span>
              <span>Convert to TOA</span>
            </div>
            <span>→</span>
            <div className="flex items-center gap-2">
              <span className="text-purple-400">🔄</span>
              <span>Viral Appreciation</span>
            </div>
          </div>
        </div>

        {/* TOA Cultural Significance Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-emerald-500/10 via-blue-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
            <h2 className="text-3xl font-bold text-center mb-6">
              <span className="bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                🏺 The Meaning Behind TOA
              </span>
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🪙</span>
                </div>
                <h3 className="text-xl font-semibold text-blue-400 mb-3">Token of Appreciation</h3>
                <p className="text-gray-300">Our digital currency for recognizing excellent service and spreading gratitude throughout professional communities.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚔️</span>
                </div>
                <h3 className="text-xl font-semibold text-emerald-400 mb-3">Warrior Spirit (Māori: Toa)</h3>
                <p className="text-gray-300">In Te Reo Māori, "toa" means warrior or brave person - perfectly capturing the courage of skilled technicians who tackle challenges.</p>
              </div>
            </div>
            <div className="text-center mt-8 p-6 bg-white/5 rounded-xl border border-white/10">
              <p className="text-gray-300 italic text-lg">
                "We honor both meanings: appreciating the <span className="text-emerald-400 font-semibold">warriors of professional service</span> who courageously solve problems and keep our world running."
              </p>
              <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">🪙</span>
                  <span>Appreciation Currency</span>
                </div>
                <span>+</span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">⚔️</span>
                  <span>Warrior Recognition</span>
                </div>
                <span>=</span>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">💝</span>
                  <span>Meaningful Gratitude</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* For Customers Section */}
        <section className="mb-16">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
            <h2 className="text-3xl font-bold text-blue-400 mb-8 text-center">For Customers: Earn While You Appreciate</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔍</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Find Technicians</h3>
                <p className="text-gray-300">Browse skilled technicians by category, location, or service type. View ratings, certifications, and customer reviews.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🙏</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Send Thank Yous</h3>
                <p className="text-gray-300">Send free thank you messages to technicians. <span className="text-green-400 font-semibold">Technicians earn 1 Point!</span> Building reputation and kindness together.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🪙</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Send TOA Tokens</h3>
                <p className="text-gray-300">Purchase and send Tokens of Appreciation for exceptional service. <span className="text-green-400 font-semibold">You earn 1 Point, they earn 2 Points (regardless of TOA amount)!</span> Show deeper gratitude.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Convert Points</h3>
                <p className="text-gray-300">Convert 5 ThankATech Points into 1 TOA token. <span className="text-purple-400 font-semibold">Up to 20 conversions daily!</span> Your generosity funds more generosity.</p>
              </div>
            </div>
            <div className="mt-8 p-6 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl border border-white/10">
              <div className="text-center">
                <h4 className="text-lg font-semibold text-yellow-400 mb-2">🔄 The Generosity Loop</h4>
                <p className="text-gray-300">Be generous → Earn points → Convert to TOA → Be more generous → Create viral appreciation cycles!</p>
              </div>
            </div>
          </div>
        </section>

        {/* For Technicians Section */}
        <section className="mb-16">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
            <h2 className="text-3xl font-bold text-blue-400 mb-8 text-center">For Technicians: Get Rewarded & Give Back</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Create Profile</h3>
                <p className="text-gray-300">Register and complete your business profile with services, rates, certifications, and service areas. Join the appreciation economy!</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💝</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Receive Appreciation</h3>
                <p className="text-gray-300">Get thank yous (+1⚡) and TOA tokens (+2⚡ per transaction, not per token). <span className="text-green-400 font-semibold">Earn ThankATech Points for every appreciation!</span> Build reputation together.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💰</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Earn Real Money</h3>
                <p className="text-gray-300">Receive 85% of every TOA token sent to you. <span className="text-yellow-400 font-semibold">$0.0085 per TOA token!</span> Direct to your bank account monthly.</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔄</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">Pay It Forward</h3>
                <p className="text-gray-300">Convert your ThankATech Points to TOA tokens. Appreciate other technicians and spread kindness throughout the community!</p>
              </div>
            </div>
            <div className="mt-8 p-6 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl border border-white/10">
              <div className="text-center">
                <h4 className="text-lg font-semibold text-green-400 mb-2">💡 Pro Tip</h4>
                <p className="text-gray-300">The more you participate in appreciation cycles, the more visible you become! Generous technicians attract more customers.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Points to TOA Conversion System */}
        <section className="mb-16">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
            <h2 className="text-3xl font-bold text-purple-400 mb-8 text-center">ThankATech Points ⚡ → TOA Tokens 🪙</h2>
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-xl font-semibold mb-4 text-green-400">How to Earn Points</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 font-bold">+0</span>
                    <span>Send a thank you message to any technician (free for you)</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center text-green-400 font-bold">+1</span>
                    <span>Receive a thank you message from a customer</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 font-bold">+1</span>
                    <span>Send TOA tokens to appreciate someone</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 font-bold">+2</span>
                    <span>Receive TOA tokens from a customer (regardless of amount)</span>
                  </li>
                </ul>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-xl font-semibold mb-4 text-purple-400">Conversion System</h3>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-purple-400 mb-2">5:1</div>
                  <p className="text-gray-300">5 ThankATech Points = 1 TOA Token</p>
                </div>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                    <span>Maximum 20 conversions per day</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                    <span>Instant conversion process</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                    <span>Use converted TOA immediately</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                    <span>Track conversions in your dashboard</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-white/10">
              <h4 className="text-lg font-semibold text-center text-pink-400 mb-4">🔄 Creating Viral Appreciation Cycles</h4>
              <div className="grid md:grid-cols-4 gap-4 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                    <span className="text-green-400">⚡</span>
                  </div>
                  <span className="text-sm text-gray-300">Earn Points</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-2">
                    <span className="text-purple-400">🔄</span>
                  </div>
                  <span className="text-sm text-gray-300">Convert to TOA</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mb-2">
                    <span className="text-yellow-400">🪙</span>
                  </div>
                  <span className="text-sm text-gray-300">Send Appreciation</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center mb-2">
                    <span className="text-pink-400">♾️</span>
                  </div>
                  <span className="text-sm text-gray-300">Endless Cycle</span>
                </div>
              </div>
              <p className="text-center text-gray-300 mt-4 text-sm">
                The more generous you are, the more points you earn, the more you can give back!
              </p>
            </div>
          </div>
        </section>

        {/* Achievement System */}
        <section className="mb-16">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
            <h2 className="text-3xl font-bold text-yellow-400 mb-8 text-center">Achievement & Recognition System</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-blue-400">ThankATech Points Milestones</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                    Rising Star - Earn 25+ ThankATech Points
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                    Community Star - Earn 50+ ThankATech Points
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                    Point Master - Earn 100+ ThankATech Points
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    Community Champion - Highest point earners
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 text-blue-400">Professional Badges</h3>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-center gap-3">
                    <span className="text-lg">⚡</span>
                    Rising Star - 25+ ThankATech Points
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-lg">✨</span>
                    Community Star - 50+ ThankATech Points
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-lg">🌟</span>
                    Point Master - 100+ ThankATech Points
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-lg">🥉</span>
                    Community Hero - 50+ Thank Yous
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-lg">💎</span>
                    Diamond TOA Earner - 50+ TOA Tokens
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-lg">🧙‍♂️</span>
                    Master Tech - 10+ years experience
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-lg">📜</span>
                    Certified Pro - Has certifications
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Sustainable Economy */}
        <section className="mb-16">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
            <h2 className="text-3xl font-bold text-green-400 mb-8 text-center">Sustainable Appreciation Economy</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-blue-400">Revenue Sharing Model</h3>
                <div className="bg-white/5 rounded-lg p-6 border border-white/10 mb-6">
                  <div className="text-center mb-4">
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <div className="text-center">
                        <span className="text-3xl font-bold text-green-400">85%</span>
                        <p className="text-gray-300 text-sm">To Technicians</p>
                      </div>
                      <span className="text-gray-400">|</span>
                      <div className="text-center">
                        <span className="text-3xl font-bold text-blue-400">15%</span>
                        <p className="text-gray-300 text-sm">Platform Fee</p>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm">Every TOA Token ($0.01)</p>
                  </div>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>✅ Technicians get $0.0085 per TOA token</li>
                    <li>✅ Platform keeps $0.0015 for sustainability</li>
                    <li>✅ No hidden fees or surprise charges</li>
                    <li>✅ Monthly payouts to bank accounts</li>
                  </ul>
                </div>
                <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg p-4 border border-white/10">
                  <h4 className="font-semibold text-green-400 mb-2">🌱 Self-Sustaining System</h4>
                  <p className="text-gray-300 text-sm">
                    Customer generosity funds platform operations, creating a sustainable ecosystem where kindness pays for itself!
                  </p>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 text-blue-400">Bank-Level Security</h3>
                <ul className="space-y-3 text-gray-300 mb-6">
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
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-4 border border-white/10">
                  <h4 className="font-semibold text-purple-400 mb-2">💡 Free Conversions</h4>
                  <p className="text-gray-300 text-sm">
                    Converting ThankATech Points to TOA tokens is completely free! Your earned points create new appreciation without any cost.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Viral Appreciation Cycle */}
        <section className="mb-16">
          <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
            <h2 className="text-3xl font-bold text-center mb-8">
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                🔄 The Viral Appreciation Cycle
              </span>
            </h2>
            <p className="text-xl text-gray-300 text-center mb-12 max-w-3xl mx-auto">
              Discover how every act of gratitude creates a ripple effect, generating more kindness throughout our community.
            </p>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-3xl">🙏</span>
                </div>
                <h3 className="text-lg font-semibold text-green-400 mb-2">1. Show Gratitude</h3>
                <p className="text-gray-300 text-sm">Send thank yous or TOA tokens to appreciate excellent service</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-3xl">⚡</span>
                </div>
                <h3 className="text-lg font-semibold text-purple-400 mb-2">2. Earn Points</h3>
                <p className="text-gray-300 text-sm">Recipients earn ThankATech Points for appreciation received, senders earn points for TOA tokens sent</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-3xl">🔄</span>
                </div>
                <h3 className="text-lg font-semibold text-yellow-400 mb-2">3. Convert & Give</h3>
                <p className="text-gray-300 text-sm">Convert 5 points into 1 TOA token and spread more appreciation</p>
              </div>
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-3xl">♾️</span>
                </div>
                <h3 className="text-lg font-semibold text-pink-400 mb-2">4. Endless Cycle</h3>
                <p className="text-gray-300 text-sm">Recipients use their points to appreciate others, creating viral kindness</p>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-8">
              <h3 className="text-xl font-semibold text-center text-blue-400 mb-6">Real-World Example</h3>
              <div className="grid md:grid-cols-3 gap-6 text-center">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-2xl mb-2">👨‍💼</div>
                  <h4 className="font-semibold text-green-400 mb-2">Customer Sarah</h4>
                  <p className="text-gray-300 text-sm">Sends 5 TOA tokens to Mike for great plumbing work. Sarah gets 1 point, Mike gets 2 points!</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-2xl mb-2">🔧</div>
                  <h4 className="font-semibold text-blue-400 mb-2">Technician Mike</h4>
                  <p className="text-gray-300 text-sm">Converts his points to TOA tokens, appreciates electrician Lisa for referral</p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-2xl mb-2">⚡</div>
                  <h4 className="font-semibold text-purple-400 mb-2">Electrician Lisa</h4>
                  <p className="text-gray-300 text-sm">Uses her points to thank mechanic Bob, who helped her with car troubles</p>
                </div>
              </div>
              <div className="text-center mt-6">
                <p className="text-gray-300 italic">
                  "One customer's generosity sparked appreciation across three different trades!"
                </p>
              </div>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center gap-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full px-8 py-4 border border-white/10">
                <span className="text-2xl">🌊</span>
                <div className="text-left">
                  <div className="font-semibold text-purple-400">Create Your Ripple Effect</div>
                  <div className="text-gray-300 text-sm">Every thank you starts a chain reaction of kindness</div>
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




