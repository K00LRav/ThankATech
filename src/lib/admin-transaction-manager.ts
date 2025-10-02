/**
 * Admin Transaction Management System
 * Comprehensive tool for viewing, analyzing, and fixing transaction logs
 */

import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit,
  where,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  startAfter,
  Query
} from 'firebase/firestore';
import { db } from './firebase';
import { TokenTransaction } from './tokens';

export interface TransactionAnalysis {
  totalTransactions: number;
  transactionsByType: Record<string, number>;
  pointsIssues: {
    missingPoints: number;
    zeroPoints: number;
    inconsistentPoints: number;
  };
  revenueData: {
    totalRevenue: number;
    totalPayouts: number;
    totalPlatformFees: number;
  };
  recentTransactions: EnhancedTransaction[];
}

export interface EnhancedTransaction extends TokenTransaction {
  fromUserName?: string;
  toTechnicianName?: string;
  formattedTimestamp: string;
  hasIssues: boolean;
  issues: string[];
}

export interface TransactionFilter {
  dateRange?: {
    start: Date;
    end: Date;
  };
  type?: string;
  userId?: string;
  technicianId?: string;
  minTokens?: number;
  maxTokens?: number;
  hasIssues?: boolean;
}

/**
 * Get comprehensive transaction analysis for admin dashboard
 */
export async function analyzeTransactions(): Promise<TransactionAnalysis> {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  try {
    console.log('🔍 Analyzing transaction data...');
    
    // Get all transactions for analysis
    const transactionsRef = collection(db, 'tokenTransactions');
    const allTransQuery = query(transactionsRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(allTransQuery);
    
    const totalTransactions = snapshot.size;
    const transactionsByType: Record<string, number> = {};
    const pointsIssues = {
      missingPoints: 0,
      zeroPoints: 0,
      inconsistentPoints: 0
    };
    const revenueData = {
      totalRevenue: 0,
      totalPayouts: 0, 
      totalPlatformFees: 0
    };
    
    // Get recent transactions with enhanced data
    const recentTransactions: EnhancedTransaction[] = [];
    const recentQuery = query(transactionsRef, orderBy('timestamp', 'desc'), limit(20));
    const recentSnapshot = await getDocs(recentQuery);
    
    // Analyze all transactions
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data() as TokenTransaction;
      const type = data.type || 'unknown';
      
      // Count by type
      transactionsByType[type] = (transactionsByType[type] || 0) + 1;
      
      // Check for points issues
      if (!('pointsAwarded' in data)) {
        pointsIssues.missingPoints++;
      } else if (data.pointsAwarded === 0 && (type === 'thank_you' || type === 'thankyou')) {
        pointsIssues.zeroPoints++;
      } else if (data.pointsAwarded !== getExpectedPoints(data)) {
        pointsIssues.inconsistentPoints++;
      }
      
      // Calculate revenue
      if (data.dollarValue) revenueData.totalRevenue += data.dollarValue;
      if (data.technicianPayout) revenueData.totalPayouts += data.technicianPayout;
      if (data.platformFee) revenueData.totalPlatformFees += data.platformFee;
    });
    
    // Process recent transactions with user names
    for (const docSnap of recentSnapshot.docs) {
      const data = docSnap.data() as TokenTransaction;
      const enhanced = await enhanceTransactionData({
        ...data,
        id: docSnap.id
      });
      recentTransactions.push(enhanced);
    }
    
    console.log(`✅ Analysis complete: ${totalTransactions} transactions analyzed`);
    
    return {
      totalTransactions,
      transactionsByType,
      pointsIssues,
      revenueData,
      recentTransactions
    };
    
  } catch (error) {
    console.error('❌ Error analyzing transactions:', error);
    throw error;
  }
}

/**
 * Get filtered transactions with pagination
 */
export async function getFilteredTransactions(
  filter: TransactionFilter = {},
  pageSize: number = 25,
  lastDoc?: any
): Promise<{transactions: EnhancedTransaction[], hasMore: boolean, lastDoc?: any}> {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  try {
    const transactionsRef = collection(db, 'tokenTransactions');
    let q: Query = query(transactionsRef, orderBy('timestamp', 'desc'));
    
    // Apply filters
    if (filter.type) {
      q = query(q, where('type', '==', filter.type));
    }
    
    if (filter.userId) {
      q = query(q, where('fromUserId', '==', filter.userId));
    }
    
    if (filter.technicianId) {
      q = query(q, where('toTechnicianId', '==', filter.technicianId));
    }
    
    if (filter.dateRange) {
      q = query(q, where('timestamp', '>=', Timestamp.fromDate(filter.dateRange.start)));
      q = query(q, where('timestamp', '<=', Timestamp.fromDate(filter.dateRange.end)));
    }
    
    // Add pagination
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    q = query(q, limit(pageSize + 1)); // +1 to check if there are more
    
    const snapshot = await getDocs(q);
    const docs = snapshot.docs;
    const hasMore = docs.length > pageSize;
    
    // Remove the extra doc if it exists
    if (hasMore) {
      docs.pop();
    }
    
    // Enhance transaction data
    const transactions: EnhancedTransaction[] = [];
    for (const docSnap of docs) {
      const data = docSnap.data() as TokenTransaction;
      const enhanced = await enhanceTransactionData({
        ...data,
        id: docSnap.id
      });
      
      // Apply additional filters that couldn't be done in Firestore
      if (filter.minTokens && enhanced.tokens < filter.minTokens) continue;
      if (filter.maxTokens && enhanced.tokens > filter.maxTokens) continue;
      if (filter.hasIssues !== undefined && enhanced.hasIssues !== filter.hasIssues) continue;
      
      transactions.push(enhanced);
    }
    
    return {
      transactions,
      hasMore,
      lastDoc: hasMore ? docs[docs.length - 1] : undefined
    };
    
  } catch (error) {
    console.error('❌ Error getting filtered transactions:', error);
    throw error;
  }
}

