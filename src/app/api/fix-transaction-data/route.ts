import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  console.log('🔧 Fix transaction data API called');
  
  if (!adminDb) {
    console.error('❌ Firebase Admin DB not configured');
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    console.log('🔍 Processing transaction data fix for user:', userId);

    // Step 1: Find and fix token purchase transactions
    console.log('📋 Step 1: Finding token purchase transactions...');
    
    const transactionsQuery = adminDb.collection('tokenTransactions').where('type', '==', 'toa');
    const transactionsSnapshot = await transactionsQuery.get();
    
    console.log(`Found ${transactionsSnapshot.size} transactions with type 'toa'`);

    const batch = adminDb.batch();
    let tokenPurchaseCount = 0;
    let actualToaCount = 0;

    // Identify token purchases vs actual TOA sends
    transactionsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      // Token purchases have empty toTechnicianId and contain "Purchased" in message
      const isTokenPurchase = !data.toTechnicianId && 
                             data.message && 
                             data.message.includes('Purchased') && 
                             data.message.includes('Stripe payment');
      
      if (isTokenPurchase) {
        console.log(`🛒 Token Purchase: ${data.tokens} tokens, $${data.dollarValue}`);
        
        // Update to token_purchase type
        batch.update(doc.ref, {
          type: 'token_purchase'
        });
        tokenPurchaseCount++;
      } else {
        console.log(`💰 Actual TOA: ${data.tokens} tokens to ${data.toName || 'technician'}`);
        actualToaCount++;
      }
    });

    console.log(`📊 Summary: ${tokenPurchaseCount} purchases, ${actualToaCount} actual TOA`);

    // Commit the batch update
    if (tokenPurchaseCount > 0) {
      await batch.commit();
      console.log(`✅ Updated ${tokenPurchaseCount} token purchase transactions`);
    }

    // Step 2: Recalculate user points
    console.log('📋 Step 2: Recalculating user points...');
    
    // Find user's client document by authUid
    const clientsQuery = adminDb.collection('clients').where('authUid', '==', userId);
    const clientSnapshot = await clientsQuery.get();
    
    if (!clientSnapshot.empty) {
      const clientDoc = clientSnapshot.docs[0];
      
      // Calculate actual TOA sent (excluding token purchases)
      const userTransactionsQuery = adminDb.collection('tokenTransactions').where('fromUserId', '==', userId);
      const userTransactionsSnapshot = await userTransactionsQuery.get();
      
      let totalToaSent = 0;
      let totalTokensPurchased = 0;
      let totalThankYousSent = 0;
      
      userTransactionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        
        if (data.type === 'token_purchase') {
          totalTokensPurchased += data.tokens || 0;
        } else if (data.type === 'toa_token' || data.type === 'toa') {
          totalToaSent += data.tokens || 0;
          totalThankYousSent++;
        } else if (data.type === 'thank_you') {
          totalThankYousSent++;
        }
      });
      
      console.log(`📊 User Statistics:`);
      console.log(`- Total TOA sent: ${totalToaSent}`);
      console.log(`- Total tokens purchased: ${totalTokensPurchased}`);
      console.log(`- Total thank yous sent: ${totalThankYousSent}`);
      console.log(`- Correct points should be: ${totalToaSent}`);
      
      // Update user document with correct values
      await clientDoc.ref.update({
        points: totalToaSent, // 1 point per TOA sent
        totalToaSent: totalToaSent,
        totalTokensSent: totalToaSent,
        totalThankYousSent: totalThankYousSent,
        updatedAt: new Date()
      });
      
      console.log(`✅ Updated user points to ${totalToaSent}`);
      
      return NextResponse.json({
        success: true,
        message: 'Transaction data fixed successfully!',
        statistics: {
          tokenPurchasesFixed: tokenPurchaseCount,
          actualToaSent: totalToaSent,
          newPoints: totalToaSent,
          totalTokensPurchased,
          totalThankYousSent
        }
      });
      
    } else {
      console.log('❌ Could not find user client document');
      return NextResponse.json(
        { error: 'User client document not found' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('❌ Error fixing transaction data:', error);
    return NextResponse.json(
      { error: 'Failed to fix transaction data' },
      { status: 500 }
    );
  }
}