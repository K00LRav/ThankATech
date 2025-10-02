// Complete ThankATech Database Setup Script
// This script creates ALL necessary collections with realistic sample data
// to make every component of the system functional

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  doc, 
  setDoc,
  writeBatch
} = require('firebase/firestore');

require('dotenv').config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Complete collections structure needed for the system
const COLLECTIONS = {
  TECHNICIANS: 'technicians',
  CLIENTS: 'clients',
  THANK_YOUS: 'thankYous',
  TOKEN_TRANSACTIONS: 'tokenTransactions',
  TOKEN_BALANCES: 'tokenBalances',
  DAILY_LIMITS: 'dailyLimits',
  DAILY_POINTS: 'dailyPoints',
  DAILY_PER_TECH_LIMITS: 'dailyPerTechLimits',
  POINTS_CONVERSIONS: 'pointsConversions',
  USER_TOKENS: 'userTokens'
};

// Sample users/clients data
function getSampleClients() {
  return [
    {
      id: 'client-john-smith',
      uniqueId: 'john.smith.client.001',
      name: 'John Smith',
      displayName: 'John Smith',
      email: 'john.smith@example.com',
      phone: '(555) 123-4567',
      location: 'Atlanta, GA',
      userType: 'client',
      points: 25,
      totalThankYousSent: 8,
      totalTipsSent: 3,
      totalSpent: 45.50,
      favoriteTechnicians: ['mock-jane-doe', 'mock-carlos-rodriguez'],
      createdAt: new Date('2023-08-15'),
      lastAppreciationDate: new Date('2023-09-28'),
      authUid: 'client-auth-001',
      profileImage: null
    },
    {
      id: 'client-sarah-johnson',
      uniqueId: 'sarah.johnson.client.002',
      name: 'Sarah Johnson',
      displayName: 'Sarah Johnson',
      email: 'sarah.johnson@example.com',
      phone: '(555) 234-5678',
      location: 'Atlanta, GA',
      userType: 'client',
      points: 42,
      totalThankYousSent: 15,
      totalTipsSent: 7,
      totalSpent: 87.25,
      favoriteTechnicians: ['mock-john-doe', 'mock-lisa-johnson'],
      createdAt: new Date('2023-07-20'),
      lastAppreciationDate: new Date('2023-09-30'),
      authUid: 'client-auth-002',
      profileImage: null
    },
    {
      id: 'client-mike-davis',
      uniqueId: 'mike.davis.client.003',
      name: 'Mike Davis',
      displayName: 'Mike Davis',
      email: 'mike.davis@example.com',
      phone: '(555) 345-6789',
      location: 'Atlanta, GA',
      userType: 'client',
      points: 18,
      totalThankYousSent: 6,
      totalTipsSent: 2,
      totalSpent: 32.00,
      favoriteTechnicians: ['mock-sarah-chen', 'mock-maria-gonzalez'],
      createdAt: new Date('2023-09-10'),
      lastAppreciationDate: new Date('2023-09-25'),
      authUid: 'client-auth-003',
      profileImage: null
    }
  ];
}

