/**
 * Clean, simplified technician dashboard data loader
 * REBUILT FROM SCRATCH - November 12, 2025
 */

import { collection, query, where, getDocs, getDoc, doc, limit } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import { logger } from './logger';

export interface TechnicianDashboardData {
  tokenTransactions: any[];
  payoutTransactions: any[];
  allActivity: any[];
  totalTokensReceived: number;
  totalEarnings: number; // in dollars
  totalPayouts: number; // in dollars
  availableBalance: number; // in dollars
  totalPoints: number;
  totalThankYous: number;
  transactionCount: number;
  payoutCount: number;
}

export async function loadTechnicianDashboard(technicianId: string): Promise<TechnicianDashboardData> {
  try {
    // Get technician info
    const techDoc = await getDoc(doc(db, COLLECTIONS.TECHNICIANS, technicianId));
    if (!techDoc.exists()) {
      throw new Error(`Technician not found: ${technicianId}`);
    }
    const techData = techDoc.data();
    
    // ====== STEP 1: Load token transactions (received) ======
    const txQuery = query(
      collection(db, COLLECTIONS.TOKEN_TRANSACTIONS),
      where('toTechnicianId', '==', technicianId)
    );
    const txSnapshot = await getDocs(txQuery);
    
    // ====== STEP 1B: Load token purchases (made by this technician) ======
    // Only load purchases if we have a valid auth UID
    let purchaseSnapshot = { docs: [] } as any;
    if (techData.uid || techData.authUid) {
      const authUid = techData.uid || techData.authUid;
      try {
        const purchaseQuery = query(
          collection(db, COLLECTIONS.TOKEN_TRANSACTIONS),
          where('fromUserId', '==', authUid),
          where('type', '==', 'token_purchase')
        );
        purchaseSnapshot = await getDocs(purchaseQuery);
      } catch (error) {
        // Silently handle purchase loading errors
      }
    }
    
    const tokenTransactions: any[] = [];
    let totalTokens = 0;
    let totalEarningsCents = 0;
    let points = 0;
    let thankYous = 0;
    
    // Process transactions and fetch sender names
    const transactionPromises = txSnapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      
      // The data coming from Firebase has:
      // - tokens: number of tokens
      // - technicianPayout: dollar amount (e.g., 3.40 for 400 tokens)
      // We DON'T multiply by 100 here - just use it as-is
      
      const dollarAmount = data.technicianPayout || 0;
      const tokens = data.tokens || 0;
      
      // Always fetch the actual sender name from their profile
      let fromName = 'Customer';
      if (data.fromUserId) {
        try {
          // fromUserId is Firebase Auth UID, not Firestore doc ID
          // Need to query by authUid or uid field instead of direct document lookup
          const clientsQuery = query(
            collection(db, 'clients'),
            where('authUid', '==', data.fromUserId),
            limit(1)
          );
          let querySnapshot = await getDocs(clientsQuery);
          
          if (querySnapshot.empty) {
            // Try uid field (for backwards compatibility)
            const clientsQueryUid = query(
              collection(db, 'clients'),
              where('uid', '==', data.fromUserId),
              limit(1)
            );
            querySnapshot = await getDocs(clientsQueryUid);
          }
          
          if (querySnapshot.empty) {
            // Try technicians collection
            const techniciansQuery = query(
              collection(db, 'technicians'),
              where('uid', '==', data.fromUserId),
              limit(1)
            );
            querySnapshot = await getDocs(techniciansQuery);
          }
          
          if (!querySnapshot.empty) {
            const senderData = querySnapshot.docs[0].data();
            const fetchedName = senderData.name || senderData.displayName || senderData.businessName || null;
            
            // Use actual name if available, otherwise email
            if (fetchedName && fetchedName !== 'Customer') {
              fromName = fetchedName;
            } else if (senderData.email) {
              fromName = senderData.email;
            } else {
              fromName = data.fromName || 'Customer';
            }
          } else {
            fromName = data.fromName || 'Customer';
          }
        } catch (error) {
          logger.error(`Error fetching sender profile:`, error);
          fromName = data.fromName || 'Customer';
        }
      } else {
        fromName = data.fromName || 'Customer';
      }
      
      return {
        id: docSnap.id,
        type: data.type,
        amount: dollarAmount,
        timestamp: data.timestamp,
        fromName: fromName,
        tokens: tokens,
        message: data.message || '',
        dollarAmount,
        dataType: data.type,
        pointsAwarded: data.pointsAwarded || 0
      };
    });
    
    const transactionResults = await Promise.all(transactionPromises);
    
    // Build final array and calculate totals
    transactionResults.forEach(tx => {
      tokenTransactions.push({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        timestamp: tx.timestamp,
        fromName: tx.fromName,
        tokens: tx.tokens,
        message: tx.message
      });
      
      // Calculate totals
      if (tx.dataType === 'toa_token' || tx.dataType === 'toa') {
        totalTokens += tx.tokens;
        totalEarningsCents += Math.round(tx.dollarAmount * 100); // Convert to cents for precision
        points += 2; // 2 points per token transaction
      } else if (tx.dataType === 'thank_you') {
        thankYous++;
        points += 1; // 1 point per thank you
      }
    });
    
    // ====== STEP 1C: Process token purchases ======
    purchaseSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      tokenTransactions.push({
        id: docSnap.id,
        type: 'token_purchase',
        amount: data.dollarValue || 0,
        timestamp: data.timestamp,
        fromName: 'Token Purchase',
        tokens: data.tokens || 0,
        message: `Purchased ${data.tokens || 0} TOA tokens`
      });
    });
    
    // ====== STEP 2: Load payouts ======
    const payoutQuery = query(
      collection(db, 'payouts'),
      where('technicianId', '==', technicianId)
    );
    const payoutSnapshot = await getDocs(payoutQuery);
    
    const payoutTransactions: any[] = [];
    let totalPayoutsCents = 0;
    
    payoutSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const amountCents = data.amount || 0; // Already in cents
      
      payoutTransactions.push({
        id: docSnap.id,
        type: 'payout',
        amount: -(amountCents / 100), // Convert to dollars, negative
        timestamp: data.createdAt,
        status: data.status
      });
      
      if (data.status === 'completed' || data.status === 'pending') {
        totalPayoutsCents += amountCents;
      }
    });
    
    // ====== STEP 3: Calculate final numbers ======
    const totalEarnings = totalEarningsCents / 100; // Convert to dollars
    const totalPayouts = totalPayoutsCents / 100; // Convert to dollars
    const availableBalance = Math.max(0, totalEarnings - totalPayouts);
    
    // ====== STEP 4: Combine all activity ======
    const allActivity = [...tokenTransactions, ...payoutTransactions].sort((a, b) => {
      const aTime = a.timestamp?.toDate?.() || new Date(0);
      const bTime = b.timestamp?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
    
    return {
      tokenTransactions,
      payoutTransactions,
      allActivity,
      totalTokensReceived: totalTokens,
      totalEarnings,
      totalPayouts,
      availableBalance,
      totalPoints: points,
      totalThankYous: thankYous,
      transactionCount: tokenTransactions.length,
      payoutCount: payoutTransactions.length
    };
    
  } catch (error) {
    logger.error('❌ Error loading dashboard:', error);
    throw error;
  }
}
