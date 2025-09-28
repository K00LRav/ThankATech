import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting tip totals backfill...');
    
    // Import Firebase functions
    const { db } = await import('@/lib/firebase');
    const { getDocs, collection, doc, updateDoc } = await import('firebase/firestore');
    
    if (!db) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }
    
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
        })
      );
    }
    
    // Wait for all updates to complete
    await Promise.all(updatePromises);
    
    console.log(`✅ Backfill complete! Updated ${updatedCount} technicians`);
    
    return NextResponse.json({
      success: true,
      message: `Backfill complete! Updated ${updatedCount} technicians with tip totals`,
      techniciansUpdated: updatedCount,
      totalTechniciansWithTips: tipsByTechnician.size
    });
    
  } catch (error) {
    console.error('❌ Error during tip totals backfill:', error);
    return NextResponse.json({
      error: 'Backfill failed',
      details: error.message
    }, { status: 500 });
  }
}