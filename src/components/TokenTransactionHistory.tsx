'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit as firestoreLimit, getDocs } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/lib/firebase';
import { formatTokens } from '@/lib/tokens';
import { logger } from '@/lib/logger';

interface Transaction {
  id: string;
  fromUserId: string;
  toTechnicianId: string;
  fromName?: string;
  toName?: string;
  tokens: number;
  message: string;
  timestamp: any;
  type: string;
  dollarValue?: number;
  pointsAwarded?: number;
}

interface TokenTransactionHistoryProps {
  userId: string;
  userType: 'client' | 'technician';
  isOpen: boolean;
  onClose: () => void;
}

export default function TokenTransactionHistory({ 
  userId, 
  userType, 
  isOpen, 
  onClose 
}: TokenTransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received' | 'purchases' | 'conversions'>('all');
  const [technicianDocId, setTechnicianDocId] = useState<string>('');
  const [clientDocId, setClientDocId] = useState<string>('');

  useEffect(() => {
    if (isOpen && userId) {
      loadTransactionHistory();
    }
  }, [isOpen, userId, userType]);

  const loadTransactionHistory = async () => {
    setLoading(true);
    try {
      let allTransactions: Transaction[] = [];
      
      if (userType === 'technician') {
        // First, find the technician's document ID using authUid
        const { doc, getDoc } = await import('firebase/firestore');
        const techniciansQuery = query(
          collection(db, COLLECTIONS.TECHNICIANS),
          where('authUid', '==', userId)
        );
        const techSnapshot = await getDocs(techniciansQuery);
        
        if (techSnapshot.empty) {
          logger.warn('No technician found with authUid:', userId);
          setTransactions([]);
          setLoading(false);
          return;
        }
        
        const techDoc = techSnapshot.docs[0];
        const techDocId = techDoc.id;
        const techData = techDoc.data();
        
        setTechnicianDocId(techDocId); // Store for filtering
        
        logger.info(`Loading transaction history for technician: ${techDocId}, authUid: ${userId}, email: ${techData?.email}`);
        
        // Query transactions by document ID
        const query1 = query(
          collection(db, COLLECTIONS.TOKEN_TRANSACTIONS),
          where('toTechnicianId', '==', techDocId),
          orderBy('timestamp', 'desc'),
          firestoreLimit(50)
        );
        const snapshot1 = await getDocs(query1);
        allTransactions.push(...snapshot1.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Transaction)));
        
        // Query by email if available (for legacy transactions)
        if (techData?.email) {
          const query2 = query(
            collection(db, COLLECTIONS.TOKEN_TRANSACTIONS),
            where('toTechnicianEmail', '==', techData.email),
            orderBy('timestamp', 'desc'),
            firestoreLimit(50)
          );
          const snapshot2 = await getDocs(query2);
          snapshot2.docs.forEach(doc => {
            if (!allTransactions.find(t => t.id === doc.id)) {
              allTransactions.push({
                id: doc.id,
                ...doc.data()
              } as Transaction);
            }
          });
        }
        
        // Load points conversion history for technician using authUid
        const conversionsQuery = query(
          collection(db, 'pointsConversions'),
          where('userId', '==', userId),
          firestoreLimit(50)
        );
        const conversionsSnapshot = await getDocs(conversionsQuery);
        const conversionTransactions = conversionsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            fromUserId: userId,
            toTechnicianId: '',
            fromName: 'System',
            toName: 'You',
            tokens: data.tokensGenerated,
            message: `Converted ${data.pointsConverted} points to ${data.tokensGenerated} TOA`,
            timestamp: data.createdAt,
            type: 'points_conversion',
            dollarValue: 0,
            pointsAwarded: -data.pointsConverted
          } as Transaction;
        });
        
        // Add conversions to transactions
        allTransactions.push(...conversionTransactions);
        
        // Sort by timestamp descending
        allTransactions.sort((a, b) => {
          const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
          const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
          return bTime.getTime() - aTime.getTime();
        });
        
        setTransactions(allTransactions);
      } else {
        // For clients, find document ID using authUid
        const clientsQuery = query(
          collection(db, COLLECTIONS.CLIENTS),
          where('authUid', '==', userId)
        );
        const clientSnapshot = await getDocs(clientsQuery);
        
        if (clientSnapshot.empty) {
          logger.warn('No client found with authUid:', userId);
          setTransactions([]);
          setLoading(false);
          return;
        }
        
        const clientDocId = clientSnapshot.docs[0].id;
        setClientDocId(clientDocId); // Store for filtering
        logger.info(`Loading transaction history for client: ${clientDocId}, authUid: ${userId}`);
        
        // Load transactions sent by this client (using document ID)
        const tokenTransactionsQuery = query(
          collection(db, COLLECTIONS.TOKEN_TRANSACTIONS),
          where('fromUserId', '==', clientDocId),
          orderBy('timestamp', 'desc'),
          firestoreLimit(50)
        );
        
        const snapshot = await getDocs(tokenTransactionsQuery);
        logger.info(`Found ${snapshot.docs.length} sent transactions for client ${clientDocId}`);
        const transactionList = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          logger.info('Sent transaction:', { id: doc.id, type: data.type, fromUserId: data.fromUserId, tokens: data.tokens });
          return {
            id: doc.id,
            fromUserId: data.fromUserId || '',
            toTechnicianId: data.toTechnicianId || '',
            fromName: data.fromName,
            toName: data.toName,
            tokens: data.tokens || 0,
            message: data.message || '',
            timestamp: data.timestamp,
            type: data.type || '',
            dollarValue: data.dollarValue,
            pointsAwarded: data.pointsAwarded
          } as Transaction;
        });

        // Load token purchases (stored with authUid, not document ID)
        const purchasesQuery = query(
          collection(db, COLLECTIONS.TOKEN_TRANSACTIONS),
          where('fromUserId', '==', userId),
          where('type', '==', 'token_purchase'),
          firestoreLimit(50)
        );
        const purchasesSnapshot = await getDocs(purchasesQuery);
        const purchaseTransactions = purchasesSnapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            fromUserId: data.fromUserId || '',
            toTechnicianId: data.toTechnicianId || '',
            fromName: data.fromName,
            toName: data.toName,
            tokens: data.tokens || 0,
            message: data.message || '',
            timestamp: data.timestamp,
            type: data.type || '',
            dollarValue: data.dollarValue,
            pointsAwarded: data.pointsAwarded
          } as Transaction;
        });

        // Load points conversion history using authUid
        const conversionsQuery = query(
          collection(db, 'pointsConversions'),
          where('userId', '==', userId),
          firestoreLimit(50)
        );
        const conversionsSnapshot = await getDocs(conversionsQuery);
        const conversionTransactions = conversionsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            fromUserId: userId,
            toTechnicianId: '',
            fromName: 'System',
            toName: 'You',
            tokens: data.tokensGenerated,
            message: `Converted ${data.pointsConverted} points to ${data.tokensGenerated} TOA`,
            timestamp: data.createdAt,
            type: 'points_conversion',
            dollarValue: 0,
            pointsAwarded: -data.pointsConverted
          } as Transaction;
        });

        // Combine and sort by timestamp descending
        allTransactions = [...transactionList, ...purchaseTransactions, ...conversionTransactions].sort((a, b) => {
          const aTime = a.timestamp?.toDate?.() || new Date(a.timestamp);
          const bTime = b.timestamp?.toDate?.() || new Date(b.timestamp);
          return bTime.getTime() - aTime.getTime();
        });

        setTransactions(allTransactions);
      }
    } catch (error) {
      logger.error('Error loading transaction history:', error);
    }
    setLoading(false);
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    if (filter === 'sent' && userType === 'client') return transaction.fromUserId === clientDocId && transaction.type !== 'token_purchase' && transaction.type !== 'points_conversion';
    if (filter === 'received' && userType === 'technician') return transaction.toTechnicianId === technicianDocId;
    if (filter === 'purchases') return transaction.type === 'token_purchase';
    if (filter === 'conversions') return transaction.type === 'points_conversion';
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-2xl shadow-2xl border border-white/20 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-6 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Token Transaction History</h2>
              <p className="text-slate-300">Complete record of your token activity</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 text-2xl font-bold p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-4">
            <span className="text-white font-medium">Filter:</span>
            <div className="flex gap-2 flex-wrap">
              {['all', userType === 'client' ? 'sent' : 'received', 'purchases', 'conversions'].map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === filterOption
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20'
                  }`}
                >
                  {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="flex-1 overflow-y-auto p-6 max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <span className="text-white ml-3">Loading transactions...</span>
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => {
                const timestamp = new Date(transaction.timestamp?.toDate ? transaction.timestamp.toDate() : transaction.timestamp);
                const isReceived = userType === 'technician';
                
                return (
                  <div key={transaction.id} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-lg ${
                            transaction.type === 'token_purchase' ? 'bg-purple-500/20' :
                            transaction.type === 'points_conversion' ? 'bg-purple-600/20' :
                            transaction.type === 'thank_you' ? 'bg-green-500/20' :
                            'bg-blue-500/20'
                          }`}>
                            <span className="text-lg">
                              {transaction.type === 'token_purchase' ? '🛒' :
                               transaction.type === 'points_conversion' ? '🔄' :
                               transaction.type === 'thank_you' ? '🙏' : '🪙'}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-semibold">
                              {transaction.type === 'token_purchase' ? 'Token Purchase' :
                               transaction.type === 'points_conversion' ? 'Points Conversion' :
                               isReceived ? `From ${transaction.fromName || 'Client'}` :
                               `To ${transaction.toName || 'Technician'}`}
                            </p>
                            <p className="text-slate-400 text-sm">
                              {timestamp.toLocaleDateString()} at {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        
                        {transaction.message && transaction.type !== 'token_purchase' && (
                          <div className="bg-white/5 rounded-lg p-3 mt-3">
                            <p className="text-slate-300 text-sm italic">"{transaction.message}"</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-purple-400 font-bold">
                            {formatTokens(transaction.tokens)}
                          </span>
                        </div>
                        {transaction.type !== 'points_conversion' && (
                          <p className="text-green-400 font-bold">
                            {formatCurrency(transaction.dollarValue || 0)}
                          </p>
                        )}
                        {transaction.pointsAwarded && (
                          <p className={`text-sm ${transaction.pointsAwarded > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                            {transaction.pointsAwarded > 0 ? '+' : ''}{transaction.pointsAwarded} points
                          </p>
                        )}
                        <p className={`text-xs mt-1 ${
                          transaction.type === 'points_conversion' ? 'text-purple-400' :
                          isReceived ? 'text-green-400' : 'text-blue-400'
                        }`}>
                          {transaction.type === 'token_purchase' ? 'Purchased' :
                           transaction.type === 'points_conversion' ? 'Converted' :
                           isReceived ? 'Received' : 'Sent'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-slate-600/50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-slate-300 mb-2">No transactions found</p>
              <p className="text-slate-400 text-sm">
                {filter === 'all' ? 'No token transactions yet' : `No ${filter} transactions found`}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-white/5">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </p>
            <button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
