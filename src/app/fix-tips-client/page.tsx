'use client';
// @ts-nocheck

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

export default function ClientFixTipsPage() {
  const [user, loading] = useAuthState(auth);
  const [result, setResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runClientSideFix = async () => {
    if (!user) {
      alert('Please sign in first to run this operation.');
      return;
    }

    setIsRunning(true);
    setResult(null);

    try {
      console.log('🔧 Starting client-side fix for anonymous tips...');
      
      if (!db) {
        throw new Error('Firebase not configured');
      }
      
      // Get all tips
      const tipsRef = collection(db, 'tips');
      const tipsSnapshot = await getDocs(tipsRef);
      
      let fixedCount = 0;
      let totalTips = 0;
      const results = [];
      
      for (const tipDoc of tipsSnapshot.docs) {
        const tip = tipDoc.data();
        totalTips++;
        
        const tipInfo: any = {
          tipId: tipDoc.id,
          hasCustomerName: !!tip.customerName,
          hasCustomerEmail: !!tip.customerEmail,
          hasCustomerId: !!tip.customerId,
          currentCustomerName: tip.customerName,
          status: 'no_change'
        };
        
        // Skip if already has customer name
        if (tip.customerName && tip.customerName !== 'Anonymous' && tip.customerName !== 'Anonymous Tipper') {
          tipInfo.status = 'already_has_name';
          results.push(tipInfo);
          continue;
        }
        
        let customerName = null;
        let customerEmail = tip.customerEmail;
        
        // Try to find customer information
        if (tip.customerId) {
          try {
            // Look in users collection first
            const userQuery = query(collection(db, 'users'), where('uid', '==', tip.customerId));
            const userSnapshot = await getDocs(userQuery);
            
            if (!userSnapshot.empty) {
              const userData = userSnapshot.docs[0].data();
              customerName = userData.name || userData.displayName;
              customerEmail = customerEmail || userData.email;
              tipInfo.foundInCollection = 'users';
            } else {
              // Look in technicians collection
              const techQuery = query(collection(db, 'technicians'), where('uid', '==', tip.customerId));
              const techSnapshot = await getDocs(techQuery);
              
              if (!techSnapshot.empty) {
                const techData = techSnapshot.docs[0].data();
                customerName = techData.name || techData.displayName;
                customerEmail = customerEmail || techData.email;
                tipInfo.foundInCollection = 'technicians';
              }
            }
          } catch (error: any) {
            console.warn(`Could not find customer data for ${tip.customerId}:`, error.message);
            tipInfo.error = error.message;
          }
        }
        
        // If still no name, try using email prefix
        if (!customerName && customerEmail) {
          customerName = customerEmail.split('@')[0];
          tipInfo.usedEmailPrefix = true;
        }
        
        // Update the tip if we found a name
        if (customerName) {
          try {
            await updateDoc(doc(db, 'tips', tipDoc.id), {
              customerName: customerName,
              customerEmail: customerEmail || tip.customerEmail,
              updatedAt: new Date().toISOString()
            });
            
            fixedCount++;
            tipInfo.status = 'fixed';
            tipInfo.newCustomerName = customerName;
            tipInfo.newCustomerEmail = customerEmail;
            console.log(`✅ Updated tip ${tipDoc.id} with customer name: ${customerName}`);
          } catch (error: any) {
            console.error(`❌ Failed to update tip ${tipDoc.id}:`, error);
            tipInfo.status = 'update_failed';
            tipInfo.error = error.message;
          }
        } else {
          tipInfo.status = 'no_name_found';
        }
        
        results.push(tipInfo);
      }
      
      setResult({
        success: true,
        message: `Migration complete! Fixed ${fixedCount} out of ${totalTips} tips.`,
        fixedCount,
        totalTips,
        results
      });
      
    } catch (error: any) {
      console.error('❌ Client-side migration failed:', error);
      setResult({
        success: false,
        error: 'Migration failed: ' + error.message
      });
    } finally {
      setIsRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-white text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800 rounded-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
            <p className="text-blue-200 mb-4">Please sign in to run the fix for anonymous tips.</p>
            <Link 
              href="/" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium inline-block"
            >
              Go to Home & Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Fix Anonymous Tips (Client-Side)</h1>
        
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <p className="text-white mb-4">
            <strong>Signed in as:</strong> {user.email}
          </p>
          <p className="text-blue-200 mb-4">
            This tool will update existing tips that show as &quot;Anonymous&quot; by looking up customer information.
            This runs client-side with your authentication.
          </p>
          
          <button
            onClick={runClientSideFix}
            disabled={isRunning}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50"
          >
            {isRunning ? 'Running Fix...' : 'Fix Anonymous Tips'}
          </button>
        </div>

        {result && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {result.success ? '✅ Results' : '❌ Error'}
            </h2>
            <div className="text-sm text-green-400 mb-4">
              {result.message || result.error}
            </div>
            {result.results && (
              <div className="max-h-96 overflow-auto">
                <pre className="text-xs text-blue-300">
                  {JSON.stringify(result.results, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}