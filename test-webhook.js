#!/usr/bin/env node

/**
 * 🧪 Stripe Webhook Test Script for ThankATech
 * 
 * This script helps you test your webhook configuration locally
 * Run with: node test-webhook.js
 */

const crypto = require('crypto');
const https = require('https');

// Your webhook secrets (from .env.local)
const WEBHOOK_SECRETS = {
  primary: 'whsec_TR33rSd8HNW8Tu2VgROXWJYW2wqICDxS',
  secondary: 'whsec_FQlOL2rBYk4aVkdCelzRpYFwVXHdUoHm'
};

// Sample Stripe event payload
const testPayload = {
  id: 'evt_test_webhook',
  object: 'event',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'pi_test_12345',
      object: 'payment_intent',
      amount: 1000, // $10.00
      currency: 'usd',
      status: 'succeeded',
      metadata: {
        technicianId: 'mock-tech-123',
        customerId: 'cust-456',
        platformFee: '80',
        technicianPayout: '920'
      }
    }
  },
  livemode: false,
  pending_webhooks: 1,
  request: {
    id: 'req_test',
    idempotency_key: null
  },
  type: 'payment_intent.succeeded'
};

function createStripeSignature(payload, secret, timestamp) {
  const payloadString = JSON.stringify(payload);
  const signedPayload = `${timestamp}.${payloadString}`;
  const signature = crypto
    .createHmac('sha256', secret.replace('whsec_', ''))
    .update(signedPayload, 'utf8')
    .digest('hex');
  
  return `t=${timestamp},v1=${signature}`;
}

async function testWebhook(webhookSecret, secretName) {
  return new Promise((resolve, reject) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createStripeSignature(testPayload, webhookSecret, timestamp);
    const payloadString = JSON.stringify(testPayload);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/stripe-webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadString),
        'stripe-signature': signature
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          secretName,
          statusCode: res.statusCode,
          response: data
        });
      });
    });

    req.on('error', (error) => {
      reject({ secretName, error: error.message });
    });

    req.write(payloadString);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing ThankATech Webhook Configuration...\n');
  
  console.log('📋 Webhook Secrets:');
  console.log(`   Primary: ${WEBHOOK_SECRETS.primary}`);
  console.log(`   Secondary: ${WEBHOOK_SECRETS.secondary}\n`);
  
  console.log('🚀 Testing webhook endpoints...\n');
  
  for (const [secretName, secret] of Object.entries(WEBHOOK_SECRETS)) {
    try {
      console.log(`Testing ${secretName} webhook...`);
      const result = await testWebhook(secret, secretName);
      
      if (result.statusCode === 200) {
        console.log(`✅ ${secretName}: SUCCESS (${result.statusCode})`);
        console.log(`   Response: ${result.response}`);
      } else {
        console.log(`❌ ${secretName}: FAILED (${result.statusCode})`);
        console.log(`   Response: ${result.response}`);
      }
    } catch (error) {
      console.log(`❌ ${secretName}: ERROR - ${error.error || error.message}`);
    }
    console.log('');
  }
  
  console.log('🎯 Test completed! Check your terminal for webhook logs.');
  console.log('💡 Next steps:');
  console.log('   1. Configure these webhooks in your Stripe Dashboard');
  console.log('   2. Point them to: https://yourdomain.com/api/stripe-webhook');
  console.log('   3. Test with real Stripe events');
}

// Run the test if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testWebhook, createStripeSignature };