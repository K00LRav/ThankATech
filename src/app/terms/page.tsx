"use client";

import Link from 'next/link';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Background Animation */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-50">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-6 bg-black/20 backdrop-blur-sm border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-xl font-bold">🔧</span>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
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
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-300 text-lg">
            Last updated: September 27, 2025
          </p>
        </div>

        {/* Terms Content */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 space-y-8">
          
          <section>
            <h2 className="text-2xl font-bold text-indigo-400 mb-4">Agreement to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing or using ThankATech ("Service"), you agree to be bound by these Terms of Service 
              ("Terms"). If you disagree with any part of these terms, then you may not access the Service. 
              These Terms apply to all visitors, users, and others who access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Description of Service</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              ThankATech is a platform that connects customers with skilled technicians and enables appreciation 
              through thank yous and tips. Our Service includes:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
              <li>Technician profile creation and management</li>
              <li>Customer search and discovery of technicians</li>
              <li>Rating and review system</li>
              <li>Thank you and tipping functionality</li>
              <li>Communication facilitation between users</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-green-400 mb-4">User Accounts</h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                To use certain features of our Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your account information</li>
                <li>Keep your account credentials secure and confidential</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">User Conduct</h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">You agree not to:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li>Use the Service for any unlawful purpose or illegal activity</li>
                <li>Post false, misleading, or fraudulent content</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Upload viruses or malicious code</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with the proper functioning of the Service</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Impersonate others or create fake accounts</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-pink-400 mb-4">Technician Responsibilities</h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">If you register as a technician, you agree to:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li>Provide accurate business and professional information</li>
                <li>Maintain appropriate licenses and certifications</li>
                <li>Provide quality services to customers</li>
                <li>Respond to customer inquiries in a timely manner</li>
                <li>Honor quoted prices and agreements</li>
                <li>Follow all applicable laws and industry standards</li>
                <li>Maintain professional conduct at all times</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-indigo-400 mb-4">Customer Responsibilities</h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">If you use our Service as a customer, you agree to:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li>Provide accurate project information and requirements</li>
                <li>Communicate clearly and respectfully with technicians</li>
                <li>Honor agreed-upon terms and payments</li>
                <li>Provide fair and honest feedback</li>
                <li>Verify technician credentials independently when needed</li>
                <li>Follow safety guidelines and recommendations</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Payments and Fees</h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                ThankATech facilitates connections between users but does not process service payments. 
                Payment arrangements are between customers and technicians directly.
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li>Tips sent through our platform are processed securely</li>
                <li>We may charge fees for premium features in the future</li>
                <li>All transactions are subject to applicable taxes</li>
                <li>Refund policies apply to platform fees only</li>
                <li>Service disputes are between customers and technicians</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-green-400 mb-4">Intellectual Property</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              The Service and its original content, features, and functionality are owned by ThankATech and are 
              protected by international copyright, trademark, and other intellectual property laws.
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
              <li>You retain rights to content you post</li>
              <li>You grant us license to use your content on our platform</li>
              <li>Our trademarks and logos may not be used without permission</li>
              <li>Respect intellectual property rights of others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Privacy and Data</h2>
            <p className="text-gray-300 leading-relaxed">
              Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect 
              your information. By using our Service, you agree to the collection and use of information in 
              accordance with our <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300 transition-colors">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-pink-400 mb-4">Disclaimer of Warranties</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              The Service is provided on an "AS IS" and "AS AVAILABLE" basis. ThankATech disclaims all 
              warranties, whether express or implied, including:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
              <li>Warranties of merchantability and fitness for a particular purpose</li>
              <li>Warranties regarding the accuracy or reliability of content</li>
              <li>Warranties that the Service will be uninterrupted or error-free</li>
              <li>Any warranties regarding third-party services or technicians</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-indigo-400 mb-4">Limitation of Liability</h2>
            <p className="text-gray-300 leading-relaxed">
              In no event shall ThankATech be liable for any indirect, incidental, special, consequential, 
              or punitive damages, including loss of profits, data, or goodwill, arising from your use of 
              the Service, even if we have been advised of the possibility of such damages.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Indemnification</h2>
            <p className="text-gray-300 leading-relaxed">
              You agree to indemnify and hold harmless ThankATech from any claims, damages, losses, or 
              expenses arising from your use of the Service, violation of these Terms, or infringement 
              of any rights of another party.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-green-400 mb-4">Termination</h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                We may terminate or suspend your account and access to the Service immediately, without 
                prior notice, for conduct that we believe violates these Terms or is harmful to other 
                users or our business interests.
              </p>
              <p className="text-gray-300 leading-relaxed">
                You may terminate your account at any time by contacting us. Upon termination, your right 
                to use the Service will cease immediately.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Governing Law</h2>
            <p className="text-gray-300 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the United States, 
              without regard to its conflict of law provisions. Any disputes arising from these Terms or your 
              use of the Service shall be resolved through binding arbitration.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-pink-400 mb-4">Changes to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of any material 
              changes by posting the new Terms on this page and updating the "Last updated" date. Your 
              continued use of the Service after such modifications constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-indigo-400 mb-4">Severability</h2>
            <p className="text-gray-300 leading-relaxed">
              If any provision of these Terms is found to be unenforceable or invalid, that provision will 
              be limited or eliminated to the minimum extent necessary so that these Terms will otherwise 
              remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Contact Information</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <ul className="text-gray-300 space-y-2">
                <li><strong>Email:</strong> <a href="mailto:legal@thankatech.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">legal@thankatech.com</a></li>
                <li><strong>Support:</strong> <a href="mailto:support@thankatech.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">support@thankatech.com</a></li>
                <li><strong>Contact Form:</strong> <Link href="/contact" className="text-indigo-400 hover:text-indigo-300 transition-colors">Visit our contact page</Link></li>
              </ul>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}