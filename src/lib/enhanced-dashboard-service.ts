/**
 * Enhanced Dashboard Transaction Service
 * Provides enhanced transaction data for technician and client dashboards
 * Leverages the comprehensive transaction logging system
 */

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  getDoc,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { TokenTransaction } from './tokens';
import { EnhancedTransaction } from './admin-transaction-manager';

export interface DashboardTransaction extends EnhancedTransaction {
  // Dashboard-specific fields
  displayType: 'toa_received' | 'toa_sent' | 'thank_you_received' | 'thank_you_sent' | 'token_purchase';
  displayTitle: string;
  displayAmount: string;
  displayPoints: string;
  displayStatus: 'success' | 'pending' | 'warning' | 'error';
  displayIcon: string;
  displayColor: string;
  relatedUserName: string;
  relatedUserId: string;
}

export interface DashboardStats {
  // Overview stats
  totalTransactions: number;
  totalRevenue: number;
  totalPoints: number;
  recentActivity: number;
  
  // TOA specific stats
  toaReceived: {
    count: number;
    totalTokens: number;
    totalValue: number;
    totalPayout: number;
  };
  
  toaSent: {
    count: number;
    totalTokens: number;
    totalValue: number;
    totalSpent: number;
  };
  
  thankYous: {
    received: number;
    sent: number;
    pointsEarned: number;
    pointsSpent: number;
  };
  
  // Time-based breakdown
  thisMonth: {
    transactions: number;
    revenue: number;
    points: number;
  };
  
  lastMonth: {
    transactions: number;
    revenue: number;
    points: number;
  };
}

/**
 * Get enhanced transactions for technician dashboard
 */
export async function getEnhancedTechnicianTransactions(
  technicianId: string,
  limit_count: number = 20
): Promise<{transactions: DashboardTransaction[], stats: DashboardStats}> {
  if (!db) {
    return { transactions: [], stats: getEmptyStats() };
  }

  try {
    // Get token transactions where technician is receiver
    const tokenTransactionsRef = collection(db, 'tokenTransactions');
    const tokenQuery = query(
      tokenTransactionsRef,
      where('toTechnicianId', '==', technicianId),
      orderBy('timestamp', 'desc'),
      limit(limit_count)
    );

    const snapshot = await getDocs(tokenQuery);
    const transactions: DashboardTransaction[] = [];
    const stats = getEmptyStats();

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as TokenTransaction;
      
      // Get customer name
      let customerName = 'Anonymous Customer';
      try {
        if (data.fromUserId) {
          const customerDoc = await getDoc(doc(db, 'users', data.fromUserId));
          if (customerDoc.exists()) {
            const customerData = customerDoc.data();
            customerName = customerData.name || customerData.displayName || customerData.email || 'Customer';
          }
        }
      } catch (error) {
        console.warn('Could not fetch customer name:', error);
      }

      // Create enhanced transaction
      const enhancedTransaction = createTechnicianTransaction(
        { ...data, id: docSnap.id },
        customerName
      );
      
      transactions.push(enhancedTransaction);
      
      // Update stats
      updateTechnicianStats(stats, enhancedTransaction);
    }

    return { transactions, stats };

  } catch (error) {
    console.error('Error getting enhanced technician transactions:', error);
    return { transactions: [], stats: getEmptyStats() };
  }
}

/**
 * Get enhanced transactions for client dashboard
 */
export async function getEnhancedClientTransactions(
  clientId: string,
  limit_count: number = 20
): Promise<{transactions: DashboardTransaction[], stats: DashboardStats}> {
  if (!db) {
    return { transactions: [], stats: getEmptyStats() };
  }

  try {
    // Get token transactions where client is sender
    const tokenTransactionsRef = collection(db, 'tokenTransactions');
    const tokenQuery = query(
      tokenTransactionsRef,
      where('fromUserId', '==', clientId),
      orderBy('timestamp', 'desc'),
      limit(limit_count)
    );

    const snapshot = await getDocs(tokenQuery);
    const transactions: DashboardTransaction[] = [];
    const stats = getEmptyStats();

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as TokenTransaction;
      
      // Get technician name
      let technicianName = 'Unknown Technician';
      try {
        if (data.toTechnicianId) {
          const techDoc = await getDoc(doc(db, 'technicians', data.toTechnicianId));
          if (techDoc.exists()) {
            const techData = techDoc.data();
            technicianName = techData.name || techData.businessName || 'Technician';
          } else {
            // Try users collection
            const userDoc = await getDoc(doc(db, 'users', data.toTechnicianId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              technicianName = userData.name || userData.displayName || userData.email || 'Technician';
            }
          }
        }
      } catch (error) {
        console.warn('Could not fetch technician name:', error);
      }

      // Create enhanced transaction
      const enhancedTransaction = createClientTransaction(
        { ...data, id: docSnap.id },
        technicianName
      );
      
      transactions.push(enhancedTransaction);
      
      // Update stats
      updateClientStats(stats, enhancedTransaction);
    }

    return { transactions, stats };

  } catch (error) {
    console.error('Error getting enhanced client transactions:', error);
    return { transactions: [], stats: getEmptyStats() };
  }
}

