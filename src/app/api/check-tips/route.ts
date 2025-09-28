import { NextRequest, NextResponse } from 'next/server';
import { collection, getDocs } from 'firebase/firestore';
import { db as firestore } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking tip data after migration...');
    
    // Get all tips to see current values
    const tipsRef = collection(firestore, 'tips');
    const allSnapshot = await getDocs(tipsRef);
    
    console.log(`📊 Found ${allSnapshot.size} total tips in database`);
    
    if (allSnapshot.empty) {
      return NextResponse.json({ message: 'No tips found in database', count: 0 });
    }
    
    // Analyze all tips
    const tipsSummary = allSnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        amount: data.amount,
        platformFee: data.platformFee,
        technicianPayout: data.technicianPayout,
        technicianId: data.technicianId,
        status: data.status,
        createdAt: data.createdAt,
        migratedAt: data.migratedAt || 'Not migrated'
      };
    });
    
    // Calculate totals
    const totalGross = tipsSummary.reduce((sum, tip) => sum + (tip.amount || 0), 0);
    const totalPlatformFee = tipsSummary.reduce((sum, tip) => sum + (tip.platformFee || 0), 0);
    const totalTechnicianPayout = tipsSummary.reduce((sum, tip) => sum + (tip.technicianPayout || 0), 0);
    
    console.log('💰 Totals:', { 
      totalGross: totalGross / 100, 
      totalPlatformFee: totalPlatformFee / 100, 
      totalTechnicianPayout: totalTechnicianPayout / 100 
    });
    
    return NextResponse.json({
      message: `Found ${allSnapshot.size} tips`,
      totalTips: allSnapshot.size,
      totals: {
        grossAmountCents: totalGross,
        grossAmountDollars: totalGross / 100,
        platformFeeCents: totalPlatformFee,
        platformFeeDollars: totalPlatformFee / 100,
        technicianPayoutCents: totalTechnicianPayout,
        technicianPayoutDollars: totalTechnicianPayout / 100
      },
      tips: tipsSummary
    });
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    return NextResponse.json({ error: 'Check failed', details: (error as Error).message }, { status: 500 });
  }
}