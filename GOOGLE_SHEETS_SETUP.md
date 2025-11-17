# Google Sheets Setup Guide

This guide shows how to set up Google Sheets to work alongside the Amazon Seller Central MCP for comprehensive business analytics.

## Overview

By combining the Amazon Seller Central MCP with a Google Sheets MCP, you can:
- Store SKU-level cost data (ex-factory, shipping, logistics)
- Calculate true profitability by combining SP-API sales with your internal costs
- Maintain product metadata not available in Seller Central
- Track custom business metrics and KPIs

## Google Sheets MCP Installation

### Option 1: Official Google Drive MCP (Recommended)

```bash
# The Google Drive MCP server includes Google Sheets support
npx -y @modelcontextprotocol/server-gdrive
```

### Option 2: Custom Google Sheets Integration

If you need custom functionality, you can build a lightweight Google Sheets MCP using the Google Sheets API.

## Google Sheets Template

### Sheet 1: SKU Cost Data

This is the primary sheet for storing cost information.

| Column | Description | Example |
|--------|-------------|---------|
| SKU | Your internal SKU identifier | ABC-001 |
| ASIN | Amazon Standard Identification Number | B08XYZ123 |
| FNSKU | Fulfillment Network SKU | X001ABC123 |
| Product Name | Product title | Premium Widget Pro |
| Ex-Factory Cost | Manufacturing/sourcing cost per unit | $5.50 |
| First Mile Cost | Shipping from factory to warehouse | $0.75 |
| Middle Mile Cost | Shipping to Amazon FBA | $1.25 |
| Packaging Cost | Unit packaging cost | $0.50 |
| Total COGS | Sum of all costs | $8.00 |
| Target Price | Desired selling price | $19.99 |
| Target Margin % | Desired profit margin | 40% |
| Supplier | Supplier name | Acme Manufacturing |
| Lead Time (Days) | Manufacturing + shipping time | 45 |
| MOQ | Minimum order quantity | 500 |
| Last Updated | Date of last cost update | 2024-01-15 |

**Example Data**:

```
SKU       | ASIN       | FNSKU       | Product Name      | Ex-Factory | First Mile | Middle Mile | Packaging | Total COGS | Target Price | Target Margin
----------|------------|-------------|-------------------|------------|------------|-------------|-----------|------------|--------------|---------------
ABC-001   | B08XYZ123  | X001ABC123  | Widget Pro        | $5.50      | $0.75      | $1.25       | $0.50     | $8.00      | $19.99       | 40%
ABC-002   | B09DEF456  | X002DEF456  | Gadget Plus       | $12.00     | $1.50      | $2.00       | $0.75     | $16.25     | $39.99       | 35%
ABC-003   | B10GHI789  | X003GHI789  | Tool Master       | $8.25      | $1.00      | $1.50       | $0.60     | $11.35     | $24.99       | 38%
```

### Sheet 2: Amazon Fees Reference

Store typical Amazon fee percentages for quick calculations.

| Category | Referral Fee % | FBA Fee Small | FBA Fee Large | Notes |
|----------|----------------|---------------|---------------|-------|
| Electronics | 8% | $3.22 | $5.98 | Category-specific |
| Home & Kitchen | 15% | $3.22 | $5.98 | Standard category |
| Toys & Games | 15% | $3.22 | $5.98 | Seasonal variations |

### Sheet 3: Product Performance Metrics

Track custom KPIs not available in Seller Central.

| SKU | Units Sold (MTD) | Revenue (MTD) | COGS (MTD) | Gross Profit | Margin % | Inventory Days | Reorder Point | Status |
|-----|------------------|---------------|------------|--------------|----------|----------------|---------------|--------|
| ABC-001 | 250 | $4,997.50 | $2,000 | $2,997.50 | 60% | 45 | 100 | Active |
| ABC-002 | 150 | $5,998.50 | $2,437.50 | $3,561.00 | 59% | 30 | 50 | Active |

### Sheet 4: Supplier Information

| Supplier Name | Contact Email | Country | Payment Terms | Lead Time | Quality Rating | Notes |
|---------------|---------------|---------|---------------|-----------|----------------|-------|
| Acme Manufacturing | sales@acme.com | China | 30% deposit, 70% before ship | 35 days | 4.5/5 | Reliable |
| Widget Factory Ltd | info@widgetfactory.com | Vietnam | Net 30 | 40 days | 4/5 | Good quality |

## MCP Configuration

Add both servers to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "amazon-seller-central": {
      "command": "node",
      "args": ["/path/to/amazon_sp_mcp/build/index.js"],
      "env": {
        "AWS_ACCESS_KEY_ID": "your_access_key",
        "AWS_SECRET_ACCESS_KEY": "your_secret_key",
        "LWA_CLIENT_ID": "your_client_id",
        "LWA_CLIENT_SECRET": "your_client_secret",
        "LWA_REFRESH_TOKEN": "your_refresh_token",
        "SELLER_ID": "your_seller_id",
        "MARKETPLACE_ID": "ATVPDKIKX0DER"
      }
    },
    "google-sheets": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-gdrive"],
      "env": {
        "GOOGLE_CLIENT_ID": "your_google_client_id.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "your_google_client_secret"
      }
    }
  }
}
```

## Setting Up Google Sheets API Access

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API and Google Drive API

### Step 2: Create OAuth 2.0 Credentials

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Desktop app" as application type
4. Download the credentials JSON file

### Step 3: Authorize the MCP Server

1. Run the Google Sheets MCP server for the first time
2. Follow the OAuth flow to authorize access
3. The refresh token will be stored for future use

## Usage Examples

### Example 1: Calculate Profitability

**User Question**: "What was my profit margin on SKU ABC-001 last month?"

**Agent Workflow**:
```
1. Call Amazon MCP: get_orders(sku="ABC-001", date_range="last_month")
   Returns: 250 units sold, $4,997.50 revenue, $749.63 Amazon fees

