#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

const EPPO_API_BASE_URL = 'https://eppo.cloud/api/v1';
const API_KEY = process.env.EPPO_API_KEY;

const experimentId = process.argv[2];

if (!experimentId) {
  console.error('❌ Error: Experiment ID is required');
  console.error('Usage: node debug-experiment.js <experiment-id>');
  console.error('Example: node debug-experiment.js 123656');
  process.exit(1);
}

const apiClient = axios.create({
  baseURL: EPPO_API_BASE_URL,
  headers: {
    'X-Eppo-Token': API_KEY,
    'Content-Type': 'application/json'
  }
});

async function debugExperiment(experimentId) {
  try {
    console.log(`🔍 Debugging experiment ID: ${experimentId}\n`);
    
    const response = await apiClient.get(`/experiments/${experimentId}`, {
      params: {
        with_calculated_metrics: true,
        with_full_cuped_data: true
      }
    });

    console.log('✅ API call successful!');
    console.log(`📊 Experiment: ${response.data.name || 'Unknown'}`);
    console.log(`🆔 ID: ${response.data.id}`);
    console.log(`📅 Created: ${response.data.created_at}`);
    console.log(`🔄 Updated: ${response.data.updated_at}\n`);

    // Show the structure of the response
    console.log('📋 Response structure:');
    console.log('='.repeat(50));
    
    // Top-level keys
    console.log('\n🔑 Top-level keys:');
    Object.keys(response.data).forEach(key => {
      const value = response.data[key];
      const type = Array.isArray(value) ? 'array' : typeof value;
      const length = Array.isArray(value) ? `[${value.length}]` : '';
      console.log(`   ${key}: ${type}${length}`);
    });
    
    // Check for calculated_metrics specifically
    if (response.data.calculated_metrics) {
      console.log('\n✅ calculated_metrics found!');
      console.log(`   Type: ${Array.isArray(response.data.calculated_metrics) ? 'array' : 'object'}`);
      console.log(`   Length: ${response.data.calculated_metrics.length || 'N/A'}`);
      
      if (Array.isArray(response.data.calculated_metrics) && response.data.calculated_metrics.length > 0) {
        console.log('\n📊 First calculated metric:');
        console.log(JSON.stringify(response.data.calculated_metrics[0], null, 2));
      } else if (typeof response.data.calculated_metrics === 'object') {
        console.log('\n📊 calculated_metrics object:');
        console.log(JSON.stringify(response.data.calculated_metrics, null, 2));
      }
    } else {
      console.log('\n❌ No calculated_metrics field found');
    }
    
    // Check for other possible metric fields
    const possibleFields = [
      'metrics',
      'results',
      'analysis',
      'metric_analysis',
      'variations',
      'metric_results'
    ];
    
    console.log('\n🔍 Looking for other metric fields:');
    possibleFields.forEach(field => {
      if (response.data[field]) {
        console.log(`✅ Found '${field}' field (${typeof response.data[field]})`);
      } else {
        console.log(`❌ No '${field}' field found`);
      }
    });
    
    // Check metric names by fetching them
    if (response.data.variations && Array.isArray(response.data.variations)) {
      console.log(`\n🔍 Testing metric name lookups:`);
      const metricIds = new Set();
      
      // Collect unique metric IDs
      response.data.variations.forEach(variation => {
        if (variation.calculated_metrics && Array.isArray(variation.calculated_metrics)) {
          variation.calculated_metrics.forEach(metric => {
            if (metric.metric_id) {
              metricIds.add(metric.metric_id);
            }
          });
        }
      });
      
      console.log(`   Found ${metricIds.size} unique metric IDs: ${Array.from(metricIds).join(', ')}`);
      
      // Try fetching a few metric names
      const testMetricId = Array.from(metricIds)[0];
      if (testMetricId) {
        try {
          const metricResponse = await apiClient.get(`/metrics/${testMetricId}`);
          console.log(`   ✅ Sample metric ${testMetricId}: ${metricResponse.data.name || 'NO NAME FIELD'}`);
        } catch (error) {
          console.log(`   ❌ Failed to fetch metric ${testMetricId}: ${error.message}`);
        }
      }
    }
    
    // Show full response for debugging (truncated if too long)
    console.log('\n📄 Full response (first 3000 chars):');
    console.log('='.repeat(50));
    const fullResponse = JSON.stringify(response.data, null, 2);
    console.log(fullResponse.substring(0, 3000));
    if (fullResponse.length > 3000) {
      console.log('\n... (response truncated)');
    }
    
  } catch (error) {
    console.error('❌ Error fetching experiment data:');
    
    if (error.response) {
      console.error(`   Status: ${error.response.status} - ${error.response.statusText}`);
      console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    
    process.exit(1);
  }
}

debugExperiment(experimentId); 