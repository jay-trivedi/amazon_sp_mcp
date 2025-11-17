# Amazon Seller Central MCP Server

A Model Context Protocol (MCP) server that provides AI agents with access to Amazon Seller Central data through the Amazon Selling Partner API (SP-API).

## Overview

This MCP server enables AI agents to interact with Amazon Seller Central, allowing them to retrieve sales data, inventory information, returns, listings, reports, and more. Built for extensibility and ease of use.

### Composability with Other MCPs

This server is designed to work alongside other MCP servers for comprehensive Amazon business analytics:

- **Google Sheets MCP**: Store and retrieve SKU-level cost data (ex-factory costs, shipping costs, margins)
- **Database MCP**: Query historical data and analytics
- **Notion/Airtable MCP**: Manage product roadmaps and business workflows

**Example Use Case**: Calculate profitability by combining SP-API sales data with Google Sheets cost data:
1. Amazon MCP retrieves sales for a SKU
2. Google Sheets MCP retrieves cost breakdown
3. AI agent calculates profit margins and provides insights

📄 **See [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) for detailed setup instructions and spreadsheet templates.**

## Features

### Core Capabilities

- **Sales Data**: Retrieve order data, sales metrics, and revenue information
- **Returns Data**: Access return requests, refund information, and return metrics
- **Inventory Data**: Monitor inventory levels, FBA/FBM stock, and inventory health
- **Listing Data**: Get product listings, ASIN details, and catalog information
- **Reports**: Generate and retrieve various seller reports (sales, inventory, returns, etc.)
- **Order Management**: Fetch order details, shipping information, and order status

### Planned Features

- Order fulfillment operations
- Pricing and competitive analysis
- Advertising data integration
- Customer messaging
- Performance metrics and notifications
- Listing creation and updates

## Architecture

### Project Structure

```
amazon_sp_mcp/
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── config/
│   │   └── sp-api.ts         # SP-API configuration
│   ├── auth/
│   │   ├── credentials.ts    # LWA (Login with Amazon) authentication
│   │   └── token-manager.ts  # Access token management
│   ├── tools/
│   │   ├── sales.ts          # Sales data tools
│   │   ├── returns.ts        # Returns data tools
│   │   ├── inventory.ts      # Inventory tools
│   │   ├── listings.ts       # Listing tools
│   │   └── reports.ts        # Reports tools
│   ├── utils/
│   │   ├── sp-api-client.ts  # SP-API HTTP client
│   │   └── rate-limiter.ts   # Rate limiting utilities
│   └── types/
│       └── sp-api.d.ts       # TypeScript type definitions
├── tests/
│   ├── unit/                 # Unit tests
│   │   ├── auth/
│   │   │   ├── credentials.test.ts
│   │   │   └── token-manager.test.ts
│   │   ├── tools/
│   │   │   ├── sales.test.ts
│   │   │   ├── returns.test.ts
│   │   │   ├── inventory.test.ts
│   │   │   ├── listings.test.ts
│   │   │   └── reports.test.ts
│   │   └── utils/
│   │       ├── sp-api-client.test.ts
│   │       └── rate-limiter.test.ts
│   ├── integration/          # Integration tests
│   │   ├── sp-api.test.ts
│   │   └── auth-flow.test.ts
│   ├── e2e/                  # End-to-end tests
│   │   └── mcp-tools.test.ts
│   ├── fixtures/             # Test data and fixtures
│   │   ├── orders.json
│   │   ├── returns.json
│   │   └── inventory.json
│   ├── mocks/                # Mock implementations
│   │   ├── sp-api-mock.ts
│   │   └── token-mock.ts
│   └── setup.ts              # Test setup and configuration
├── .env.example              # Environment variables template
├── .env.test                 # Test environment variables
├── jest.config.js            # Jest configuration
├── package.json
├── tsconfig.json
├── tsconfig.test.json        # TypeScript config for tests
├── README.md                 # Main documentation
├── SOP.md                    # Standard Operating Procedure for development
├── TESTING.md                # Testing infrastructure guide
├── ROADMAP.md                # Development roadmap
└── GOOGLE_SHEETS_SETUP.md    # Google Sheets integration guide
```

### Technology Stack

- **Runtime**: Node.js with TypeScript
- **MCP SDK**: @modelcontextprotocol/sdk
- **API**: Amazon SP-API (Selling Partner API)
- **Authentication**: LWA (Login with Amazon) OAuth 2.0
- **HTTP Client**: axios or node-fetch
- **Rate Limiting**: Custom implementation based on SP-API limits
- **Testing**: Jest, ts-jest, @types/jest
- **Mocking**: jest-mock, nock (HTTP mocking)
- **Code Coverage**: Istanbul (via Jest)
- **CI/CD**: GitHub Actions (or your preferred CI platform)

