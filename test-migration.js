// Test the tip count migration logic

// Simulate the old behavior (wrong)
function oldMigrationLogic(tipTransactions) {
  let totalTipsSent = 0;
  let totalSpent = 0;
  
  tipTransactions.forEach(tip => {
    const amount = tip.amount || 0;
    totalSpent += amount;
    totalTipsSent += amount; // WRONG: This sums dollar amounts
  });
  
  return { totalTipsSent, totalSpent };
}

// Simulate the new behavior (correct)
function newMigrationLogic(tipTransactions) {
  let totalTipsSent = tipTransactions.length; // Count transactions
  let totalSpent = 0;
  
  tipTransactions.forEach(tip => {
    const amount = tip.amount || 0;
    totalSpent += amount;
  });
  
  return { totalTipsSent, totalSpent };
}

// Test data - simulate user who sent 2 tips
const userTips = [
  { amount: 12500 }, // $125 tip in cents
  { amount: 2500 }   // $25 tip in cents
];

console.log('=== MIGRATION TEST ===');
console.log('User sent 2 tips: $125 and $25');
console.log('');

const oldResult = oldMigrationLogic(userTips);
console.log('OLD (wrong) logic result:');
console.log(`Tips Sent: ${oldResult.totalTipsSent} (shows dollar amount - WRONG)`);
console.log(`Total Spent: $${oldResult.totalSpent/100}`);
console.log('');

const newResult = newMigrationLogic(userTips);
console.log('NEW (correct) logic result:');
console.log(`Tips Sent: ${newResult.totalTipsSent} (shows count - CORRECT)`);
console.log(`Total Spent: $${newResult.totalSpent/100}`);
console.log('');

console.log('✅ Migration fix will change Tips Sent from', oldResult.totalTipsSent, 'to', newResult.totalTipsSent);