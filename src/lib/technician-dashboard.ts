/**
 * Clean, simplified technician dashboard data loader
 * Loads ALL data needed for technician dashboard in one place
 */

import { collection, query, where, getDocs, getDoc, doc, orderBy } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import { logger } from './logger';

export interface TechnicianDashboardData {
  // Transactions
  tokenTransactions: any[];
  payoutTransactions: any[];
  allActivity: any[];
  
  // Summary
  totalTokensReceived: number;
  totalEarnings: number; // in dollars
  totalPayouts: number; // in dollars
  availableBalance: number; // in dollars
  totalPoints: number;
  totalThankYous: number;
  
  // Counts
  transactionCount: number;
  payoutCount: number;
}

export async function loadTechnicianDashboard(technicianId: string): Promise<TechnicianDashboardData> {
  try {
    logger.info(`🔄 Loading technician dashboard for: ${technicianId}`);
    
    // Get technician document
    const techDoc = await getDoc(doc(db, COLLECTIONS.TECHNICIANS, technicianId));
    if (!techDoc.exists()) {
      throw new Error(`Technician document not found: ${technicianId}`);
    }
    
    const techData = techDoc.data();
    const techEmail = techData.email;
    
    logger.info(`👤 Loading data for: ${techData.name} (${techEmail})`);
    
    // ====== LOAD TOKEN TRANSACTIONS ======
    const tokenTransactions: any[] = [];
    const seenIds = new Set<string>();
    
    // Query 1: By technician document ID
    const query1 = query(
      collection(db, COLLECTIONS.TOKEN_TRANSACTIONS),
      where('toTechnicianId', '==', technicianId),
      orderBy('timestamp', 'desc')
    );
    const snapshot1 = await getDocs(query1);
    
    // Query 2: By email (for legacy/backup)
    let snapshot2: any = { docs: [] };
    if (techEmail) {
      try {
        const query2 = query(
          collection(db, COLLECTIONS.TOKEN_TRANSACTIONS),
          where('toTechnicianEmail', '==', techEmail),
          orderBy('timestamp', 'desc')
        );
        snapshot2 = await getDocs(query2);
      } catch (error) {
        logger.warn('Email query failed, continuing with ID query only:', error);
      }
    }
    
    // Combine and deduplicate
    [...snapshot1.docs, ...snapshot2.docs].forEach(docSnapshot => {
      if (!seenIds.has(docSnapshot.id)) {
        seenIds.add(docSnapshot.id);
        const data = docSnapshot.data();
        tokenTransactions.push({
          id: docSnapshot.id,
          type: data.type,
          amount: (data.technicianPayout || data.dollarValue || 0) * 100, // cents
          timestamp: data.timestamp,
          fromName: data.fromName || 'Customer',
          toName: data.toName || techData.name,
          tokens: data.tokens || 0,
          message: data.message || '',
          pointsAwarded: data.pointsAwarded || 0
        });
      }
    });
    
    logger.info(`💰 Found ${tokenTransactions.length} token transactions`);
    
    // ====== LOAD PAYOUTS ======
    const payoutQuery = query(
      collection(db, 'payouts'),
      where('technicianId', '==', technicianId),
      orderBy('createdAt', 'desc')
    );
    
    const payoutSnapshot = await getDocs(payoutQuery);
    const payoutTransactions: any[] = [];
    
    payoutSnapshot.docs.forEach(docSnapshot => {
      const data = docSnapshot.data();
      payoutTransactions.push({
        id: docSnapshot.id,
        type: 'payout',
        amount: -(data.amount || 0), // Negative for withdrawals, in cents
        timestamp: data.createdAt,
        status: data.status,
        transferId: data.transferId,
        stripeAccountId: data.stripeAccountId
      });
    });
    
    logger.info(`💸 Found ${payoutTransactions.length} payouts`);
    
    // ====== CALCULATE SUMMARY ======
    let totalTokensReceived = 0;
    let totalEarnings = 0; // cents
    let totalPoints = 0;
    let totalThankYous = 0;
    
    tokenTransactions.forEach(t => {
      if (t.type === 'toa_token' || t.type === 'toa') {
        totalTokensReceived += t.tokens;
        totalEarnings += t.amount; // cents
        totalPoints += 2;
      } else if (t.type === 'thank_you') {
        totalThankYous++;
        totalPoints += 1;
      }
    });
    
    // Calculate total payouts (only completed/pending)
    let totalPayouts = 0; // cents
    payoutTransactions.forEach(p => {
      if (p.status === 'completed' || p.status === 'pending') {
        totalPayouts += Math.abs(p.amount); // already negative, make positive for sum
      }
    });
    
    const availableBalance = Math.max(0, totalEarnings - totalPayouts);
    
    // ====== COMBINE ALL ACTIVITY ======
    const allActivity = [...tokenTransactions, ...payoutTransactions].sort((a, b) => {
      const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
      const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
      return bTime.getTime() - aTime.getTime();
    });
    
    // ====== LOG SUMMARY ======
    logger.info(`📊 DASHBOARD SUMMARY:`);
    logger.info(`  Transactions: ${tokenTransactions.length}`);
    logger.info(`  Payouts: ${payoutTransactions.length}`);
    logger.info(`  Total Tokens: ${totalTokensReceived} TOA`);
    logger.info(`  Total Earnings: $${(totalEarnings / 100).toFixed(2)}`);
    logger.info(`  Total Payouts: $${(totalPayouts / 100).toFixed(2)}`);
    logger.info(`  Available Balance: $${(availableBalance / 100).toFixed(2)}`);
    logger.info(`  Points: ${totalPoints}`);
    logger.info(`  Thank Yous: ${totalThankYous}`);
    
    return {
      tokenTransactions,
      payoutTransactions,
      allActivity,
      totalTokensReceived,
      totalEarnings: totalEarnings / 100, // convert to dollars
      totalPayouts: totalPayouts / 100, // convert to dollars
      availableBalance: availableBalance / 100, // convert to dollars
      totalPoints,
      totalThankYous,
      transactionCount: tokenTransactions.length,
      payoutCount: payoutTransactions.length
    };
    
  } catch (error) {
    logger.error('❌ Error loading technician dashboard:', error);
    throw error;
  }
}