## Amazon SP-API Integration

### Authentication

The server uses LWA (Login with Amazon) OAuth 2.0 for authentication:
- Client ID and Client Secret for app authorization
- Refresh Token for seller authorization
- Access Token (auto-refreshed) for API requests

### Required Credentials

1. **AWS Credentials**: Access Key ID and Secret Access Key
2. **LWA Credentials**: Client ID, Client Secret, Refresh Token
3. **Seller/Marketplace Info**: Seller ID, Marketplace ID

### API Endpoints Used

- **Orders API**: Order data and metrics
- **Returns API**: Return and refund information
- **FBA Inventory API**: FBA stock levels
- **Catalog Items API**: Product listings and ASIN data
- **Reports API**: Various seller reports
- **Notifications API**: Real-time updates (planned)

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Amazon Seller Central account
- Amazon SP-API developer application (registered)
- AWS IAM credentials with SP-API permissions

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd amazon_sp_mcp

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Build the project
npm run build

# Test the server
npm run test
```

### Environment Configuration

Create a `.env` file with the following variables:

```env
# Amazon SP-API Credentials
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# LWA (Login with Amazon) Credentials
LWA_CLIENT_ID=amzn1.application-oa2-client.xxxxx
LWA_CLIENT_SECRET=your_client_secret
LWA_REFRESH_TOKEN=Atzr|xxxxx

# Seller Information
SELLER_ID=your_seller_id
MARKETPLACE_ID=ATVPDKIKX0DER  # US marketplace

# SP-API Endpoint
SP_API_ENDPOINT=https://sellingpartnerapi-na.amazon.com
```

### MCP Configuration

This server works with any MCP-compatible client, including **Claude Code** (CLI) and **Claude Desktop**.

#### For Claude Code (CLI)

Add to your Claude Code MCP settings file (typically `~/.config/claude/claude_desktop_config.json` or accessible via settings):

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
    }
  }
}
```

#### For Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or equivalent on your platform:

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
    }
  }
}
```

### Multi-MCP Setup for Complete Business Analytics

Combine this server with Google Sheets MCP for comprehensive Amazon business intelligence (works with both Claude Code and Claude Desktop):

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
        "GOOGLE_CLIENT_ID": "your_google_client_id",
        "GOOGLE_CLIENT_SECRET": "your_google_client_secret"
      }
    }
  }
}
```

**Note**: After adding MCP servers, restart your Claude Code session or Claude Desktop app for changes to take effect.

#### Verifying MCP Server Connection

**In Claude Code:**
```bash
# Check available MCP servers
/mcp

# The amazon-seller-central server should appear in the list
# Once connected, you can start using the tools
```

**Test the connection** by asking:
```
"Can you check if the Amazon Seller Central MCP is connected and list available tools?"
```

**Google Sheets Data Structure Example**:

Create a spreadsheet with SKU cost data:

| SKU | ASIN | Ex-Factory Cost | First Mile Cost | Middle Mile Cost | Total COGS | Product Name |
|-----|------|----------------|-----------------|------------------|------------|--------------|
| ABC-001 | B08XYZ123 | $5.50 | $0.75 | $1.25 | $7.50 | Widget Pro |
| ABC-002 | B09ABC456 | $12.00 | $1.50 | $2.00 | $15.50 | Gadget Plus |

**AI Agent Usage Example**:

```
User: "What's the profit margin for SKU ABC-001 last month?"

Agent Actions:
1. Uses Amazon MCP to get sales data for SKU ABC-001
   - Total revenue: $500 (50 units × $10 each)
   - Amazon fees: $75

2. Uses Google Sheets MCP to get cost data for SKU ABC-001
   - COGS: $7.50 per unit
   - Total COGS: $375 (50 units × $7.50)

3. Calculates profit:
   - Profit = $500 - $75 - $375 = $50
   - Margin = 10%
```

## MCP Tools

### Sales Tools

- `get_orders`: Retrieve orders within a date range
- `get_order_details`: Get detailed information for a specific order
- `get_sales_metrics`: Calculate sales metrics (revenue, units sold, etc.)

### Returns Tools

- `get_returns`: Retrieve return requests
- `get_return_details`: Get details for a specific return
- `get_refund_info`: Retrieve refund information

### Inventory Tools

- `get_inventory_summary`: Get current inventory levels
- `get_fba_inventory`: Retrieve FBA inventory details
- `get_inventory_health`: Get inventory health metrics
- `check_stock_levels`: Check stock for specific ASINs

### Listing Tools

- `get_listings`: Retrieve product listings
- `get_product_details`: Get details for a specific ASIN
- `search_catalog`: Search the catalog for products

