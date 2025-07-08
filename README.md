# Eppo Experiment Export Tool

A Node.js script to export Eppo experiment metrics to CSV format, including confidence intervals with CUPED, percent changes, p-values, z-scores, and standard errors. The script automatically fetches actual metric names from the Eppo API for better readability.

## Features

- **Export all metrics** from an Eppo experiment with calculated statistics
- **Fetches actual metric names** from `/metrics/{id}` endpoint (e.g., "Checkout Conversion Funnel")
- **Variation-level breakdown** for each metric across all experiment variations
- **CUPED adjustments** with confidence intervals, percent changes, and statistical measures
- **Comprehensive statistical data**: p-values, z-scores, confidence intervals
- **Timestamped CSV output** with experiment metadata

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   npm run setup
   # Follow the prompts to enter your Eppo API key
   ```

   **Or manually create a `.env` file:**
   ```bash
   echo "EPPO_API_KEY=your_actual_api_key_here" > .env
   ```

3. **Test your connection:**
   ```bash
   npm test
   ```

## Usage

Export an experiment's metrics to CSV:

```bash
node export-experiment.js <experiment-id>
```

**Examples:**
```bash
# Export experiment 95469
node export-experiment.js 95469

# Or using npm script
npm run export -- 95469
```

## Output

The script generates a CSV file with the following columns:

### Experiment & Variation Info
- `Experiment ID` - The experiment identifier
- `Experiment Name` - Human-readable experiment name
- `Variation Name` - Name of the variation (e.g., "Control", "Treatment A")
- `Variant Key` - Internal variation key
- `Is Control` - Whether this is the control variation
- `Is Variation Active` - Whether the variation is currently active
- `Weighted Expected Traffic` - Expected traffic allocation

### Metric Information
- `Metric ID` - Internal metric identifier
- `Metric Name` - **Actual metric name** fetched from API (e.g., "Checkout Conversion Funnel")
- `Metric Value` - The raw metric value
- `Numerator` - Numerator value for the metric calculation
- `Denominator` - Denominator value for the metric calculation
- `Assignment Count` - Number of assignments to this variation

### Statistical Data
- `Percent Change` - Percentage change vs control
- `P-Value` - Statistical significance
- `Z-Score` - Standard score
- `Standard Error` - Standard error of the metric

### Confidence Intervals
- `CI Lower` - Lower bound of confidence interval
- `CI Upper` - Upper bound of confidence interval

### CUPED Adjustments
- `CUPED Metric Value` - CUPED-adjusted metric value
- `CUPED Percent Change` - CUPED-adjusted percent change
- `CUPED P-Value` - CUPED-adjusted p-value
- `CUPED Z-Score` - CUPED-adjusted z-score
- `CUPED Global Lift` - Global lift with CUPED
- `CUPED Coverage` - Coverage with CUPED
- `CUPED CI Lower` - Lower bound with CUPED adjustment
- `CUPED CI Upper` - Upper bound with CUPED adjustment

### Timestamps
- `Created At` - Experiment creation timestamp
- `Updated At` - Last results update timestamp

## CSV Output Format

The CSV file will be named: `experiment_{ID}_metrics_{timestamp}.csv`

Example: `experiment_95469_metrics_2024-01-15T10-30-45-123Z.csv`

## Sample Output

When you run the export, you'll see:

```
🚀 Starting Eppo experiment export...

📋 Experiment: Product Filter Experiment
📅 Created: 2024-09-16T13:30:00.865Z
🔄 Updated: 2025-07-08T08:02:06.802Z

📊 Fetching names for 5 unique metrics...
✅ Metric 193639: Checkout Conversion Funnel
✅ Metric 134639: Add to Cart Rate
✅ Metric 134635: Session Duration
✅ Metric 135464: Purchase Conversion
✅ Metric 135465: Revenue Per User

📋 Final metric names mapping:
{
  "193639": "Checkout Conversion Funnel",
  "134639": "Add to Cart Rate",
  ...
}

✅ Successfully exported 10 metric rows to: experiment_95469_metrics_2024-01-15T10-30-45-123Z.csv
📁 File location: /path/to/experiment_95469_metrics_2024-01-15T10-30-45-123Z.csv

📊 Export Summary:
   • Metrics: 5 (Checkout Conversion Funnel, Add to Cart Rate, Session Duration, Purchase Conversion, Revenue Per User)
   • Metric IDs: 193639, 134639, 134635, 135464, 135465
   • Variations: 2 (Control, Treatment A)
   • Total rows: 10

✨ Export completed successfully!
```

## Error Handling

The script includes comprehensive error handling for:
- Missing API key
- Invalid experiment ID
- Network errors
- API authentication issues
- Missing or malformed data
- Failed metric name lookups (falls back to `metric_{id}`)

## API Endpoints

The script uses the following Eppo API endpoints:
- `GET /api/v1/experiments/{experiment_id}?with_calculated_metrics=true&with_full_cuped_data=true`
- `GET /api/v1/metrics/{metric_id}` - To fetch actual metric names

## Authentication

Uses `X-Eppo-Token` header for API authentication.

## Requirements

- Node.js 14.0.0 or higher
- Valid Eppo API key with access to experiments and metrics
- Access to the experiment data

## Dependencies

- `axios` - HTTP client for API requests
- `csv-writer` - CSV file generation
- `dotenv` - Environment variable management

## Troubleshooting

### Common Issues

1. **"EPPO_API_KEY environment variable is required"**
   - Make sure you've created a `.env` file with your API key

2. **"API Error: 401 - Unauthorized"**
   - Check that your API key is valid and has access to both experiments and metrics

3. **"API Error: 404 - Not Found"**
   - Verify the experiment ID exists and you have permission to access it

4. **"No variations found in experiment data"**
   - The experiment may not have any variations or calculated metrics yet
   - Check that the experiment has run and has data

5. **"Metric name using fallback"**
   - Some metrics may not be accessible via the `/metrics/{id}` endpoint
   - The script will use `metric_{id}` format as fallback

## Debug Mode

For debugging experiment data structure:

```bash
node debug-experiment.js <experiment-id>
```

This will show:
- Experiment metadata
- Response structure
- Available metrics
- Sample metric name lookup

## Examples

### Basic Export
```bash
node export-experiment.js 95469
```

### Export with Environment Variable
```bash
EPPO_API_KEY=your_key_here node export-experiment.js 95469
```

### Using npm script
```bash
npm run export -- 95469
```

### Debug Mode
```bash
node debug-experiment.js 95469
```

The script will output detailed progress information, fetch actual metric names from the API, and create a comprehensive CSV file with all experiment metrics data organized by variation. 