'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function CleanupFirebasePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [confirmText, setConfirmText] = useState('');

  const cleanupFirebase = async () => {
    if (confirmText !== 'DELETE ALL USERS') {
      setResults([{ type: 'error', message: 'Please type "DELETE ALL USERS" to confirm' }]);
      return;
    }

    setIsLoading(true);
    setResults([]);
    
    try {
      console.log('🧹 Starting Firebase cleanup...');
      
      // Import Firebase functions
      const { db } = await import('@/lib/firebase');
      const { collection, getDocs, deleteDoc, doc } = await import('firebase/firestore');
      
      if (!db) {
        setResults([{ type: 'error', message: 'Firebase not configured' }]);
        return;
      }
      
      setResults([{ type: 'info', message: '🧹 Starting cleanup process...' }]);
      
      // Clear technicians collection
      console.log('Clearing technicians collection...');
      const techniciansSnapshot = await getDocs(collection(db as any, 'technicians'));
      let techDeleteCount = 0;
      
      for (const docSnapshot of techniciansSnapshot.docs) {
        try {
          await deleteDoc(doc(db as any, 'technicians', docSnapshot.id));
          techDeleteCount++;
          console.log(`Deleted technician: ${docSnapshot.id}`);
        } catch (error) {
          console.error(`Error deleting technician ${docSnapshot.id}:`, error);
        }
      }
      
      setResults(prev => [...prev, { 
        type: 'success', 
        message: `✅ Deleted ${techDeleteCount} technicians` 
      }]);
      
      // Clear users collection
      console.log('Clearing users collection...');
      const usersSnapshot = await getDocs(collection(db as any, 'users'));
      let userDeleteCount = 0;
      
      for (const docSnapshot of usersSnapshot.docs) {
        try {
          await deleteDoc(doc(db as any, 'users', docSnapshot.id));
          userDeleteCount++;
          console.log(`Deleted user: ${docSnapshot.id}`);
        } catch (error) {
          console.error(`Error deleting user ${docSnapshot.id}:`, error);
        }
      }
      
      setResults(prev => [...prev, { 
        type: 'success', 
        message: `✅ Deleted ${userDeleteCount} users` 
      }]);
      
      // Clear tips collection
      console.log('Clearing tips collection...');
      const tipsSnapshot = await getDocs(collection(db as any, 'tips'));
      let tipDeleteCount = 0;
      
      for (const docSnapshot of tipsSnapshot.docs) {
        try {
          await deleteDoc(doc(db as any, 'tips', docSnapshot.id));
          tipDeleteCount++;
          console.log(`Deleted tip: ${docSnapshot.id}`);
        } catch (error) {
          console.error(`Error deleting tip ${docSnapshot.id}:`, error);
        }
      }
      
      setResults(prev => [...prev, { 
        type: 'success', 
        message: `✅ Deleted ${tipDeleteCount} tips` 
      }]);
      
      // Clear thankYous collection
      console.log('Clearing thankYous collection...');
      const thankYousSnapshot = await getDocs(collection(db as any, 'thankYous'));
      let thankYouDeleteCount = 0;
      
      for (const docSnapshot of thankYousSnapshot.docs) {
        try {
          await deleteDoc(doc(db as any, 'thankYous', docSnapshot.id));
          thankYouDeleteCount++;
          console.log(`Deleted thankYou: ${docSnapshot.id}`);
        } catch (error) {
          console.error(`Error deleting thankYou ${docSnapshot.id}:`, error);
        }
      }
      
      setResults(prev => [...prev, { 
        type: 'success', 
        message: `✅ Deleted ${thankYouDeleteCount} thank yous` 
      }]);
      
      const totalDeleted = techDeleteCount + userDeleteCount + tipDeleteCount + thankYouDeleteCount;
      
      setResults(prev => [...prev, { 
        type: 'success', 
        message: `🎉 Cleanup complete! Deleted ${totalDeleted} total documents.` 
      }]);
      
      setResults(prev => [...prev, { 
        type: 'info', 
        message: `📝 You can now register users with the new unique ID system.` 
      }]);
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
      setResults(prev => [...prev, { 
        type: 'error', 
        message: `Error: ${(error as any)?.message || 'Unknown error'}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-slate-900 to-red-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-8 border border-red-500/20">
          <h1 className="text-3xl font-bold text-white mb-6">🧹 Firebase Cleanup</h1>
          
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-red-200 mb-4">⚠️ DANGER ZONE ⚠️</h2>
            <p className="text-red-100 mb-4">
              This will permanently delete ALL data from Firebase:
            </p>
            <ul className="text-red-200 space-y-1 mb-4">
              <li>• All registered technicians</li>
              <li>• All registered users</li>
              <li>• All tip transactions</li>
              <li>• All thank you messages</li>
            </ul>
            <p className="text-red-100 font-semibold">
              This action cannot be undone! Make sure you have backups if needed.
            </p>
          </div>
          
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">
              Type &quot;DELETE ALL USERS&quot; to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-red-500 focus:outline-none"
              placeholder="DELETE ALL USERS"
            />
          </div>
          
          <button
            onClick={cleanupFirebase}
            disabled={isLoading || confirmText !== 'DELETE ALL USERS'}
            className={`w-full font-semibold px-6 py-4 rounded-xl transition-colors mb-6 ${
              confirmText === 'DELETE ALL USERS' && !isLoading
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? '🧹 Cleaning up Firebase...' : '🗑️ DELETE ALL FIREBASE DATA'}
          </button>

          {results.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white mb-4">Cleanup Results</h2>
              
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
                <div className="mt-6 p-4 bg-green-900/20 border border-green-500/20 rounded-lg">
                  <h3 className="text-green-200 font-semibold mb-2">✅ Next Steps:</h3>
                  <ol className="text-green-100 space-y-1 text-sm">
                    <li>1. Go to the home page</li>
                    <li>2. Register as a technician with your new unique ID system</li>
                    <li>3. Test the tip functionality</li>
                    <li>4. Check that the dashboard shows earnings correctly</li>
                  </ol>
                </div>
              )}
              
              <div className="mt-6 text-center space-x-4">
                <Link 
                  href="/" 
                  className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                >
                  → Go to Home Page
                </Link>
                <Link 
                  href="/debug-profile" 
                  className="inline-block bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                >
                  → Check Profile
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
