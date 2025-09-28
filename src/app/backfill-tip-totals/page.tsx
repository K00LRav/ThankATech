"use client";

import { useState } from 'react';

export default function BackfillTipTotals() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runBackfill = async () => {
    setLoading(true);
    try {
      // Import Firebase functions on client side
      const { db } = await import('@/lib/firebase');
      const { getDocs, collection, doc, updateDoc } = await import('firebase/firestore');
      
      if (!db) {
        throw new Error('Firebase not configured');
      }
      
      console.log('🔄 Starting client-side tip totals backfill...');
      
      // Get all tips from the tips collection
      const tipsSnapshot = await getDocs(collection(db, 'tips'));
      const tipsByTechnician = new Map();
      
      // Group tips by technician ID
      tipsSnapshot.forEach((tipDoc) => {
        const tipData = tipDoc.data();
        const techId = tipData.technicianId;
        
        if (techId) {
          if (!tipsByTechnician.has(techId)) {
            tipsByTechnician.set(techId, {
              count: 0,
              totalAmount: 0
            });
          }
          
          const current = tipsByTechnician.get(techId);
          current.count += 1;
          current.totalAmount += tipData.amount || 0;
        }
      });
      
      console.log(`📊 Found ${tipsByTechnician.size} technicians with tips`);
      
      // Update each technician's totals
      const updatePromises = [];
      let updatedCount = 0;
      
      for (const [techId, totals] of tipsByTechnician.entries()) {
        console.log(`⚡ Updating technician ${techId}: ${totals.count} tips, $${totals.totalAmount / 100}`);
        
        const techRef = doc(db, 'technicians', techId);
        updatePromises.push(
          updateDoc(techRef, {
            totalTips: totals.count,
            totalTipAmount: totals.totalAmount,
            lastBackfillDate: new Date().toISOString()
          }).then(() => {
            updatedCount++;
            console.log(`✅ Updated technician ${techId}`);
          }).catch((error) => {
            console.error(`❌ Failed to update technician ${techId}:`, error);
            throw error;
          })
        );
      }
      
      // Wait for all updates to complete
      await Promise.all(updatePromises);
      
      console.log(`✅ Backfill complete! Updated ${updatedCount} technicians`);
      
      setResult({
        success: true,
        message: `Backfill complete! Updated ${updatedCount} technicians with tip totals`,
        techniciansUpdated: updatedCount,
        totalTechniciansWithTips: tipsByTechnician.size
      });
      
    } catch (error) {
      console.error('❌ Error during client-side tip totals backfill:', error);
      setResult({
        error: 'Backfill failed',
        details: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Backfill Tip Totals</h1>
          
          <p className="text-gray-600 mb-6">
            This will calculate and update the totalTips and totalTipAmount fields for all technicians based on their tip history.
          </p>
          
          <button
            onClick={runBackfill}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Running Backfill...' : 'Run Backfill'}
          </button>
          
          {result && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Result:</h2>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}