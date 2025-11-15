// Quick script to reset Stripe account for a technician
// Run with: node reset-stripe-account.js

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./path-to-your-service-account.json'); // Update this path

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function resetStripeAccount(technicianId) {
  try {
    const techRef = db.collection('technicians').doc(technicianId);
    
    await techRef.update({
      stripeAccountId: admin.firestore.FieldValue.delete(),
      stripeAccountStatus: admin.firestore.FieldValue.delete()
    });
    
    console.log(`✅ Reset Stripe account for technician: ${technicianId}`);
    console.log('Next withdrawal attempt will create a fresh LIVE Stripe account');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Replace with your actual technician document ID
const TECHNICIAN_ID = 'YOUR_TECHNICIAN_ID_HERE';

resetStripeAccount(TECHNICIAN_ID)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
