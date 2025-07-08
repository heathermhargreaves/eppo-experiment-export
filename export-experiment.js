#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');

// Configuration
const EPPO_API_BASE_URL = 'https://eppo.cloud/api/v1';
const API_KEY = process.env.EPPO_API_KEY;

if (!API_KEY) {
  console.error('❌ Error: EPPO_API_KEY environment variable is required');
  console.error('Please set it in your .env file or as an environment variable');
  process.exit(1);
}

// Get experiment ID from command line arguments
const experimentId = process.argv[2];

if (!experimentId) {
  console.error('❌ Error: Experiment ID is required');
  console.error('Usage: node export-experiment.js <experiment-id>');
  console.error('Example: node export-experiment.js 88935');
  process.exit(1);
}

// Set up axios with authentication
const apiClient = axios.create({
  baseURL: EPPO_API_BASE_URL,
  headers: {
    'X-Eppo-Token': API_KEY,
    'Content-Type': 'application/json'
  }
});

/**
 * Fetch experiment data from Eppo API
 */
async function fetchExperimentData(experimentId) {
  try {
    console.log(`📊 Fetching experiment data for ID: ${experimentId}`);
    
    const response = await apiClient.get(`/experiments/${experimentId}`, {
      params: {
        with_calculated_metrics: true,
        with_full_cuped_data: true
      }
    });

    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ API Error: ${error.response.status} - ${error.response.statusText}`);
      console.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`❌ Network Error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Fetch metric details from Eppo API
 */
async function fetchMetricDetails(metricId) {
  try {
    const response = await apiClient.get(`/metrics/${metricId}`);
    return response.data;
  } catch (error) {
    console.warn(`⚠️  Failed to fetch metric ${metricId}: ${error.message}`);
    return null;
  }
}

/**
 * Fetch metric names for all unique metric IDs
 */
async function fetchMetricNames(experimentData) {
  const metricIds = new Set();
  
  // Collect all unique metric IDs from variations
  if (experimentData.variations && Array.isArray(experimentData.variations)) {
    experimentData.variations.forEach(variation => {
      if (variation.calculated_metrics && Array.isArray(variation.calculated_metrics)) {
        variation.calculated_metrics.forEach(metric => {
          if (metric.metric_id) {
            metricIds.add(metric.metric_id);
          }
        });
      }
    });
  }
  
  const metricNames = {};
  
  // Fetch metric details for each unique ID
  console.log(`📊 Fetching names for ${metricIds.size} unique metrics...`);
  for (const metricId of metricIds) {
    const metricDetails = await fetchMetricDetails(metricId);
    if (metricDetails && metricDetails.name) {
      metricNames[metricId] = metricDetails.name;
      console.log(`✅ Metric ${metricId}: ${metricDetails.name}`);
    } else {
      metricNames[metricId] = `metric_${metricId}`;
      console.log(`❌ Metric ${metricId}: using fallback name`);
    }
  }
  
  console.log(`\n📋 Final metric names mapping:`);
  console.log(JSON.stringify(metricNames, null, 2));
  
  return metricNames;
}

/**
 * Process metrics data and flatten for CSV export
 */
function processMetricsData(experimentData, metricNames) {
  const metrics = [];
  
  if (!experimentData.variations || !Array.isArray(experimentData.variations)) {
    console.warn('⚠️  No variations found in experiment data');
    return metrics;
  }

  // Process each variation
  experimentData.variations.forEach(variation => {
    if (!variation.calculated_metrics || !Array.isArray(variation.calculated_metrics)) {
      console.warn(`⚠️  No calculated metrics found for variation: ${variation.name}`);
      return;
    }

    // Process each metric within this variation
    variation.calculated_metrics.forEach(metricData => {
      const cupedData = metricData.cuped || {};
      const cupedConfidenceInterval = cupedData.confidence_interval || {};
      
      const metricRow = {
        experiment_id: experimentData.id,
        experiment_name: experimentData.name,
        variation_name: variation.name || variation.variant_key,
        variant_key: variation.variant_key,
        is_control: variation.is_control || false,
        is_variation_active: variation.is_active || null,
        weighted_expected_traffic: variation.weighted_expected_traffic || null,
        
        // Metric identification
        metric_id: metricData.metric_id || null,
        metric_name: metricNames[metricData.metric_id] || `metric_${metricData.metric_id}`,
        
        // Basic metric values
        metric_value: metricData.metric_value || null,
        numerator: metricData.numerator || null,
        denominator: metricData.denominator || null,
        assignment_count: metricData.assignment_count || null,
        
        // Original statistical values
        percent_change: metricData.percent_change || null,
        p_value: metricData.p_value || null,
        z_score: metricData.z_score || null,
        standard_error: metricData.standard_error || null,
        
        // Regular confidence intervals
        ci_lower: metricData.confidence_interval?.lower_bound || metricData.confidence_interval?.lower || null,
        ci_upper: metricData.confidence_interval?.upper_bound || metricData.confidence_interval?.upper || null,
        
        // CUPED values
        cuped_metric_value: metricData.metric_value_cuped || cupedData.metric_value || null,
        cuped_percent_change: cupedData.percent_change || null,
        cuped_p_value: cupedData.p_value || null,
        cuped_z_score: cupedData.z_score || null,
        cuped_global_lift: cupedData.global_lift || null,
        cuped_coverage: cupedData.coverage || null,
        
        // CUPED confidence intervals
        cuped_ci_lower: cupedConfidenceInterval.lower_bound || cupedConfidenceInterval.lower || null,
        cuped_ci_upper: cupedConfidenceInterval.upper_bound || cupedConfidenceInterval.upper || null,
        
        // Timestamps
        created_at: experimentData.created_date,
        updated_at: experimentData.results_last_updated
      };
      
      metrics.push(metricRow);
    });
  });

  return metrics;
}

/**
 * Export metrics to CSV
 */
async function exportToCSV(metrics, experimentId) {
  if (metrics.length === 0) {
    console.warn('⚠️  No metrics to export');
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `experiment_${experimentId}_metrics_${timestamp}.csv`;
  const filePath = path.join(process.cwd(), filename);

  const csvWriter = createCsvWriter({
    path: filePath,
    header: [
      { id: 'experiment_id', title: 'Experiment ID' },
      { id: 'experiment_name', title: 'Experiment Name' },
      { id: 'variation_name', title: 'Variation Name' },
      { id: 'variant_key', title: 'Variant Key' },
      { id: 'is_control', title: 'Is Control' },
      { id: 'is_variation_active', title: 'Is Variation Active' },
      { id: 'weighted_expected_traffic', title: 'Weighted Expected Traffic' },
      { id: 'metric_id', title: 'Metric ID' },
      { id: 'metric_name', title: 'Metric Name' },
      { id: 'metric_value', title: 'Metric Value' },
      { id: 'numerator', title: 'Numerator' },
      { id: 'denominator', title: 'Denominator' },
      { id: 'assignment_count', title: 'Assignment Count' },
      { id: 'percent_change', title: 'Percent Change' },
      { id: 'p_value', title: 'P-Value' },
      { id: 'z_score', title: 'Z-Score' },
      { id: 'standard_error', title: 'Standard Error' },
      { id: 'ci_lower', title: 'CI Lower' },
      { id: 'ci_upper', title: 'CI Upper' },
      { id: 'cuped_metric_value', title: 'CUPED Metric Value' },
      { id: 'cuped_percent_change', title: 'CUPED Percent Change' },
      { id: 'cuped_p_value', title: 'CUPED P-Value' },
      { id: 'cuped_z_score', title: 'CUPED Z-Score' },
      { id: 'cuped_global_lift', title: 'CUPED Global Lift' },
      { id: 'cuped_coverage', title: 'CUPED Coverage' },
      { id: 'cuped_ci_lower', title: 'CUPED CI Lower' },
      { id: 'cuped_ci_upper', title: 'CUPED CI Upper' },
      { id: 'created_at', title: 'Created At' },
      { id: 'updated_at', title: 'Updated At' }
    ]
  });

  try {
    await csvWriter.writeRecords(metrics);
    console.log(`✅ Successfully exported ${metrics.length} metric rows to: ${filename}`);
    console.log(`📁 File location: ${filePath}`);
    
    // Display summary
    const uniqueMetrics = [...new Set(metrics.map(m => m.metric_name).filter(Boolean))];
    const uniqueVariations = [...new Set(metrics.map(m => m.variation_name).filter(Boolean))];
    const uniqueMetricIds = [...new Set(metrics.map(m => m.metric_id).filter(Boolean))];
    
    console.log(`\n📊 Export Summary:`);
    console.log(`   • Metrics: ${uniqueMetrics.length} (${uniqueMetrics.join(', ')})`);
    console.log(`   • Metric IDs: ${uniqueMetricIds.join(', ')}`);
    console.log(`   • Variations: ${uniqueVariations.length} (${uniqueVariations.join(', ')})`);
    console.log(`   • Total rows: ${metrics.length}`);
    
  } catch (error) {
    console.error('❌ Error writing CSV file:', error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting Eppo experiment export...\n');
    
    // Fetch experiment data
    const experimentData = await fetchExperimentData(experimentId);
    
    console.log(`📋 Experiment: ${experimentData.name}`);
    console.log(`📅 Created: ${experimentData.created_date}`);
    console.log(`🔄 Updated: ${experimentData.results_last_updated}\n`);
    
    // Fetch metric names
    const metricNames = await fetchMetricNames(experimentData);
    
    // Process metrics data
    const metrics = processMetricsData(experimentData, metricNames);
    
    // Export to CSV
    await exportToCSV(metrics, experimentId);
    
    console.log('\n✨ Export completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Export failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main(); 