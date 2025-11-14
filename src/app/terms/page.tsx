"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { auth, getTechnician, getClient } from '@/lib/firebase';
import UniversalHeader from '@/components/UniversalHeader';
import { logger } from '@/lib/logger';

export default function Terms() {
  const router = useRouter();
  const [user] = useAuthState(auth);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Fetch full user profile from Firestore
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        try {
          // Try to get user data from either technicians or users collection
          let userData: any = await getTechnician(user.uid);
          if (!userData) {
            userData = await getClient(user.uid);
          }

          if (userData) {
            setCurrentUser({
              id: userData.id,
              name: userData.name || userData.displayName || user.displayName,
              email: userData.email || user.email,
              photoURL: userData.photoURL || user.photoURL,
              userType: userData.userType || 'client'
            });
          } else {
            // Fallback to Firebase auth data
            setCurrentUser({
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              photoURL: user.photoURL || undefined
            });
          }
        } catch (error) {
          logger.error('Error loading user profile:', error);
          // Fallback to Firebase auth data
          setCurrentUser({
            id: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            photoURL: user.photoURL || undefined
          });
        }
      } else {
        setCurrentUser(null);
      }
    };

    loadUserProfile();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      logger.error('Error signing out:', error);
    }
  };

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

      <UniversalHeader 
        currentPath="/terms"
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onSignIn={() => router.push('/')}
        onRegister={() => router.push('/')}
      />

      {/* Main Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-400 via-blue-400 to-pink-400 bg-clip-text text-transparent mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-300 text-lg">
            Last updated: October 2, 2025
          </p>
        </div>

        {/* Terms Content */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 space-y-8">
          
          <section>
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Agreement to Terms</h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing or using ThankATech (&quot;Service&quot;), you agree to be bound by these Terms of Service 
              (&quot;Terms&quot;). If you disagree with any part of these terms, then you may not access the Service. 
              These Terms apply to all visitors, users, and others who access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Description of Service</h2>
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
            <h2 className="text-2xl font-bold text-red-400 mb-4">Platform Administration and Oversight</h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                ThankATech maintains administrative oversight of the platform to ensure quality, security, and compliance:
              </p>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Administrative Rights</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li><strong>Account Management:</strong> ThankATech may review, suspend, or terminate user accounts for Terms violations</li>
                  <li><strong>Content Moderation:</strong> We reserve the right to review, edit, or remove user-generated content</li>
                  <li><strong>Data Access:</strong> Authorized personnel may access user data for support, security, and compliance purposes</li>
                  <li><strong>Transaction Oversight:</strong> We monitor payments and tips for fraud prevention and compliance</li>
                  <li><strong>Platform Statistics:</strong> We collect and analyze platform usage data for operational improvements</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Administrative Tools and Functions</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li><strong>User Support:</strong> Password reset assistance and account recovery services</li>
                  <li><strong>Email Communications:</strong> Ability to send platform updates, notifications, and support messages</li>
                  <li><strong>Data Management:</strong> Database maintenance, backup, and recovery operations</li>
                  <li><strong>Security Monitoring:</strong> Fraud detection, security incident response, and system monitoring</li>
                  <li><strong>Compliance Reporting:</strong> Generation of reports for legal and regulatory requirements</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Data Protection and Privacy</h3>
                <p className="text-gray-300 leading-relaxed">
                  All administrative access to user data is governed by our Privacy Policy and is limited to authorized 
                  personnel for legitimate business purposes including customer support, fraud prevention, and legal compliance.
                </p>
              </div>
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
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Customer Responsibilities</h2>
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
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Points System, TOA Tokens, and Platform Fees</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">ThankATech Points System</h3>
                <p className="text-gray-300 leading-relaxed mb-2">
                  ThankATech operates a points-based appreciation system where users can earn and display points:
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li><strong>Earning Points:</strong> Users receive points when they receive appreciation through our platform</li>
                  <li><strong>Point Display:</strong> Points are displayed on user profiles as a measure of community appreciation</li>
                  <li><strong>No Cash Value:</strong> Points have no monetary value and cannot be redeemed for cash or services</li>
                  <li><strong>Recognition System:</strong> Points serve as a reputation and recognition mechanism within the ThankATech community</li>
                  <li><strong>Point Calculation:</strong> Points are awarded based on appreciation received from other users</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">TOA (Token of Appreciation) System</h3>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-4">
                  <p className="text-gray-300 leading-relaxed mb-2">
                    <strong>TOA Tokens</strong> are digital tokens that can be purchased and sent to technicians as appreciation:
                  </p>
                  <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                    <li><strong>Token Purchase:</strong> Customers can purchase TOA tokens through secure payment processing</li>
                    <li><strong>Token Value:</strong> Each TOA token has a predetermined monetary value set by ThankATech</li>
                    <li><strong>Token Transfer:</strong> TOA tokens can be sent to technicians as digital appreciation</li>
                    <li><strong>Token Redemption:</strong> Technicians can convert received TOA tokens to monetary payouts</li>
                    <li><strong>Transaction Record:</strong> All TOA token transactions are recorded and receipted</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Service Payments</h3>
                <p className="text-gray-300 leading-relaxed">
                  ThankATech facilitates connections between users but does not process service payments directly. 
                  Payment arrangements for services are between customers and technicians directly.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Tips and Appreciation Payments</h3>
                <p className="text-gray-300 leading-relaxed mb-2">
                  Tips and TOA tokens sent through our platform are processed securely using Stripe, Inc. as our payment processor:
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li><strong>Payment Processing:</strong> All tip and TOA token transactions are handled by Stripe with bank-level security</li>
                  <li><strong>Supported Payment Methods:</strong> Credit cards, debit cards, and other methods supported by Stripe</li>
                  <li><strong>Transaction Security:</strong> PCI DSS Level 1 compliance and end-to-end encryption</li>
                  <li><strong>Receipt Generation:</strong> Automatic receipts provided for all transactions</li>
                  <li><strong>Token Conversion:</strong> TOA tokens are converted to monetary value for payout processing</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Platform Fee Structure</h3>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-gray-300 leading-relaxed mb-2">
                    <strong>Flat Platform Fee:</strong> $0.99 per tip or TOA token transaction
                  </p>
                  <p className="text-gray-300 leading-relaxed mb-2">This fee covers:</p>
                  <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                    <li>Secure payment processing through Stripe</li>
                    <li>Platform maintenance, security, and infrastructure</li>
                    <li>Customer support and dispute resolution</li>
                    <li>Fraud protection and transaction monitoring</li>
                    <li>Compliance with financial regulations (PCI DSS, AML, KYC)</li>
                    <li>Data security and privacy protection</li>
                    <li>Points system maintenance and recognition features</li>
                    <li>TOA token system infrastructure and processing</li>
                  </ul>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Payment Terms and Conditions</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li><strong>Authorization:</strong> By submitting payment information, you authorize the transaction</li>
                  <li><strong>Accuracy:</strong> You are responsible for providing accurate payment information</li>
                  <li><strong>Declined Payments:</strong> Failed transactions may result in fees from your financial institution</li>
                  <li><strong>Currency:</strong> All transactions are processed in US Dollars (USD)</li>
                  <li><strong>Taxes:</strong> You are responsible for any applicable taxes on tips and fees</li>
                  <li><strong>Receipts:</strong> Electronic receipts are provided for all successful transactions</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Refunds and Disputes</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li><strong>Tip Refunds:</strong> Tips are generally non-refundable once processed</li>
                  <li><strong>Platform Fee Refunds:</strong> Platform fees may be refunded in cases of technical errors</li>
                  <li><strong>Disputed Transactions:</strong> Contact us immediately for unauthorized transactions</li>
                  <li><strong>Chargeback Policy:</strong> Chargebacks may result in account suspension pending investigation</li>
                  <li><strong>Resolution Process:</strong> We work with Stripe to resolve payment disputes fairly</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Technician Payouts</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li>Technicians receive tips and TOA token values minus the $0.99 platform fee</li>
                  <li>Payouts are processed according to Stripe&apos;s standard schedule</li>
                  <li>Technicians are responsible for tax reporting on received tips and TOA token payments</li>
                  <li>Valid bank account information required for payouts</li>
                  <li>Points earned are separate from monetary payouts and have no cash value</li>
                  <li>TOA tokens are converted to their monetary equivalent for payout processing</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Third-Party Payment Processor</h3>
                <p className="text-gray-300 leading-relaxed">
                  By using our payment features, you also agree to Stripe&apos;s Terms of Service and Privacy Policy. 
                  Stripe may collect additional information and have their own data practices separate from ours.
                </p>
              </div>
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
              accordance with our <Link href="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors">Privacy Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-pink-400 mb-4">Disclaimer of Warranties</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. ThankATech disclaims all 
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
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Limitation of Liability</h2>
            <p className="text-gray-300 leading-relaxed">
              In no event shall ThankATech be liable for any indirect, incidental, special, consequential, 
              or punitive damages, including loss of profits, data, or goodwill, arising from your use of 
              the Service, even if we have been advised of the possibility of such damages.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Indemnification</h2>
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
              changes by posting the new Terms on this page and updating the &quot;Last updated&quot; date. Your 
              continued use of the Service after such modifications constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Severability</h2>
            <p className="text-gray-300 leading-relaxed">
              If any provision of these Terms is found to be unenforceable or invalid, that provision will 
              be limited or eliminated to the minimum extent necessary so that these Terms will otherwise 
              remain in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Contact Information</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <ul className="text-gray-300 space-y-2">
                <li><strong>Email:</strong> <a href="mailto:legal@thankatech.com" className="text-blue-400 hover:text-blue-300 transition-colors">legal@thankatech.com</a></li>
                <li><strong>Support:</strong> <a href="mailto:support@thankatech.com" className="text-blue-400 hover:text-blue-300 transition-colors">support@thankatech.com</a></li>
                <li><strong>Contact Form:</strong> <Link href="/contact" className="text-blue-400 hover:text-blue-300 transition-colors">Visit our contact page</Link></li>
              </ul>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}





