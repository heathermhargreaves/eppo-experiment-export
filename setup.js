#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Eppo Experiment Export Tool Setup\n');

rl.question('Please enter your Eppo API key: ', (apiKey) => {
  if (!apiKey) {
    console.error('❌ API key is required');
    process.exit(1);
  }

  const envContent = `# Eppo API Configuration
EPPO_API_KEY=${apiKey}
`;

  fs.writeFileSync('.env', envContent);
  console.log('✅ Environment configuration saved to .env file');
  console.log('\nYou can now run the export script:');
  console.log('node export-experiment.js <experiment-id>');
  console.log('\nExample:');
  console.log('node export-experiment.js 88935');
  
  rl.close();
}); 