/**
 * Enhance transaction data with user names and issue detection
 */
async function enhanceTransactionData(transaction: TokenTransaction): Promise<EnhancedTransaction> {
  const issues: string[] = [];
  let fromUserName = 'Unknown User';
  let toTechnicianName = 'Unknown Technician';
  
  try {
    // Get user names
    if (transaction.fromUserId) {
      const userDoc = await getDoc(doc(db, 'users', transaction.fromUserId));
      if (userDoc.exists()) {
        fromUserName = userDoc.data().name || userDoc.data().email || 'Unknown User';
      }
    }
    
    if (transaction.toTechnicianId) {
      const techDoc = await getDoc(doc(db, 'technicians', transaction.toTechnicianId));
      if (techDoc.exists()) {
        toTechnicianName = techDoc.data().name || 'Unknown Technician';
      } else {
        // Try users collection
        const userDoc = await getDoc(doc(db, 'users', transaction.toTechnicianId));
        if (userDoc.exists()) {
          toTechnicianName = userDoc.data().name || userDoc.data().email || 'Unknown Technician';
        }
      }
    }
  } catch (error) {
    console.error('Error getting user names:', error);
  }
  
  // Check for issues
  if (!('pointsAwarded' in transaction)) {
    issues.push('Missing pointsAwarded field');
  } else if (transaction.pointsAwarded !== getExpectedPoints(transaction)) {
    issues.push(`Incorrect points: has ${transaction.pointsAwarded}, expected ${getExpectedPoints(transaction)}`);
  }
  
  if (transaction.type === 'toa' && !transaction.dollarValue) {
    issues.push('Missing dollar value for TOA transaction');
  }
  
  if (transaction.type === 'toa' && !transaction.technicianPayout) {
    issues.push('Missing technician payout for TOA transaction');
  }
  
  // Format timestamp
  const timestamp = transaction.timestamp instanceof Timestamp 
    ? transaction.timestamp.toDate() 
    : new Date(transaction.timestamp);
    
  const formattedTimestamp = timestamp.toLocaleString();
  
  return {
    ...transaction,
    fromUserName,
    toTechnicianName,
    formattedTimestamp,
    hasIssues: issues.length > 0,
    issues
  };
}

/**
 * Calculate expected points for a transaction
 */
function getExpectedPoints(transaction: TokenTransaction): number {
  switch (transaction.type) {
    case 'thank_you':
    case 'thankyou':
      return 1; // 1 point for thank you
    case 'toa':
      return transaction.tokens * 2; // 2 points per TOA token
    case 'appreciation':
      return transaction.tokens; // 1 point per appreciation token
    default:
      return 0;
  }
}

/**
 * Fix transaction data issues
 */
export async function fixTransactionIssues(): Promise<{fixed: number, errors: string[]}> {
  if (!db) {
    throw new Error('Firebase not configured');
  }

  const errors: string[] = [];
  let fixed = 0;
  
  try {
    console.log('🔧 Starting transaction fixes...');
    
    const transactionsRef = collection(db, 'tokenTransactions');
    const snapshot = await getDocs(transactionsRef);
    
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as TokenTransaction;
      const expectedPoints = getExpectedPoints(data);
      const updates: any = {};
      
      // Fix missing or incorrect points
      if (!('pointsAwarded' in data) || data.pointsAwarded !== expectedPoints) {
        updates.pointsAwarded = expectedPoints;
        console.log(`Fixing points for ${docSnap.id}: ${data.pointsAwarded || 'missing'} → ${expectedPoints}`);
      }
      
      // Fix missing TOA business model data
      if (data.type === 'toa' && data.tokens > 0) {
        if (!data.dollarValue) {
          updates.dollarValue = data.tokens * 0.01; // $0.01 per TOA
        }
        if (!data.technicianPayout) {
          updates.technicianPayout = data.tokens * 0.0085; // 85% payout
        }
        if (!data.platformFee) {
          updates.platformFee = data.tokens * 0.0015; // 15% platform fee
        }
      }
      
      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        try {
          await updateDoc(doc(db, 'tokenTransactions', docSnap.id), updates);
          fixed++;
        } catch (error) {
          const errorMsg = `Failed to update ${docSnap.id}: ${error}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
    }
    
    console.log(`✅ Fixed ${fixed} transactions`);
    
  } catch (error) {
    console.error('❌ Error fixing transactions:', error);
    errors.push(`Global error: ${error}`);
  }
  
  return { fixed, errors };
}

/**
 * Export transaction data for analysis
 */
export async function exportTransactionData(format: 'csv' | 'json' = 'csv'): Promise<string> {
  const analysis = await analyzeTransactions();
  
  if (format === 'json') {
    return JSON.stringify(analysis, null, 2);
  }
  
  // CSV format
  const csvHeaders = [
    'ID', 'Type', 'From User', 'To Technician', 'Tokens', 'Points Awarded',
    'Dollar Value', 'Technician Payout', 'Platform Fee', 'Timestamp', 'Message', 'Issues'
  ];
  
  const csvRows = analysis.recentTransactions.map(t => [
    t.id,
    t.type,
    t.fromUserName,
    t.toTechnicianName,
    t.tokens,
    t.pointsAwarded || 0,
    t.dollarValue || 0,
    t.technicianPayout || 0,
    t.platformFee || 0,
    t.formattedTimestamp,
    `"${t.message?.replace(/"/g, '""') || ''}"`,
    `"${t.issues.join('; ')}"`
  ]);
  
  return [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
}