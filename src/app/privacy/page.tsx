"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { auth, getTechnician, getClient } from '@/lib/firebase';
import UniversalHeader from '@/components/UniversalHeader';
import { logger } from '@/lib/logger';

export default function Privacy() {
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
        currentPath="/privacy"
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
            Privacy Policy
          </h1>
          <p className="text-gray-300 text-lg">
            Last updated: November 14, 2025
          </p>
        </div>

        {/* Privacy Policy Content */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 space-y-8">
          
          <section>
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Introduction</h2>
            <p className="text-gray-300 leading-relaxed">
              ThankATech (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains 
              how we collect, use, disclose, and safeguard your information when you use our platform that connects 
              customers with skilled technicians.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Personal Information</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li>Name, email address, and phone number</li>
                  <li>Business information (for technicians)</li>
                  <li>Profile photos and business images</li>
                  <li>Location data (with your permission)</li>
                  <li>Payment information (processed securely)</li>
                  <li>Points and recognition data</li>
                  <li>TOA token transaction history</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Usage Information</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li>How you interact with our platform</li>
                  <li>Pages visited and features used</li>
                  <li>Device information and IP address</li>
                  <li>Browser type and operating system</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-green-400 mb-4">How We Use Your Information</h2>
            <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
              <li>To provide and maintain our services</li>
              <li>To facilitate connections between customers and technicians</li>
              <li>To process payments, tips, and TOA token transactions</li>
              <li>To calculate and display points for community recognition</li>
              <li>To manage TOA token purchases, transfers, and payouts</li>
              <li>To send you important updates and notifications</li>
              <li>To improve our platform and user experience</li>
              <li>To ensure platform safety and prevent fraud</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Information Sharing</h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                We do not sell, trade, or rent your personal information to third parties. We may share your 
                information only in the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>With Other Users:</strong> Profile information visible to facilitate connections</li>
                <li><strong>Service Providers:</strong> Third-party services that help us operate our platform</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In case of merger, acquisition, or asset sale</li>
                <li><strong>With Your Consent:</strong> Any other sharing with your explicit permission</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-pink-400 mb-4">Data Security</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We implement appropriate technical and organizational security measures to protect your personal 
              information against unauthorized access, alteration, disclosure, or destruction.
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and updates</li>
              <li>Access controls and authentication procedures</li>
              <li>Employee training on data protection</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Your Rights and Choices</h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">You have the following rights regarding your personal information:</p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li><strong>Access:</strong> Request copies of your personal information</li>
                <li><strong>Rectification:</strong> Request correction of inaccurate information</li>
                <li><strong>Erasure:</strong> Request deletion of your personal information</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Objection:</strong> Object to processing of your personal information</li>
                <li><strong>Restriction:</strong> Request restriction of processing</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Regional Privacy Rights</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">European Union (GDPR) Rights</h3>
                <p className="text-gray-300 leading-relaxed mb-2">
                  If you are located in the European Union, you have additional rights under the General Data Protection Regulation (GDPR):
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li><strong>Lawful Basis:</strong> We process your data based on consent, contract performance, or legitimate interests</li>
                  <li><strong>Right to Object:</strong> You can object to processing based on legitimate interests</li>
                  <li><strong>Data Protection Officer:</strong> Contact us at privacy@thankatech.com for GDPR-related inquiries</li>
                  <li><strong>Supervisory Authority:</strong> You have the right to lodge a complaint with your local data protection authority</li>
                  <li><strong>Data Retention:</strong> We retain data only as long as necessary for the stated purposes</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">California (CCPA) Rights</h3>
                <p className="text-gray-300 leading-relaxed mb-2">
                  If you are a California resident, you have rights under the California Consumer Privacy Act (CCPA):
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li><strong>Right to Know:</strong> Request information about personal information we collect, use, and disclose</li>
                  <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
                  <li><strong>Right to Opt-Out:</strong> We do not sell personal information, but you can opt-out if this changes</li>
                  <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your privacy rights</li>
                  <li><strong>Authorized Agent:</strong> You may designate an authorized agent to make requests on your behalf</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Exercising Your Rights</h3>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-gray-300 leading-relaxed mb-2">
                    To exercise any of these rights, please contact us:
                  </p>
                  <ul className="text-gray-300 space-y-1">
                    <li><strong>Email:</strong> <a href="mailto:privacy@thankatech.com" className="text-blue-400 hover:text-blue-300 transition-colors">privacy@thankatech.com</a></li>
                    <li><strong>Subject Line:</strong> Include "Privacy Rights Request" in your email</li>
                    <li><strong>Response Time:</strong> We will respond within 30 days of receiving your request</li>
                    <li><strong>Verification:</strong> We may need to verify your identity before processing requests</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Cookies and Tracking</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We use cookies and similar tracking technologies to enhance your experience on our platform:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
              <li>Essential cookies for platform functionality</li>
              <li>Analytics cookies to understand usage patterns</li>
              <li>Preference cookies to remember your settings</li>
              <li>You can control cookie preferences in your browser settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">Mobile Applications (Future Considerations)</h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                If we develop mobile applications in the future, additional data collection and privacy considerations may apply:
              </p>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Mobile Device Permissions</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li><strong>Location Services:</strong> With your permission, to help find nearby technicians</li>
                  <li><strong>Camera Access:</strong> To upload profile photos and business images</li>
                  <li><strong>Push Notifications:</strong> To send important updates and messages</li>
                  <li><strong>Contacts:</strong> Only with explicit permission, to facilitate connections</li>
                  <li><strong>Storage:</strong> To save app data and preferences locally</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Mobile-Specific Data Collection</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li>Device identifiers and mobile advertising IDs</li>
                  <li>App usage analytics and crash reports</li>
                  <li>Device type, operating system, and app version</li>
                  <li>Network information and connection status</li>
                  <li>App store interaction data (downloads, updates)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Mobile Privacy Controls</h3>
                <p className="text-gray-300 leading-relaxed">
                  You will always have control over mobile permissions and can modify them through your device settings. 
                  We will request permissions only when necessary for specific features and will explain why each permission is needed.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Payment Processing & Stripe Integration</h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                We use Stripe, Inc. (&quot;Stripe&quot;) as our payment processor to handle all financial transactions 
                securely. This section explains how your payment information is handled:
              </p>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Payment Data Security</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li><strong>PCI DSS Compliance:</strong> Stripe is certified as a PCI Level 1 Service Provider</li>
                  <li><strong>Card Data:</strong> We never store your complete credit card information</li>
                  <li><strong>Tokenization:</strong> Card details are converted to secure tokens by Stripe</li>
                  <li><strong>Encryption:</strong> All payment data is encrypted in transit and at rest</li>
                  <li><strong>3D Secure:</strong> Additional authentication for enhanced security</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Information Collected for Payments</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li>Billing name and address</li>
                  <li>Credit/debit card information (processed by Stripe)</li>
                  <li>Transaction history and receipt information</li>
                  <li>Device and browser information for fraud prevention</li>
                  <li>IP address and geolocation data for security verification</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Payment Data Usage</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li>Processing tip payments and TOA token purchases and payouts to technicians</li>
                  <li>Calculating and collecting platform fees</li>
                  <li>Generating receipts and transaction records</li>
                  <li>Managing points calculation and display for community recognition</li>
                  <li>Processing TOA token conversions and monetary payouts</li>
                  <li>Fraud detection and prevention</li>
                  <li>Compliance with financial regulations (AML, KYC)</li>
                  <li>Resolving payment disputes and chargebacks</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Stripe&apos;s Role and Responsibilities</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                  <li>Stripe acts as our payment processor and may collect additional information</li>
                  <li>Stripe&apos;s privacy policy governs their handling of your payment data</li>
                  <li>Stripe may use your information for their own fraud prevention and compliance</li>
                  <li>You can review Stripe&apos;s privacy policy at <a href="https://stripe.com/privacy" className="text-blue-400 hover:text-blue-300 transition-colors" target="_blank" rel="noopener noreferrer">stripe.com/privacy</a></li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Platform Fee Structure</h3>
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <p className="text-gray-300 leading-relaxed">
                    ThankATech charges a flat platform fee of $0.99 per transaction. This fee covers:
                  </p>
                  <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4 mt-2">
                    <li>Payment processing through Stripe</li>
                    <li>Platform maintenance and security</li>
                    <li>Customer support and dispute resolution</li>
                    <li>Fraud protection and monitoring</li>
                    <li>Compliance with financial regulations</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-green-400 mb-4">Third-Party Services</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              Our platform integrates with third-party services to enhance functionality:
            </p>
            <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
              <li><strong>Google Sign-In:</strong> For secure authentication and profile management</li>
              <li><strong>Firebase:</strong> For data storage, authentication, and real-time features</li>
              <li><strong>Stripe:</strong> For secure payment processing (see Payment Processing section above)</li>
              <li><strong>Analytics services:</strong> For platform improvement and usage insights</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              These services have their own privacy policies, and we encourage you to review them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Children&apos;s Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              Our platform is not intended for children under 13 years of age. We do not knowingly collect 
              personal information from children under 13. If you become aware that a child has provided us 
              with personal information, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-pink-400 mb-4">International Data Transfers</h2>
            <p className="text-gray-300 leading-relaxed">
              Your information may be transferred to and processed in countries other than your own. We ensure 
              appropriate safeguards are in place to protect your personal information in accordance with this 
              privacy policy and applicable laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Data Retention</h2>
            <p className="text-gray-300 leading-relaxed">
              We retain your personal information only for as long as necessary to fulfill the purposes outlined 
              in this privacy policy, unless a longer retention period is required or permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-blue-400 mb-4">Changes to This Policy</h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
                the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
              </p>
              <p className="text-gray-300 leading-relaxed">
                For material changes, we will provide at least 30 days&apos; notice before the new policy takes effect. 
                You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-green-400 mb-4">Contact Us</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <ul className="text-gray-300 space-y-2">
                <li><strong>Privacy Inquiries:</strong> <a href="mailto:privacy@thankatech.com" className="text-blue-400 hover:text-blue-300 transition-colors">privacy@thankatech.com</a></li>
                <li><strong>Legal Matters:</strong> <a href="mailto:legal@thankatech.com" className="text-blue-400 hover:text-blue-300 transition-colors">legal@thankatech.com</a></li>
                <li><strong>General Support:</strong> <a href="mailto:support@thankatech.com" className="text-blue-400 hover:text-blue-300 transition-colors">support@thankatech.com</a></li>
                <li><strong>Platform:</strong> <a href="https://thankatech.com" className="text-blue-400 hover:text-blue-300 transition-colors">thankatech.com</a></li>
              </ul>
              <p className="text-gray-300 text-sm mt-3">
                <strong>Note:</strong> ThankATech is an online platform. All communications are handled electronically via email or through our website contact form.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Governing Law</h2>
            <p className="text-gray-300 leading-relaxed">
              This Privacy Policy shall be governed by and construed in accordance with the laws of the State of New York, 
              without regard to its conflict of law provisions. Any disputes arising from this Privacy Policy will be subject 
              to the exclusive jurisdiction of the courts located in New York County, New York.
            </p>
          </section>

        </div>
      </main>
    </div>
  );
}





