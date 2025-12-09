// Test script to check which Gemini models are available
// Run: node backend/scripts/test-gemini-models.js

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('Error: GOOGLE_AI_API_KEY not set in .env file');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const modelsToTest = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-1.0-pro'
];

async function testModel(modelName) {
  try {
    console.log(`\nTesting model: ${modelName}...`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Say "Hello" in one word.');
    const response = await result.response;
    const text = response.text();
    console.log(`✅ ${modelName} - SUCCESS`);
    console.log(`   Response: ${text}`);
    return true;
  } catch (err) {
    console.log(`❌ ${modelName} - FAILED`);
    console.log(`   Error: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('Testing Google Gemini Models...\n');
  console.log('API Key:', apiKey.substring(0, 10) + '...');
  
  const results = {};
  
  for (const modelName of modelsToTest) {
    results[modelName] = await testModel(modelName);
  }
  
  console.log('\n=== Summary ===');
  const workingModels = Object.entries(results)
    .filter(([_, success]) => success)
    .map(([model, _]) => model);
  
  if (workingModels.length > 0) {
    console.log('✅ Working models:', workingModels.join(', '));
    console.log(`\n💡 Recommended: Use ${workingModels[0]} in your .env:`);
    console.log(`   GEMINI_MODEL=${workingModels[0]}`);
  } else {
    console.log('❌ No working models found. Please check your API key.');
  }
}

main().catch(console.error);