/**
 * Create enhanced transaction for technician view
 */
function createTechnicianTransaction(
  transaction: TokenTransaction,
  customerName: string
): DashboardTransaction {
  const timestamp = transaction.timestamp instanceof Date 
    ? transaction.timestamp 
    : transaction.timestamp && typeof (transaction.timestamp as any).toDate === 'function'
      ? new Date((transaction.timestamp as any).toDate())
      : new Date(transaction.timestamp || new Date());
  
  const displayType = transaction.type === 'toa' ? 'toa_received' : 'thank_you_received';
  const isTOA = transaction.type === 'toa';
  const isThankYou = transaction.type === 'thank_you' || transaction.type === 'thankyou';
  
  return {
    ...transaction,
    fromUserName: customerName,
    toTechnicianName: 'You',
    formattedTimestamp: timestamp.toLocaleString(),
    hasIssues: checkTransactionIssues(transaction).length > 0,
    issues: checkTransactionIssues(transaction),
    
    // Dashboard-specific fields
    displayType,
    displayTitle: isTOA 
      ? `TOA Tokens from ${customerName}` 
      : `Thank You from ${customerName}`,
    displayAmount: isTOA && transaction.dollarValue 
      ? `+$${transaction.dollarValue.toFixed(2)}`
      : '',
    displayPoints: transaction.pointsAwarded 
      ? `+${transaction.pointsAwarded} ${transaction.pointsAwarded === 1 ? 'Point' : 'Points'}`
      : '',
    displayStatus: transaction.pointsAwarded ? 'success' : 'warning',
    displayIcon: isTOA ? '💰' : '🙏',
    displayColor: isTOA ? 'blue' : 'green',
    relatedUserName: customerName,
    relatedUserId: transaction.fromUserId
  };
}

/**
 * Create enhanced transaction for client view
 */
function createClientTransaction(
  transaction: TokenTransaction,
  technicianName: string
): DashboardTransaction {
  const timestamp = transaction.timestamp instanceof Date 
    ? transaction.timestamp 
    : transaction.timestamp && typeof (transaction.timestamp as any).toDate === 'function'
      ? new Date((transaction.timestamp as any).toDate())
      : new Date(transaction.timestamp || new Date());
  
  const displayType = transaction.toTechnicianId === '' ? 'token_purchase' :
    transaction.type === 'toa' ? 'toa_sent' : 'thank_you_sent';
  const isTOA = transaction.type === 'toa';
  const isThankYou = transaction.type === 'thank_you' || transaction.type === 'thankyou';
  const isTokenPurchase = transaction.toTechnicianId === '';
  
  return {
    ...transaction,
    fromUserName: 'You',
    toTechnicianName: isTokenPurchase ? 'ThankATech' : technicianName,
    formattedTimestamp: timestamp.toLocaleString(),
    hasIssues: checkTransactionIssues(transaction).length > 0,
    issues: checkTransactionIssues(transaction),
    
    // Dashboard-specific fields
    displayType,
    displayTitle: isTokenPurchase 
      ? `Token Purchase (${transaction.tokens} TOA tokens)` 
      : isTOA 
        ? `TOA Tokens to ${technicianName}` 
        : `Thank You to ${technicianName}`,
    displayAmount: isTOA && transaction.dollarValue && !isTokenPurchase
      ? `-$${transaction.dollarValue.toFixed(2)}`
      : isTokenPurchase && transaction.dollarValue
        ? `-$${transaction.dollarValue.toFixed(2)}`
        : '',
    displayPoints: transaction.pointsAwarded 
      ? `+${transaction.pointsAwarded} ${transaction.pointsAwarded === 1 ? 'Point' : 'Points'}`
      : '',
    displayStatus: transaction.pointsAwarded ? 'success' : 'warning',
    displayIcon: isTokenPurchase ? '🛒' : isTOA ? '💰' : '🙏',
    displayColor: isTokenPurchase ? 'purple' : isTOA ? 'blue' : 'green',
    relatedUserName: isTokenPurchase ? 'ThankATech' : technicianName,
    relatedUserId: transaction.toTechnicianId
  };
}

