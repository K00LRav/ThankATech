import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db as firestore } from '@/lib/firebase';
import { calculatePlatformFee, calculateTechnicianPayout } from '@/lib/stripe';

export async function GET(request: NextRequest) {
  return migrateTips();
}

export async function POST(request: NextRequest) {
  return migrateTips();
}

async function migrateTips() {
  try {
    console.log('🔧 Starting tip payout migration...');
    
    // Get all tips to see what we have
    const tipsRef = collection(firestore, 'tips');
    const allSnapshot = await getDocs(tipsRef);
    
    console.log(`📊 Found ${allSnapshot.size} total tips in database`);
    
    if (allSnapshot.empty) {
      return NextResponse.json({ message: 'No tips found in database', count: 0 });
    }
    
    // Log first few tips to see their structure
    const tipsSummary = allSnapshot.docs.slice(0, 5).map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        amount: data.amount,
        platformFee: data.platformFee,
        technicianPayout: data.technicianPayout,
        hasField: 'technicianPayout' in data
      };
    });
    
    console.log('🔍 Sample tips:', tipsSummary);
    
    // Get tips with missing or zero technicianPayout
    const needsUpdateDocs = allSnapshot.docs.filter(docSnap => {
      const data = docSnap.data();
      return !data.technicianPayout || data.technicianPayout === 0;
    });
    
    console.log(`📊 Found ${needsUpdateDocs.length} tips that need technicianPayout update`);
    
    if (needsUpdateDocs.length === 0) {
      return NextResponse.json({ 
        message: 'No tips need migration', 
        totalTips: allSnapshot.size,
        sampleTips: tipsSummary
      });
    }
    
    let updatedCount = 0;
    const updates = [];
    
    for (const docSnap of needsUpdateDocs) {
      const tipData = docSnap.data();
      const amount = tipData.amount;
      
      if (!amount || amount <= 0) {
        console.log(`⚠️ Skipping tip ${docSnap.id} - invalid amount: ${amount}`);
        continue;
      }
      
      // Calculate correct fees
      const platformFee = calculatePlatformFee(amount);
      const technicianPayout = calculateTechnicianPayout(amount);
      
      console.log(`💰 Updating tip ${docSnap.id}: amount=${amount}, platformFee=${platformFee}, technicianPayout=${technicianPayout}`);
      
      // Update the document
      await updateDoc(doc(firestore, 'tips', docSnap.id), {
        platformFee: platformFee,
        technicianPayout: technicianPayout,
        migratedAt: new Date().toISOString()
      });
      
      updates.push({
        id: docSnap.id,
        amount,
        oldPlatformFee: tipData.platformFee,
        newPlatformFee: platformFee,
        oldTechnicianPayout: tipData.technicianPayout,
        newTechnicianPayout: technicianPayout
      });
      
      updatedCount++;
    }
    
    console.log(`✅ Migration complete! Updated ${updatedCount} tip records`);
    
    return NextResponse.json({
      message: `Migration complete! Updated ${updatedCount} tip records`,
      totalTips: allSnapshot.size,
      updatedCount,
      updates,
      sampleTips: tipsSummary
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({ error: 'Migration failed', details: (error as Error).message }, { status: 500 });
  }
}