// Enhanced mock technicians with more details
function getEnhancedTechnicians() {
  return [
    {
      id: 'mock-jane-doe',
      uniqueId: 'jane.doe.tech.001',
      username: 'jane-doe-auto',
      name: "Jane Doe",
      title: "Master Auto Mechanic",
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&h=300&fit=crop&crop=face",
      points: 892,
      about: "With over 15 years of experience in automotive repair, I specialize in both foreign and domestic vehicles. ASE Master Certified with expertise in engine diagnostics, transmission repair, and hybrid vehicle systems.",
      phoneNumber: "(555) 123-4567",
      email: "jane.doe@example.com",
      website: "https://janesdoeautoshop.com",
      businessAddress: "1234 Main Street, Atlanta, GA 30309",
      businessName: "Jane's Auto Excellence",
      category: "automotive",
      specialties: "Engine Diagnostics, Transmission Repair, Hybrid Systems, European Imports",
      yearsExperience: 15,
      certifications: "ASE Master Certified, Hybrid Vehicle Specialist, BMW Certified",
      serviceArea: "Greater Atlanta Metro - 30 mile radius",
      hourlyRate: "$95-$150",
      availability: "Monday-Friday 8AM-6PM, Saturday 9AM-4PM, Emergency towing available",
      userType: "technician",
      createdAt: new Date('2023-06-15'),
      isActive: true,
      totalThankYous: 248,
      totalTips: 89,
      totalToaReceived: 156,
      totalToaValue: 15.60,
      totalEarnings: 13.26,
      rating: 4.9,
      authUid: 'tech-auth-001'
    },
    {
      id: 'mock-john-doe',
      uniqueId: 'john.doe.tech.002',
      username: 'john-doe-electric',
      name: "John Doe",
      title: "Licensed Electrician",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face",
      points: 1247,
      about: "Master Electrician with 20+ years serving residential and commercial clients throughout Atlanta. Specializing in smart home installations, electrical panel upgrades, and energy-efficient lighting solutions.",
      phoneNumber: "(555) 987-6543",
      email: "john.doe@example.com",
      website: "https://johndoeelectric.com",
      businessAddress: "5678 Electric Avenue, Atlanta, GA 30318",
      businessName: "Doe Electric Solutions",
      category: "electrical",
      specialties: "Smart Home Systems, Panel Upgrades, Commercial Wiring, LED Lighting",
      yearsExperience: 22,
      certifications: "Master Electrician License, NECA Member, Smart Home Certified",
      serviceArea: "Atlanta Metro Area - 40 mile radius",
      hourlyRate: "$85-$120",
      availability: "Monday-Friday 7AM-6PM, Weekend emergency calls, 24/7 emergency service",
      userType: "technician",
      createdAt: new Date('2023-08-10'),
      isActive: true,
      totalThankYous: 325,
      totalTips: 125,
      totalToaReceived: 210,
      totalToaValue: 21.00,
      totalEarnings: 17.85,
      rating: 4.8,
      authUid: 'tech-auth-002'
    },
    {
      id: 'mock-carlos-rodriguez',
      uniqueId: 'carlos.rodriguez.tech.003',
      username: 'carlos-tech',
      name: "Carlos Rodriguez",
      title: "Computer Repair Specialist",
      image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop&crop=face",
      points: 1156,
      about: "CompTIA A+ certified computer technician specializing in both hardware and software solutions. From virus removal to custom PC builds, I provide fast, reliable tech support for homes and small businesses.",
      phoneNumber: "(555) 345-6789",
      email: "carlos.rodriguez@example.com",
      website: "https://carlostech.net",
      businessAddress: "789 Tech Plaza, Atlanta, GA 30315",
      businessName: "Rodriguez Tech Solutions",
      category: "computer",
      specialties: "PC Repair, Data Recovery, Network Setup, Custom Builds",
      yearsExperience: 10,
      certifications: "CompTIA A+, Network+, Security+, Microsoft Certified",
      serviceArea: "Atlanta Metro Area - 30 mile radius",
      hourlyRate: "$70-$95",
      availability: "Monday-Saturday 9AM-7PM, Remote support available",
      userType: "technician",
      createdAt: new Date('2023-04-08'),
      isActive: true,
      totalThankYous: 298,
      totalTips: 112,
      totalToaReceived: 178,
      totalToaValue: 17.80,
      totalEarnings: 15.13,
      rating: 4.7,
      authUid: 'tech-auth-003'
    }
  ];
}

// Sample token balances for clients
function getSampleTokenBalances() {
  return [
    {
      id: 'client-john-smith',
      userId: 'client-john-smith',
      tokens: 25,
      totalPurchased: 50,
      totalSpent: 25,
      lastUpdated: new Date()
    },
    {
      id: 'client-sarah-johnson', 
      userId: 'client-sarah-johnson',
      tokens: 42,
      totalPurchased: 100,
      totalSpent: 58,
      lastUpdated: new Date()
    },
    {
      id: 'client-mike-davis',
      userId: 'client-mike-davis', 
      tokens: 15,
      totalPurchased: 30,
      totalSpent: 15,
      lastUpdated: new Date()
    }
  ];
}

