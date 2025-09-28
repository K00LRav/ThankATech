'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function DebugTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!db) {
        console.log('Firebase not configured');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching transactions from Firebase...');
        const tipsQuery = query(
          collection(db, 'tips'),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        
        const tipsSnapshot = await getDocs(tipsQuery);
        const transactionsList = tipsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('Found transactions:', transactionsList);
        setTransactions(transactionsList);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">🔍 Transaction Debug</h1>
          <p>Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔍 Transaction Debug</h1>
        
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Firebase Tips Collection</h2>
          <p className="text-blue-200 mb-4">Found: {transactions.length} transactions</p>
          
          {transactions.length === 0 ? (
            <div className="text-yellow-300 p-4 bg-yellow-900/20 rounded-lg">
              ⚠️ No transactions found in Firebase. This means tips are not being recorded.
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction, index) => (
                <div key={transaction.id} className="bg-slate-700 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Amount:</strong> ${(transaction.amount / 100).toFixed(2)}
                    </div>
                    <div>
                      <strong>Status:</strong> {transaction.status}
                    </div>
                    <div>
                      <strong>Technician ID:</strong> {transaction.technicianId}
                    </div>
                    <div>
                      <strong>Customer ID:</strong> {transaction.customerId}
                    </div>
                    <div>
                      <strong>Payment Intent:</strong> {transaction.paymentIntentId}
                    </div>
                    <div>
                      <strong>Created:</strong> {new Date(transaction.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="text-center">
          <a 
            href="/" 
            className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}