// Test script to verify the authentication fix
// Run this after deploying the updated Edge Functions

const SUPABASE_URL = 'https://uxjgqoqotbzofamkohxj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4amdxb3FvdGJ6b2ZhbWtvaHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI5NzQsImV4cCI6MjA1MDU0ODk3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

async function testAuthFix() {
  try {
    console.log('🔍 Testing authentication fix...');
    
    // First, get a valid session token by logging in
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // You'll need to replace these with actual credentials
    const { data: { session }, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'ashwin@drishtant.com',
      password: 'your-password-here' // Replace with actual password
    });
    
    if (loginError || !session) {
      console.error('❌ Login failed:', loginError);
      return;
    }
    
    console.log('✅ Login successful, testing Edge Function...');
    
    // Test the bulk-send function with the fixed authentication
    const response = await fetch(`${SUPABASE_URL}/functions/v1/bulk-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        name: 'Test Broadcast',
        messageTemplate: 'test_template',
        language: 'en',
        contactTags: ['test']
      })
    });
    
    const result = await response.text();
    console.log('📡 Response status:', response.status);
    console.log('📡 Response body:', result);
    
    if (response.ok) {
      console.log('✅ Authentication fix successful!');
    } else {
      console.log('❌ Authentication still failing');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Instructions for running the test
console.log(`
🚀 Authentication Fix Test Script
================================

This script tests the authentication fix for Supabase Edge Functions.

To run this test:

1. Deploy the updated Edge Functions:
   npx supabase functions deploy bulk-send
   npx supabase functions deploy setup
   npx supabase functions deploy sync-message-templates

2. Update the password in this script (line 15)

3. Run the test:
   node test-auth-fix.js

The fix changes Edge Functions to use SUPABASE_ANON_KEY instead of 
SUPABASE_SERVICE_ROLE_KEY when a user JWT token is provided, which 
resolves the "Auth session missing!" error.

Key changes made:
- supabase/functions/_shared/client.ts
- supabase/functions/bulk-send/index.ts  
- supabase/functions/setup/index.ts
- supabase/functions/sync-message-templates/index.ts
`);

// Uncomment the line below to run the test
// testAuthFix(); 