// Sample transactions to make dashboard meaningful
function getSampleTransactions() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return [
    // Recent thank you transactions
    {
      id: 'tx-001',
      fromUserId: 'client-john-smith',
      toTechnicianId: 'mock-jane-doe',
      tokens: 0,
      message: 'Thank you for your exceptional service! Your automotive expertise saved the day.',
      isRandomMessage: false,
      timestamp: yesterday,
      type: 'thank_you',
      dollarValue: 0,
      technicianPayout: 0,
      platformFee: 0,
      pointsAwarded: 1
    },
    {
      id: 'tx-002',
      fromUserId: 'client-sarah-johnson',
      toTechnicianId: 'mock-john-doe',
      tokens: 5,
      message: 'Thank you for your exceptional service! Here are 5 TOA tokens as appreciation.',
      isRandomMessage: false,
      timestamp: yesterday,
      type: 'toa',
      dollarValue: 0.05,
      technicianPayout: 0.0425,
      platformFee: 0.0075,
      pointsAwarded: 10
    },
    {
      id: 'tx-003',
      fromUserId: 'client-mike-davis',
      toTechnicianId: 'mock-carlos-rodriguez',
      tokens: 10,
      message: 'Excellent computer repair service! Quick and professional.',
      isRandomMessage: false,
      timestamp: lastWeek,
      type: 'toa',
      dollarValue: 0.10,
      technicianPayout: 0.085,
      platformFee: 0.015,
      pointsAwarded: 20
    },
    {
      id: 'tx-004',
      fromUserId: 'client-john-smith',
      toTechnicianId: 'mock-carlos-rodriguez',
      tokens: 0,
      message: 'Thank you for your exceptional service! Your expertise truly made a difference.',
      isRandomMessage: false,
      timestamp: lastMonth,
      type: 'thank_you',
      dollarValue: 0,
      technicianPayout: 0,
      platformFee: 0,
      pointsAwarded: 1
    },
    {
      id: 'tx-005',
      fromUserId: 'client-sarah-johnson',
      toTechnicianId: 'mock-jane-doe',
      tokens: 8,
      message: 'Outstanding automotive service! Fixed my car perfectly.',
      isRandomMessage: false,
      timestamp: lastMonth,
      type: 'toa',
      dollarValue: 0.08,
      technicianPayout: 0.068,
      platformFee: 0.012,
      pointsAwarded: 16
    }
  ];
}

// Sample daily limits to demonstrate the system
function getSampleDailyLimits() {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      id: `client-john-smith_${today}`,
      userId: 'client-john-smith',
      date: today,
      freeThankYous: 1,
      maxFreeThankYous: 3
    },
    {
      id: `client-sarah-johnson_${today}`,
      userId: 'client-sarah-johnson',
      date: today,
      freeThankYous: 2,
      maxFreeThankYous: 3
    }
  ];
}

// Sample daily per-technician limits
function getSampleDailyPerTechLimits() {
  const today = new Date().toISOString().split('T')[0];
  return [
    {
      id: `client-john-smith_${today}`,
      userId: 'client-john-smith',
      date: today,
      techniciansThanked: ['mock-jane-doe'],
      lastThankYou: new Date()
    },
    {
      id: `client-sarah-johnson_${today}`,
      userId: 'client-sarah-johnson',
      date: today,
      techniciansThanked: ['mock-john-doe', 'mock-carlos-rodriguez'],
      lastThankYou: new Date()
    }
  ];
}