2. Call Google Sheets MCP: read_cell(sheet="SKU Cost Data", cell="ABC-001")
   Returns: COGS = $8.00 per unit

3. Calculate:
   - Total Revenue: $4,997.50
   - Amazon Fees: $749.63
   - COGS: $8.00 × 250 = $2,000.00
   - Net Profit: $4,997.50 - $749.63 - $2,000.00 = $2,247.87
   - Profit Margin: 45%
```

### Example 2: Identify Top Products

**User Question**: "Which products have the best margins?"

**Agent Workflow**:
```
1. Call Google Sheets MCP: read_range(sheet="SKU Cost Data", range="A2:K100")
   Returns: All SKU data with cost information

2. Call Amazon MCP: get_sales_metrics(date_range="last_30_days")
   Returns: Sales data for all SKUs

3. Calculate margins and rank:
   - SKU ABC-001: 45% margin, 250 units
   - SKU ABC-003: 42% margin, 180 units
   - SKU ABC-002: 35% margin, 150 units
```

### Example 3: Reorder Recommendations

**User Question**: "Which products should I reorder?"

**Agent Workflow**:
```
1. Call Amazon MCP: get_inventory_summary()
   Returns: Current FBA inventory levels

2. Call Google Sheets MCP: read_range(sheet="Product Performance", range="A2:I100")
   Returns: Reorder points and lead times

3. Compare and recommend:
   - SKU ABC-001: 75 units in stock, reorder point 100, lead time 45 days
   - Recommendation: Order now (below reorder point)
```

### Example 4: Cost Analysis

**User Question**: "How much would it cost to ship 1000 units of ABC-001?"

**Agent Workflow**:
```
1. Call Google Sheets MCP: read_row(sheet="SKU Cost Data", sku="ABC-001")
   Returns: First Mile: $0.75, Middle Mile: $1.25 per unit

2. Calculate:
   - Total First Mile: 1000 × $0.75 = $750
   - Total Middle Mile: 1000 × $1.25 = $1,250
   - Total Shipping: $2,000
```

## Google Sheets Formulas

Add these formulas to automate calculations:

### Total COGS Calculation

```excel
=SUM(E2:H2)
```
Where E2:H2 contains: Ex-Factory, First Mile, Middle Mile, Packaging

### Actual Margin % (requires sales data)

```excel
=(Target_Price - Total_COGS - Amazon_Fees) / Target_Price
```

### Inventory Value

```excel
=Current_Inventory_Units * Total_COGS
```

### Days of Inventory

```excel
=Current_Inventory_Units / Average_Daily_Sales
```

## Best Practices

1. **Update Costs Regularly**: Review and update costs monthly or when suppliers change pricing
2. **Track Historical Changes**: Create versioned sheets or change logs for cost history
3. **Use Data Validation**: Add dropdown lists for categories, suppliers, status fields
4. **Conditional Formatting**: Highlight low margins, low inventory, or high-performing SKUs
5. **Protect Sheets**: Protect cost data sheets to prevent accidental changes
6. **Backup Data**: Enable version history and regular backups
7. **Document Assumptions**: Add notes about cost calculations and assumptions

## Security Considerations

- **Restrict Access**: Limit Google Sheets access to authorized team members only
- **Use OAuth**: Never store credentials in the sheet itself
- **Regular Audits**: Review access logs periodically
- **Sensitive Data**: Consider encryption for highly sensitive cost information

## Troubleshooting

### MCP Can't Access Sheet

- Ensure the Google Drive MCP has been authorized via OAuth
- Check that the sheet is shared with the service account email
- Verify API quotas haven't been exceeded

### Data Mismatch Between Systems

- Ensure SKU/ASIN mappings are consistent
- Check date ranges match between queries
- Verify currency conversions if applicable

### Slow Performance

- Limit the range of data read from sheets
- Consider caching frequently accessed data
- Use specific cell/range queries instead of reading entire sheets

## Advanced: Custom Google Sheets MCP

If you need more control, you can build a custom Google Sheets MCP. Example structure:

```typescript
// Custom Google Sheets MCP tool
{
  name: "get_sku_costs",
  description: "Retrieve cost data for a specific SKU",
  inputSchema: {
    type: "object",
    properties: {
      sku: { type: "string", description: "SKU identifier" }
    }
  },
  handler: async (args) => {
    // Use Google Sheets API to fetch row matching SKU
    // Return structured cost data
  }
}
```

## Sample Spreadsheet Template

Download a ready-to-use template: [Amazon SKU Cost Template](https://docs.google.com/spreadsheets/d/example) (You'll need to create this)

Or copy this structure to create your own.

## Next Steps

1. Create your Google Sheet using the template above
2. Set up Google Cloud OAuth credentials
3. Configure the Google Drive MCP server
4. Test the integration with sample queries
5. Populate your actual SKU data
6. Start asking your AI agent business questions!

## Resources

- [Google Sheets API Documentation](https://developers.google.com/sheets/api)
- [Google Drive MCP Setup](https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
