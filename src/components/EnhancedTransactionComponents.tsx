/**
 * Enhanced Transaction Display Components
 * Shared components for displaying transaction data consistently across dashboards
 */

import React from 'react';
import { DashboardTransaction, DashboardStats } from '@/lib/enhanced-dashboard-service';

interface TransactionCardProps {
  transaction: DashboardTransaction;
  userType: 'technician' | 'client';
  showDetails?: boolean;
}

interface TransactionListProps {
  transactions: DashboardTransaction[];
  userType: 'technician' | 'client';
  maxItems?: number;
  showHeader?: boolean;
}

interface StatsOverviewProps {
  stats: DashboardStats;
  userType: 'technician' | 'client';
}

/**
 * Enhanced Transaction Card Component
 */
export const EnhancedTransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  userType,
  showDetails = false
}) => {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'green':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'purple':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'red':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500/20 text-green-400';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'error':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className={`p-4 rounded-lg border transition-all duration-200 hover:bg-white/5 ${
      transaction.hasIssues ? 'bg-red-900/10 border-red-500/30' : 'bg-slate-800/50 border-slate-700/50'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Transaction Icon */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
            getColorClasses(transaction.displayColor)
          }`}>
            <span className="text-lg">{transaction.displayIcon}</span>
          </div>
          
          {/* Transaction Details */}
          <div>
            <p className="font-semibold text-white">
              {transaction.displayTitle}
            </p>
            <p className="text-sm text-slate-400">
              {transaction.formattedTimestamp}
            </p>
            {showDetails && transaction.message && (
              <p className="text-sm text-slate-300 mt-1 italic">
                "{transaction.message}"
              </p>
            )}
          </div>
        </div>
        
        {/* Transaction Values */}
        <div className="text-right">
          {/* Dollar Amount */}
          {transaction.displayAmount && (
            <p className={`text-lg font-bold ${
              userType === 'client' && transaction.displayAmount.startsWith('-') 
                ? 'text-red-400' 
                : 'text-green-400'
            }`}>
              {transaction.displayAmount}
            </p>
          )}
          
          {/* Points */}
          {transaction.displayPoints && (
            <p className="text-blue-400 font-semibold text-sm">
              {transaction.displayPoints}
            </p>
          )}
          
          {/* Token Count for TOA */}
          {transaction.tokens > 0 && (transaction.displayType === 'toa_received' || transaction.displayType === 'toa_sent') && (
            <p className="text-slate-300 text-sm">
              {transaction.tokens} TOA token{transaction.tokens !== 1 ? 's' : ''}
            </p>
          )}
          
          {/* Status Badge */}
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
            getStatusClasses(transaction.displayStatus)
          }`}>
            {transaction.hasIssues ? 'Issues' : 'Completed'}
          </span>
          
          {/* Issue Indicators */}
          {transaction.hasIssues && showDetails && (
            <div className="mt-2 space-y-1">
              {transaction.issues.slice(0, 2).map((issue, idx) => (
                <div key={idx} className="text-xs text-red-300 bg-red-900/20 px-2 py-1 rounded">
                  {issue}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Enhanced Transaction List Component
 */
export const EnhancedTransactionList: React.FC<TransactionListProps> = ({
  transactions,
  userType,
  maxItems,
  showHeader = true
}) => {
  const displayTransactions = maxItems ? transactions.slice(0, maxItems) : transactions;
  
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
          <span className="text-4xl">📊</span>
        </div>
        <p className="text-slate-300 text-lg mb-2">No activity yet</p>
        <p className="text-slate-400">Your transactions and interactions will appear here</p>
      </div>
    );
  }

  return (
    <div>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
          <span className="text-sm text-slate-400">
            {displayTransactions.length} of {transactions.length} transactions
          </span>
        </div>
      )}
      
      <div className="space-y-3">
        {displayTransactions.map((transaction) => (
          <EnhancedTransactionCard
            key={transaction.id}
            transaction={transaction}
            userType={userType}
            showDetails={false}
          />
        ))}
      </div>
      
      {maxItems && transactions.length > maxItems && (
        <div className="text-center mt-4">
          <p className="text-slate-400 text-sm">
            {transactions.length - maxItems} more transactions...
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Enhanced Stats Overview Component
 */
export const EnhancedStatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  userType
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Transactions */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">Total Transactions</p>
            <p className="text-2xl font-bold text-white">{stats.totalTransactions}</p>
          </div>
          <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
        </div>
      </div>

      {/* Revenue / Spending */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">
              {userType === 'technician' ? 'Total Earnings' : 'Total Spent'}
            </p>
            <p className="text-2xl font-bold text-green-400">
              {formatCurrency(userType === 'technician' ? stats.toaReceived.totalPayout : stats.totalRevenue)}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
            <span className="text-2xl">💰</span>
          </div>
        </div>
      </div>

      {/* ThankATech Points */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">ThankATech Points</p>
            <p className="text-2xl font-bold text-blue-400">{stats.totalPoints}</p>
          </div>
          <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <span className="text-2xl">⭐</span>
          </div>
        </div>
      </div>

      {/* Thank Yous */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">
              {userType === 'technician' ? 'Thank Yous Received' : 'Thank Yous Sent'}
            </p>
            <p className="text-2xl font-bold text-purple-400">
              {userType === 'technician' ? stats.thankYous.received : stats.thankYous.sent}
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <span className="text-2xl">🙏</span>
          </div>
        </div>
      </div>

      {/* TOA Tokens */}
      {(stats.toaReceived.totalTokens > 0 || stats.toaSent.totalTokens > 0) && (
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm">
                {userType === 'technician' ? 'TOA Tokens Received' : 'TOA Tokens Sent'}
              </p>
              <p className="text-2xl font-bold text-orange-400">
                {userType === 'technician' ? stats.toaReceived.totalTokens : stats.toaSent.totalTokens}
              </p>
              <p className="text-sm text-slate-400 mt-1">
                Value: {formatCurrency(userType === 'technician' ? stats.toaReceived.totalValue : stats.toaSent.totalValue)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🪙</span>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Activity */}
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">This Month</h4>
          <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
            <span className="text-xl">📈</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-slate-400 text-xs">Transactions</p>
            <p className="text-lg font-bold text-white">{stats.thisMonth.transactions}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Revenue</p>
            <p className="text-lg font-bold text-green-400">{formatCurrency(stats.thisMonth.revenue)}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs">Points</p>
            <p className="text-lg font-bold text-blue-400">{stats.thisMonth.points}</p>
          </div>
        </div>
      </div>
    </div>
  );
};