### Report Tools

- `request_report`: Request a new report
- `get_report`: Retrieve a completed report
- `list_reports`: List available reports
- `get_report_document`: Download report data

## Rate Limiting

Amazon SP-API has strict rate limits that vary by endpoint:
- Orders API: 0.0167 requests/second (1 request per minute)
- Reports API: 0.0222 requests/second
- Other APIs: Varies

The server implements automatic rate limiting and request queuing to comply with these limits.

## Error Handling

- Automatic token refresh on 401 errors
- Retry logic for transient failures (429, 5xx)
- Detailed error messages with SP-API error codes
- Graceful degradation when services are unavailable

## Development

**Before you start developing, please read [SOP.md](SOP.md)** - it defines the step-by-step process for implementing features from the roadmap.

### Building

```bash
npm run build
```

### Running Locally

```bash
npm run dev
```

### Testing

The project uses Jest with comprehensive unit, integration, and end-to-end tests.

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:coverage
```

📄 **For detailed testing documentation, see [TESTING.md](TESTING.md)**

### Development Workflow

Every feature should follow this process (detailed in [SOP.md](SOP.md)):

1. **Research** - Read docs and plan implementation
2. **Implement** - Write clean, typed code
3. **Test** - Write comprehensive tests
4. **Verify** - Ensure tests pass with ≥80% coverage
5. **Cleanup** - Remove dead code and refactor
6. **Document** - Update all relevant documentation
7. **Review** - Self-review and validate

## Extensibility

The server is designed to be easily extended:

1. **Add New Tools**: Create new tool files in `src/tools/`
2. **Add New APIs**: Implement new SP-API endpoints in `src/utils/sp-api-client.ts`
3. **Custom Data Processing**: Add utility functions for data transformation
4. **Caching**: Implement caching layer for frequently accessed data

## Security Considerations

- Never commit `.env` file or credentials
- Use IAM roles with least privilege
- Rotate refresh tokens periodically
- Implement request logging for audit trails
- Validate all input parameters

### .gitignore

Ensure your `.gitignore` includes:

```
# Dependencies
node_modules/

# Environment
.env
.env.local
.env.test

# Build
build/
dist/

# Testing
coverage/
*.lcov
.nyc_output/

# Logs
logs/
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

## Resources

### Amazon SP-API

- [Amazon SP-API Documentation](https://developer-docs.amazon.com/sp-api/)
- [SP-API GitHub Examples](https://github.com/amzn/selling-partner-api-models)
- [Seller Central Help](https://sellercentral.amazon.com/help/hub)

### MCP Protocol

- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [MCP Servers Repository](https://github.com/modelcontextprotocol/servers)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)

### Complementary MCP Servers

For complete Amazon business analytics, consider using these MCPs alongside this server:

- **Google Sheets MCP**: [@modelcontextprotocol/server-gdrive](https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive)
  - Store SKU cost data, margins, and business metrics
  - Setup: [Google Drive MCP Setup Guide](https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive#setup)

- **PostgreSQL MCP**: [@modelcontextprotocol/server-postgres](https://github.com/modelcontextprotocol/servers/tree/main/src/postgres)
  - Store historical data for analytics and reporting

- **Filesystem MCP**: [@modelcontextprotocol/server-filesystem](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem)
  - Manage product images, documentation, and reports

## License

MIT

## Contributing

Contributions are welcome! Please follow these guidelines:

**📋 Read [SOP.md](SOP.md) first** - it contains the complete development workflow.

### Quick Start for Contributors

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/your-feature`)
3. **Follow the SOP** - Complete all 7 steps for your feature
4. **Ensure quality gates pass**:
   - ✅ All tests pass
   - ✅ Coverage ≥80%
   - ✅ No TypeScript errors
   - ✅ No linting errors
5. **Update documentation** - README, ROADMAP, inline docs
6. **Submit a pull request**

### Development Standards

- Follow the [SOP.md](SOP.md) workflow for all changes
- Write tests before or alongside implementation (TDD encouraged)
- Maintain ≥80% code coverage
- Update documentation for all user-facing changes
- Use conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)

### Areas to Contribute

See [ROADMAP.md](ROADMAP.md) for planned features and [GitHub Issues](#) for open tasks.

## Support

For issues related to:
- **SP-API**: Consult Amazon SP-API documentation
- **MCP Protocol**: Visit modelcontextprotocol.io
- **This Server**: Open an issue in this repository

## Roadmap

This project is under active development. We're following a phased approach from MVP to production-ready.

**Current Phase**: Phase 1 (MVP) - Building core authentication and basic tools

📄 **For detailed roadmap and feature planning, see [ROADMAP.md](ROADMAP.md)**
