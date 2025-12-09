// List available Gemini models for your API key
// Run: node backend/scripts/list-gemini-models.js

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const https = require('https');

const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('Error: GOOGLE_AI_API_KEY not set in .env file');
  process.exit(1);
}

async function listModels() {
  return new Promise((resolve, reject) => {
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode !== 200) {
            console.error('Error:', response.error || data);
            if (res.statusCode === 403) {
              console.error('\n❌ API key may not have permission to list models.');
              console.error('   Testing common model names instead...\n');
              testCommonModels();
            } else if (res.statusCode === 401) {
              console.error('\n❌ Invalid API key. Please check your GOOGLE_AI_API_KEY.');
            }
            return;
          }

          console.log('\n=== Available Gemini Models ===\n');
          
          const models = response.models || [];
          const generateContentModels = models.filter(m => 
            m.supportedGenerationMethods && 
            m.supportedGenerationMethods.includes('generateContent')
          );

          if (generateContentModels.length === 0) {
            console.log('❌ No models found that support generateContent');
            console.log('\nAll available models:');
            models.forEach(m => {
              console.log(`  - ${m.name}`);
            });
            testCommonModels();
          } else {
            console.log('✅ Models that support generateContent:\n');
            generateContentModels.forEach(m => {
              const displayName = m.displayName || m.name;
              const modelName = m.name.replace('models/', '');
              console.log(`  Model: ${modelName}`);
              console.log(`  Display Name: ${displayName}`);
              console.log(`  Full Name: ${m.name}`);
              console.log(`  Description: ${m.description || 'N/A'}`);
              console.log('');
            });

            // Test the first available model
            if (generateContentModels.length > 0) {
              const firstModel = generateContentModels[0];
              const modelName = firstModel.name.replace('models/', '');
              testModel(modelName);
            }
          }
        } catch (err) {
          console.error('Error parsing response:', err);
          testCommonModels();
        }
      });
    }).on('error', (err) => {
      console.error('Error:', err.message);
      testCommonModels();
    });
  });
}

async function testCommonModels() {
  console.log('\n=== Testing Common Model Names ===\n');
  
  const modelsToTest = [
    'gemini-pro',
    'gemini-1.0-pro',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];

  for (const modelName of modelsToTest) {
    await testModel(modelName);
  }
}

async function testModel(modelName) {
  try {
    console.log(`Testing: ${modelName}...`);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent('Say hello');
    const response = await result.response;
    const text = response.text();
    
    console.log(`✅ ${modelName} WORKS!`);
    console.log(`   Response: "${text}"`);
    console.log(`\n💡 Add this to your backend/.env:`);
    console.log(`   GEMINI_MODEL=${modelName}\n`);
    return true;
  } catch (err) {
    console.log(`❌ ${modelName} failed: ${err.message.split('\n')[0]}\n`);
    return false;
  }
}

listModels().catch(() => {
  // If listing fails, just test common models
  testCommonModels();
});

