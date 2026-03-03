#!/usr/bin/env node
/**
 * Quick test script to verify OpenAI integration
 */

require('dotenv/config');

const testMessage = "URGENT! Your bank account has been compromised. Click this link immediately: http://fake-bank.com/verify or call +1-800-555-0123 to secure your account!";

console.log('🧪 Testing AI Integration\n');
console.log('API Key Status:', process.env.OPENAI_API_KEY ? '✓ Loaded' : '✗ Missing');
console.log('Test Message:', testMessage);
console.log('\n📡 Calling OpenAI API...\n');

async function testOpenAI() {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a scam detection expert. Respond with "SCAM" or "SAFE".'
          },
          {
            role: 'user',
            content: `Is this a scam? "${testMessage}"`
          }
        ],
        temperature: 0.3,
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ API Error:', response.status, response.statusText);
      console.error('Details:', error);
      process.exit(1);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;

    console.log('✅ Success! OpenAI Response:', result);
    console.log('\n🎉 AI Integration is working correctly!');
    console.log('\nYou can now:');
    console.log('  1. Start your server: npm run dev');
    console.log('  2. Test the full system with AI-enhanced detection');
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Check your API key is valid');
    console.error('  2. Ensure you have credits remaining');
    console.error('  3. Verify your internet connection');
    process.exit(1);
  }
}

testOpenAI();
