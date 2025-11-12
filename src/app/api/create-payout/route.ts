import { NextRequest, NextResponse } from 'next/server';
import { getServerStripe } from '@/lib/stripe';
import { logger } from '@/lib/logger';

// Initialize Firebase Admin for server-side operations
let adminDb: any = null;
async function getAdminDb() {
  if (adminDb) return adminDb;
  
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  
  adminDb = getFirestore();
  return adminDb;
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getServerStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured' },
        { status: 503 }
      );
    }
    
    const { amount, technicianId, method = 'standard', bankAccount } = await request.json();

    // Validate request
    if (!amount || !technicianId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify minimum payout amount ($1.00)
    if (amount < 100) {
      return NextResponse.json(
        { error: 'Minimum payout amount is $1.00' },
        { status: 400 }
      );
    }

    // Get technician's Stripe account
    const db = await getAdminDb();
    const techDoc = await db.collection('technicians').doc(technicianId).get();
    
    if (!techDoc.exists) {
      return NextResponse.json(
        { error: 'Technician not found' },
        { status: 404 }
      );
    }

    const techData = techDoc.data();
    let stripeAccountId = techData.stripeAccountId;

    // If no Stripe account, create one
    if (!stripeAccountId) {
      logger.info(`Creating Stripe Custom account for technician ${technicianId}`);
      
      const account = await stripe.accounts.create({
        type: 'custom',
        country: 'US',
        email: techData.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          url: 'https://thankatech.com',
          mcc: '7399', // Business Services - Not Elsewhere Classified
        },
        individual: {
          email: techData.email,
          first_name: techData.name?.split(' ')[0] || 'Test',
          last_name: techData.name?.split(' ').slice(1).join(' ') || 'User',
          dob: {
            day: 1,
            month: 1,
            year: 1990,
          },
          address: {
            line1: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            postal_code: '94111',
            country: 'US',
          },
          phone: '+14155551234',
          ssn_last_4: '0000', // Test mode: use 0000 to bypass verification
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: '8.8.8.8', // Test mode - use valid IP format
        },
        metadata: {
          technicianId: technicianId,
        },
      });

      stripeAccountId = account.id;

      await db.collection('technicians').doc(technicianId).update({
        stripeAccountId: stripeAccountId,
        stripeAccountStatus: 'pending',
        updatedAt: new Date(),
      });
      
      logger.info(`Created Custom account ${stripeAccountId} with full profile and transfers capability requested`);
    } else {
      // Update existing account if it's missing required information
      const existingAccount = await stripe.accounts.retrieve(stripeAccountId);
      
      if (existingAccount.capabilities?.transfers !== 'active') {
        logger.info(`Updating existing account ${stripeAccountId} with required information`);
        
        try {
          // Update the account with all required fields
          const updateData: any = {
            business_profile: {
              url: 'https://thankatech.com',
              mcc: '7399',
            },
            individual: {
              email: techData.email,
              first_name: techData.name?.split(' ')[0] || 'Test',
              last_name: techData.name?.split(' ').slice(1).join(' ') || 'User',
              dob: {
                day: 1,
                month: 1,
                year: 1990,
              },
              address: {
                line1: '123 Main St',
                city: 'San Francisco',
                state: 'CA',
                postal_code: '94111',
                country: 'US',
              },
              phone: '+14155551234',
              ssn_last_4: '0000', // Test mode: bypass verification
            },
          };
          
          // For US platform -> US accounts, don't use service_agreement
          // Stripe handles TOS differently for domestic accounts
          const tosData = {
            date: Math.floor(Date.now() / 1000),
            ip: '8.8.8.8',
          };
          
          await stripe.accounts.update(stripeAccountId, {
            ...updateData,
            tos_acceptance: tosData,
          });
          
          logger.info(`Updated account ${stripeAccountId} with complete profile and TOS`);
        } catch (updateError: any) {
          logger.warn(`Could not update account: ${updateError.message}`);
          // If TOS update fails, try without it
          try {
            await stripe.accounts.update(stripeAccountId, {
              business_profile: {
                url: 'https://thankatech.com',
                mcc: '7399',
              },
              individual: {
                email: techData.email,
                first_name: techData.name?.split(' ')[0] || 'Test',
                last_name: techData.name?.split(' ').slice(1).join(' ') || 'User',
                dob: {
                  day: 1,
                  month: 1,
                  year: 1990,
                },
                address: {
                  line1: '123 Main St',
                  city: 'San Francisco',
                  state: 'CA',
                  postal_code: '94111',
                  country: 'US',
                },
                phone: '+14155551234',
                ssn_last_4: '0000',
              },
            });
            logger.info(`Updated account without TOS (may need manual acceptance)`);
          } catch (secondError: any) {
            logger.error(`Second update attempt failed: ${secondError.message}`);
          }
        }
      }
    }

    // Verify account has transfers capability
    const accountStatus = await stripe.accounts.retrieve(stripeAccountId);
    if (accountStatus.capabilities?.transfers !== 'active') {
      logger.warn(`Account ${stripeAccountId} transfers capability status: ${accountStatus.capabilities?.transfers}`);
      
      // In test mode, the capability should activate immediately after adding bank account
      // So we'll proceed and let the bank account addition trigger activation
    }

    // Add bank account if provided
    if (bankAccount && bankAccount.accountNumber && bankAccount.routingNumber) {
      try {
        const externalAccount = await stripe.accounts.createExternalAccount(
          stripeAccountId,
          {
            external_account: {
              object: 'bank_account',
              country: 'US',
              currency: 'usd',
              account_holder_type: 'individual',
              routing_number: bankAccount.routingNumber,
              account_number: bankAccount.accountNumber,
            },
          }
        );
        
        // Set as default payout method
        await stripe.accounts.update(stripeAccountId, {
          default_currency: 'usd',
        });
        
        logger.info(`Added bank account to Stripe account ${stripeAccountId}`);
        
        // In test mode, manually activate the transfers capability
        if (process.env.STRIPE_SECRET_KEY?.includes('test')) {
          try {
            // Update account to trigger capability activation
            await stripe.accounts.update(stripeAccountId, {
              business_profile: {
                url: 'https://thankatech.com',
              },
            });
            logger.info('Updated account business profile to trigger activation');
          } catch (updateError) {
            logger.warn('Could not update business profile:', updateError);
          }
        }
        
        // Wait a moment for capability to activate in test mode
        await new Promise(resolve => setTimeout(resolve, 3000)); // Increased to 3 seconds
      } catch (bankError: any) {
        logger.error('Bank account creation error:', bankError);
        
        // If OAuth permission error, delete old account and recreate
        if (bankError.code === 'oauth_not_supported' || bankError.type === 'StripePermissionError') {
          logger.warn(`Permission error on account ${stripeAccountId}, deleting and will recreate`);
          
          try {
            // Delete the problematic account
            await stripe.accounts.del(stripeAccountId);
            logger.info(`Deleted account ${stripeAccountId}`);
          } catch (delError: any) {
            logger.warn(`Could not delete account: ${delError.message}`);
          }
          
          // Clear from Firestore
          await db.collection('technicians').doc(technicianId).update({
            stripeAccountId: null,
            stripeAccountStatus: null,
            updatedAt: new Date(),
          });
          
          return NextResponse.json(
            { error: 'Account reset due to permissions issue. Please try again to create a fresh account.' },
            { status: 400 }
          );
        }
        
        return NextResponse.json(
          { error: `Invalid bank account: ${bankError.message}` },
          { status: 400 }
        );
      }
    }

    // Re-check capability status after adding bank account (with retries)
    let retriesLeft = 3;
    let transfersCapable = false;
    
    while (retriesLeft > 0 && !transfersCapable) {
      const updatedAccountStatus = await stripe.accounts.retrieve(stripeAccountId);
      const transfersCapability = updatedAccountStatus.capabilities?.transfers;
      
      logger.info(`Checking transfers capability (attempt ${4 - retriesLeft}/3): ${transfersCapability}`);
      
      if (transfersCapability === 'active') {
        transfersCapable = true;
        break;
      }
      
      retriesLeft--;
      if (retriesLeft > 0) {
        logger.info(`Capability not active yet, waiting 2 more seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (!transfersCapable) {
      const finalAccount = await stripe.accounts.retrieve(stripeAccountId);
      logger.warn(`Transfers capability not active after retries for account ${stripeAccountId}`);
      return NextResponse.json(
        { 
          error: 'Account setup incomplete. Transfers capability not yet active. Please try again in a moment.',
          accountId: stripeAccountId,
          capabilityStatus: finalAccount.capabilities?.transfers
        },
        { status: 400 }
      );
    }

    // Calculate fee for express payout
    const fee = method === 'express' ? 50 : 0; // $0.50 for express
    const netAmount = amount - fee;

    // Create transfer to technician's Stripe account
    const transfer = await stripe.transfers.create({
      amount: netAmount,
      currency: 'usd',
      destination: stripeAccountId,
      description: `ThankATech payout for technician ${technicianId}`,
      metadata: {
        technicianId: technicianId,
        payoutMethod: method,
        requestedAmount: amount,
        fee: fee,
      },
    });

    logger.info(`Created transfer ${transfer.id} for $${netAmount / 100} to ${stripeAccountId}`);

    // Store payout record in Firestore
    try {
      const payoutRecord = {
        transferId: transfer.id,
        technicianId: technicianId,
        stripeAccountId: stripeAccountId,
        amount: amount,
        fee: fee,
        netAmount: netAmount,
        method: method,
        status: 'pending',
        createdAt: new Date(),
        estimatedArrival: new Date(Date.now() + (method === 'express' ? 30 * 60 * 1000 : 2 * 24 * 60 * 60 * 1000)),
      };

      await db.collection('payouts').add(payoutRecord);
      logger.info(`Payout record created in Firestore`);

      // Update technician's earnings balance (deduct the amount)
      const newBalance = (techData.totalEarnings || 0) - (amount / 100);
      await db.collection('technicians').doc(technicianId).update({
        totalEarnings: newBalance,
        lastPayoutDate: new Date(),
        updatedAt: new Date(),
      });
      logger.info(`Updated technician balance from $${techData.totalEarnings} to $${newBalance}`);
    } catch (dbError: any) {
      logger.error('Database update error (transfer already created):', dbError);
      // Transfer succeeded but DB update failed - log but don't fail the request
    }

    return NextResponse.json({
      success: true,
      payout: {
        id: transfer.id,
        amount: netAmount,
        currency: 'usd',
        status: 'pending',
        estimated_arrival_date: new Date(Date.now() + (method === 'express' ? 30 * 60 * 1000 : 2 * 24 * 60 * 60 * 1000)),
        method: method,
        description: transfer.description,
      },
      message: method === 'express' 
        ? 'Payout initiated! Funds will arrive in ~30 minutes.'
        : 'Payout initiated successfully. Funds will arrive in 1-2 business days.'
    });

  } catch (error: any) {
    logger.error('Payout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process payout' },
      { status: 500 }
    );
  }
}