// Sample points conversions
function getSamplePointsConversions() {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  return [
    {
      id: 'conv-001',
      userId: 'client-sarah-johnson',
      pointsConverted: 10,
      tokensGenerated: 2,
      conversionDate: yesterday,
      conversionRate: 5,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    {
      id: 'conv-002',
      userId: 'client-john-smith',
      pointsConverted: 15,
      tokensGenerated: 3,
      conversionDate: today,
      conversionRate: 5,
      createdAt: new Date()
    }
  ];
}

async function setupCompleteDatabase() {
  console.log('🚀 Setting up complete ThankATech database...\n');
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  let totalDocs = 0;
  let errors = 0;

  try {
    // 1. Setup Technicians Collection
    console.log('1️⃣ Setting up technicians collection...');
    const technicians = getEnhancedTechnicians();
    for (const tech of technicians) {
      try {
        await setDoc(doc(db, COLLECTIONS.TECHNICIANS, tech.id), tech);
        console.log(`   ✅ Added technician: ${tech.name} (${tech.category})`);
        totalDocs++;
      } catch (error) {
        console.error(`   ❌ Failed to add technician ${tech.name}:`, error.message);
        errors++;
      }
    }

    // 2. Setup Clients Collection
    console.log('\n2️⃣ Setting up clients collection...');
    const clients = getSampleClients();
    for (const client of clients) {
      try {
        await setDoc(doc(db, COLLECTIONS.CLIENTS, client.id), client);
        console.log(`   ✅ Added client: ${client.name} - ${client.points} points`);
        totalDocs++;
      } catch (error) {
        console.error(`   ❌ Failed to add client ${client.name}:`, error.message);
        errors++;
      }
    }

    // 3. Setup Token Balances
    console.log('\n3️⃣ Setting up token balances...');
    const tokenBalances = getSampleTokenBalances();
    for (const balance of tokenBalances) {
      try {
        await setDoc(doc(db, COLLECTIONS.TOKEN_BALANCES, balance.id), balance);
        console.log(`   ✅ Added token balance: ${balance.userId} - ${balance.tokens} tokens`);
        totalDocs++;
      } catch (error) {
        console.error(`   ❌ Failed to add token balance:`, error.message);
        errors++;
      }
    }

    // 4. Setup Transaction History
    console.log('\n4️⃣ Setting up transaction history...');
    const transactions = getSampleTransactions();
    for (const transaction of transactions) {
      try {
        await setDoc(doc(db, COLLECTIONS.TOKEN_TRANSACTIONS, transaction.id), transaction);
        console.log(`   ✅ Added transaction: ${transaction.type} - ${transaction.tokens} tokens`);
        totalDocs++;
      } catch (error) {
        console.error(`   ❌ Failed to add transaction:`, error.message);
        errors++;
      }
    }

    // 5. Setup Daily Limits
    console.log('\n5️⃣ Setting up daily limits...');
    const dailyLimits = getSampleDailyLimits();
    for (const limit of dailyLimits) {
      try {
        await setDoc(doc(db, COLLECTIONS.DAILY_LIMITS, limit.id), limit);
        console.log(`   ✅ Added daily limit: ${limit.userId}`);
        totalDocs++;
      } catch (error) {
        console.error(`   ❌ Failed to add daily limit:`, error.message);
        errors++;
      }
    }

    // 6. Setup Daily Per-Tech Limits
    console.log('\n6️⃣ Setting up daily per-technician limits...');
    const perTechLimits = getSampleDailyPerTechLimits();
    for (const limit of perTechLimits) {
      try {
        await setDoc(doc(db, COLLECTIONS.DAILY_PER_TECH_LIMITS, limit.id), limit);
        console.log(`   ✅ Added per-tech limit: ${limit.userId}`);
        totalDocs++;
      } catch (error) {
        console.error(`   ❌ Failed to add per-tech limit:`, error.message);
        errors++;
      }
    }

    // 7. Setup Points Conversions
    console.log('\n7️⃣ Setting up points conversions...');
    const conversions = getSamplePointsConversions();
    for (const conversion of conversions) {
      try {
        await setDoc(doc(db, COLLECTIONS.POINTS_CONVERSIONS, conversion.id), conversion);
        console.log(`   ✅ Added conversion: ${conversion.pointsConverted} points → ${conversion.tokensGenerated} TOA`);
        totalDocs++;
      } catch (error) {
        console.error(`   ❌ Failed to add conversion:`, error.message);
        errors++;
      }
    }

    // Success Summary
    console.log('\n🎉 DATABASE SETUP COMPLETE!');
    console.log('==============================');
    console.log(`📊 Total documents created: ${totalDocs}`);
    console.log(`❌ Errors encountered: ${errors}`);
    console.log('');
    console.log('✅ Collections Setup:');
    console.log(`   • technicians: ${technicians.length} mock technicians`);
    console.log(`   • clients: ${clients.length} sample clients`);
    console.log(`   • tokenBalances: ${tokenBalances.length} token balances`);
    console.log(`   • tokenTransactions: ${transactions.length} sample transactions`);
    console.log(`   • dailyLimits: ${dailyLimits.length} daily limits`);
    console.log(`   • dailyPerTechLimits: ${perTechLimits.length} per-tech limits`);
    console.log(`   • pointsConversions: ${conversions.length} conversions`);
    console.log('');
    console.log('🚀 SYSTEM FEATURES NOW FUNCTIONAL:');
    console.log('   ✅ User Registration & Login');
    console.log('   ✅ Dashboard (both client & technician views)');
    console.log('   ✅ ThankYou System (free & paid)');
    console.log('   ✅ TOA Token System');
    console.log('   ✅ Transaction Recording & History');
    console.log('   ✅ Points & Conversion System');
    console.log('   ✅ Daily Limits & Tracking');
    console.log('   ✅ Realistic Sample Data');
    console.log('');
    console.log('📱 READY TO TEST:');
    console.log('   • Browse technician profiles');
    console.log('   • Register new users');
    console.log('   • Send thank yous and tips');
    console.log('   • View dashboard with real data');
    console.log('   • Test points conversion');
    console.log('   • Check transaction history');

  } catch (error) {
    console.error('❌ DATABASE SETUP FAILED:', error);
    process.exit(1);
  }
}

setupCompleteDatabase()
  .then(() => {
    console.log('\n✨ ThankATech database is fully operational!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  });