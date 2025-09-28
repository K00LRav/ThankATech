// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting to fix anonymous tips...');
    
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK not configured' },
        { status: 500 }
      );
    }
    
    // Get all tips using Admin SDK
    const tipsCollection = adminDb.collection('tips');
    const tipsSnapshot = await tipsCollection.get();
    
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
          const userQuery = adminDb.collection('users').where('uid', '==', tip.customerId);
          const userSnapshot = await userQuery.get();
          
          if (!userSnapshot.empty) {
            const userData = userSnapshot.docs[0].data();
            customerName = userData.name || userData.displayName;
            customerEmail = customerEmail || userData.email;
            tipInfo.foundInCollection = 'users';
          } else {
            // Look in technicians collection
            const techQuery = adminDb.collection('technicians').where('uid', '==', tip.customerId);
            const techSnapshot = await techQuery.get();
            
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
          await adminDb.collection('tips').doc(tipDoc.id).update({
            customerName: customerName,
            customerEmail: customerEmail || tip.customerEmail,
            updatedAt: new Date().toISOString()
          });
          
          fixedCount++;
          tipInfo.status = 'fixed';
          tipInfo.newCustomerName = customerName;
          tipInfo.newCustomerEmail = customerEmail;
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
    
    return NextResponse.json({
      success: true,
      message: `Migration complete! Fixed ${fixedCount} out of ${totalTips} tips.`,
      fixedCount,
      totalTips,
      results
    });
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      { error: 'Migration failed: ' + error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to run the migration script to fix anonymous tips',
    usage: 'POST /api/fix-anonymous-tips'
  });
}