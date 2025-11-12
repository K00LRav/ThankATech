/**
 * Clean, simplified technician dashboard data loader
 * REBUILT FROM SCRATCH - November 12, 2025
 */

import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
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
    logger.info(`🔄 REBUILDING technician dashboard for: ${technicianId}`);
    
    // Get technician info
    const techDoc = await getDoc(doc(db, COLLECTIONS.TECHNICIANS, technicianId));
    if (!techDoc.exists()) {
      throw new Error(`Technician not found: ${technicianId}`);
    }
    const techData = techDoc.data();
    
    // ====== STEP 1: Load token transactions ======
    const txQuery = query(
      collection(db, COLLECTIONS.TOKEN_TRANSACTIONS),
      where('toTechnicianId', '==', technicianId)
    );
    const txSnapshot = await getDocs(txQuery);
    
    logger.info(`Found ${txSnapshot.docs.length} transactions`);
    
    const tokenTransactions: any[] = [];
    let totalTokens = 0;
    let totalEarningsCents = 0;
    let points = 0;
    let thankYous = 0;
    
    txSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      
      // The data coming from Firebase has:
      // - tokens: number of tokens
      // - technicianPayout: dollar amount (e.g., 3.40 for 400 tokens)
      // We DON'T multiply by 100 here - just use it as-is
      
      const dollarAmount = data.technicianPayout || 0;
      const tokens = data.tokens || 0;
      
      logger.info(`TX: ${tokens} tokens = $${dollarAmount.toFixed(2)} (${data.type})`);
      
      tokenTransactions.push({
        id: docSnap.id,
        type: data.type,
        amount: dollarAmount, // Keep in dollars
        timestamp: data.timestamp,
        fromName: data.fromName || 'Customer',
        tokens: tokens,
        message: data.message || ''
      });
      
      // Calculate totals
      if (data.type === 'toa_token' || data.type === 'toa') {
        totalTokens += tokens;
        totalEarningsCents += Math.round(dollarAmount * 100); // Convert to cents for precision
        points += 2;
      } else if (data.type === 'thank_you') {
        thankYous++;
        points += 1;
      }
    });
    
    // ====== STEP 2: Load payouts ======
    const payoutQuery = query(
      collection(db, 'payouts'),
      where('technicianId', '==', technicianId)
    );
    const payoutSnapshot = await getDocs(payoutQuery);
    
    logger.info(`Found ${payoutSnapshot.docs.length} payouts`);
    
    const payoutTransactions: any[] = [];
    let totalPayoutsCents = 0;
    
    payoutSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const amountCents = data.amount || 0; // Already in cents
      
      logger.info(`Payout: $${(amountCents/100).toFixed(2)} (${data.status})`);
      
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
    
    // ====== STEP 5: Log summary ======
    logger.info(`📊 SUMMARY:`);
    logger.info(`  Tokens: ${totalTokens} TOA`);
    logger.info(`  Earnings: $${totalEarnings.toFixed(2)}`);
    logger.info(`  Payouts: $${totalPayouts.toFixed(2)}`);
    logger.info(`  Available: $${availableBalance.toFixed(2)}`);
    logger.info(`  Points: ${points}`);
    
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