/**
 * Check transaction for issues
 */
function checkTransactionIssues(transaction: TokenTransaction): string[] {
  const issues: string[] = [];
  
  if (!transaction.pointsAwarded && (transaction.type === 'thank_you' || transaction.type === 'thankyou')) {
    issues.push('Missing points for thank you');
  }
  
  if (transaction.type === 'toa' && transaction.tokens > 0 && !transaction.dollarValue) {
    issues.push('Missing dollar value for TOA');
  }
  
  if (transaction.type === 'toa' && transaction.tokens > 0 && !transaction.technicianPayout) {
    issues.push('Missing technician payout');
  }
  
  return issues;
}

/**
 * Update technician stats
 */
function updateTechnicianStats(stats: DashboardStats, transaction: DashboardTransaction): void {
  stats.totalTransactions++;
  
  if (transaction.pointsAwarded) {
    stats.totalPoints += transaction.pointsAwarded;
  }
  
  if (transaction.displayType === 'toa_received') {
    stats.toaReceived.count++;
    stats.toaReceived.totalTokens += transaction.tokens;
    if (transaction.dollarValue) {
      stats.toaReceived.totalValue += transaction.dollarValue;
      stats.totalRevenue += transaction.dollarValue;
    }
    if (transaction.technicianPayout) {
      stats.toaReceived.totalPayout += transaction.technicianPayout;
    }
  } else if (transaction.displayType === 'thank_you_received') {
    stats.thankYous.received++;
    if (transaction.pointsAwarded) {
      stats.thankYous.pointsEarned += transaction.pointsAwarded;
    }
  }
  
  // Update monthly stats (simplified - last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const transactionDate = new Date(transaction.timestamp);
  if (transactionDate > thirtyDaysAgo) {
    stats.thisMonth.transactions++;
    if (transaction.dollarValue) {
      stats.thisMonth.revenue += transaction.dollarValue;
    }
    if (transaction.pointsAwarded) {
      stats.thisMonth.points += transaction.pointsAwarded;
    }
  }
}

/**
 * Update client stats
 */
function updateClientStats(stats: DashboardStats, transaction: DashboardTransaction): void {
  stats.totalTransactions++;
  
  if (transaction.pointsAwarded) {
    stats.totalPoints += transaction.pointsAwarded;
  }
  
  if (transaction.displayType === 'toa_sent') {
    stats.toaSent.count++;
    stats.toaSent.totalTokens += transaction.tokens;
    if (transaction.dollarValue) {
      stats.toaSent.totalValue += transaction.dollarValue;
      stats.toaSent.totalSpent += transaction.dollarValue;
    }
  } else if (transaction.displayType === 'thank_you_sent') {
    stats.thankYous.sent++;
    if (transaction.pointsAwarded) {
      stats.thankYous.pointsSpent += transaction.pointsAwarded;
    }
  } else if (transaction.displayType === 'token_purchase') {
    if (transaction.dollarValue) {
      stats.totalRevenue += transaction.dollarValue; // Money spent on tokens
    }
  }
  
  // Update monthly stats (simplified - last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const transactionDate = new Date(transaction.timestamp);
  if (transactionDate > thirtyDaysAgo) {
    stats.thisMonth.transactions++;
    if (transaction.dollarValue) {
      stats.thisMonth.revenue += transaction.dollarValue;
    }
    if (transaction.pointsAwarded) {
      stats.thisMonth.points += transaction.pointsAwarded;
    }
  }
}

/**
 * Get empty stats object
 */
function getEmptyStats(): DashboardStats {
  return {
    totalTransactions: 0,
    totalRevenue: 0,
    totalPoints: 0,
    recentActivity: 0,
    
    toaReceived: {
      count: 0,
      totalTokens: 0,
      totalValue: 0,
      totalPayout: 0,
    },
    
    toaSent: {
      count: 0,
      totalTokens: 0,
      totalValue: 0,
      totalSpent: 0,
    },
    
    thankYous: {
      received: 0,
      sent: 0,
      pointsEarned: 0,
      pointsSpent: 0,
    },
    
    thisMonth: {
      transactions: 0,
      revenue: 0,
      points: 0,
    },
    
    lastMonth: {
      transactions: 0,
      revenue: 0,
      points: 0,
    }
  };
}