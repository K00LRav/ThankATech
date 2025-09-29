'use client';

import React, { useState } from 'react';

export default function FixDataPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const fixData = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      console.log('🔧 Starting data fix process...');
      
      // Import Firebase functions
      const { db, auth } = await import('@/lib/firebase');
      const { collection, getDocs, doc, updateDoc, addDoc } = await import('firebase/firestore');
      const { onAuthStateChanged } = await import('firebase/auth');
      
      // Get current user
      const getCurrentUser = () => new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth as any, (user) => {
          unsubscribe();
          resolve(user);
        });
      });
      
      const currentUser = await getCurrentUser() as any;
      if (!currentUser) {
        setResults([{ type: 'error', message: 'No user signed in' }]);
        return;
      }
      
      console.log('👤 Current user:', currentUser.email);
      setResults(prev => [...prev, { type: 'info', message: `Current user: ${currentUser.email}` }]);
      
      // Check for existing tips
      const tipsSnapshot = await getDocs(collection(db as any, 'tips'));
      const allTips = tipsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      console.log('💰 Found tips:', allTips.length);
      setResults(prev => [...prev, { type: 'info', message: `Found ${allTips.length} existing tips` }]);
      
      if (allTips.length === 0) {
        // Create a test tip for the current user
        const testTip = {
          amount: 10000, // $100 in cents
          status: 'completed',
          createdAt: new Date().toISOString(),
          technicianId: 'test-tech-id',
          technicianEmail: currentUser.email,
          technicianName: currentUser.displayName || 'Ray Soma',
          technicianUniqueId: `ray_soma_${currentUser.email.replace(/[^a-z0-9]/g, '_')}`,
          customerName: 'Test Customer',
          customerEmail: 'test@example.com',
          paymentIntentId: 'pi_test_' + Date.now(),
          description: 'Test tip for debugging'
        };
        
        const docRef = await addDoc(collection(db as any, 'tips'), testTip);
        console.log('✅ Created test tip:', docRef.id);
        setResults(prev => [...prev, { type: 'success', message: `Created test tip: ${docRef.id}` }]);
      } else {
        // Update existing tips to link to current user
        let updatedCount = 0;
        for (const tip of allTips) {
          if (!tip.technicianUniqueId && tip.technicianEmail === currentUser.email) {
            const uniqueId = `ray_soma_${currentUser.email.replace(/[^a-z0-9]/g, '_')}`;
            await updateDoc(doc(db as any, 'tips', tip.id), {
              technicianUniqueId: uniqueId,
              technicianEmail: currentUser.email
            });
            updatedCount++;
            console.log('🔄 Updated tip:', tip.id);
          }
        }
        
        if (updatedCount > 0) {
          setResults(prev => [...prev, { type: 'success', message: `Updated ${updatedCount} tips with unique IDs` }]);
        }
      }
      
      // Check technician profile
      const techQuery = await getDocs(collection(db as any, 'technicians'));
      const technicians = techQuery.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      
      console.log('👥 Found technicians:', technicians.length);
      setResults(prev => [...prev, { type: 'info', message: `Found ${technicians.length} technicians` }]);
      
      const currentTech = technicians.find(t => t.email === currentUser.email);
      if (currentTech) {
        if (!currentTech.uniqueId) {
          const uniqueId = `ray_soma_${currentUser.email.replace(/[^a-z0-9]/g, '_')}`;
          await updateDoc(doc(db as any, 'technicians', currentTech.id), {
            uniqueId: uniqueId
          });
          console.log('🔄 Updated technician with unique ID');
          setResults(prev => [...prev, { type: 'success', message: 'Updated technician with unique ID' }]);
        }
      } else {
        setResults(prev => [...prev, { type: 'warning', message: 'No technician profile found for current user' }]);
      }
      
      setResults(prev => [...prev, { type: 'success', message: '✅ Data fix complete! Try refreshing the dashboard.' }]);
      
    } catch (error) {
      console.error('❌ Error fixing data:', error);
      setResults(prev => [...prev, { type: 'error', message: `Error: ${(error as any)?.message || 'Unknown error'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-8 border border-white/10">
          <h1 className="text-3xl font-bold text-white mb-6">🔧 Data Fix Utility</h1>
          
          <div className="mb-6">
            <p className="text-blue-200 mb-4">
              This utility will:
            </p>
            <ul className="text-blue-200 space-y-1 mb-6">
              <li>• Check for existing tips in the database</li>
              <li>• Create a test tip if none exist</li>
              <li>• Link tips to the current user&apos;s unique ID</li>
              <li>• Update technician profile with unique ID</li>
            </ul>
          </div>
          
          <button
            onClick={fixData}
            disabled={isLoading}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors mb-6"
          >
            {isLoading ? 'Fixing Data...' : '🔧 Fix Data'}
          </button>

          {results.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white mb-4">Results</h2>
              
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg text-sm ${
                    result.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-100' :
                    result.type === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-100' :
                    result.type === 'warning' ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-100' :
                    'bg-blue-500/10 border border-blue-500/20 text-blue-100'
                  }`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    result.type === 'success' ? 'bg-green-500' :
                    result.type === 'error' ? 'bg-red-500' :
                    result.type === 'warning' ? 'bg-yellow-500' :
                    'bg-blue-500'
                  }`}></span>
                  {result.message}
                </div>
              ))}
              
              {results.some(r => r.type === 'success' && r.message.includes('complete')) && (
                <div className="mt-6 text-center">
                  <a 
                    href="/dashboard" 
                    className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                  >
                    → Go to Dashboard
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
