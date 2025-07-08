#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

const API_KEY = process.env.EPPO_API_KEY;
const EPPO_API_BASE_URL = 'https://eppo.cloud/api/v1';

if (!API_KEY) {
  console.error('❌ Error: EPPO_API_KEY environment variable is required');
  console.error('Run: npm run setup');
  process.exit(1);
}

const apiClient = axios.create({
  baseURL: EPPO_API_BASE_URL,
  headers: {
    'X-Eppo-Token': API_KEY,
    'Content-Type': 'application/json'
  }
});

async function testConnection() {
  try {
    console.log('🔍 Testing Eppo API connection...');
    
    // Test basic API connectivity
    const response = await apiClient.get('/experiments');
    
    console.log('✅ Successfully connected to Eppo API');
    console.log(`📊 Found ${response.data.length} experiments`);
    
    if (response.data.length > 0) {
      console.log('\n📋 Recent experiments:');
      response.data.slice(0, 5).forEach((exp, i) => {
        console.log(`   ${i + 1}. ${exp.name} (ID: ${exp.id})`);
      });
    }
    
    console.log('\n🎉 Connection test passed! You can now run:');
    console.log('node export-experiment.js <experiment-id>');
    
  } catch (error) {
    console.error('❌ Connection test failed:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status} - ${error.response.statusText}`);
      console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
      
      if (error.response.status === 401) {
        console.error('\n💡 This looks like an authentication issue.');
        console.error('   Please check your API key and run: npm run setup');
      }
    } else {
      console.error(`   Error: ${error.message}`);
    }
    
    process.exit(1);
  }
}

testConnection(); 