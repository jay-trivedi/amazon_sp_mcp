# Project Roadmap

This document outlines the development phases for the Amazon Seller Central MCP server.

## 📋 Before Starting Any Task

**Read [SOP.md](SOP.md)** - Every task in this roadmap should follow the Standard Operating Procedure:
1. Research & Planning
2. Implementation
3. Write Tests
4. Run Tests & Verify
5. Cleanup
6. Update Documentation
7. Code Review & Validation

This ensures consistent quality and maintainability across all features.

## Phase 1: MVP (Minimum Viable Product)

**Goal**: Basic functional MCP server with core Amazon SP-API integration

**Timeline**: 4-6 weeks total (broken into 6 sub-phases)

Phase 1 is divided into smaller sub-phases for easier implementation and tracking. Each sub-phase should be completed fully (following [SOP.md](SOP.md)) before moving to the next.

---

### Phase 1.1: Project Foundation ✅

**Status**: ✅ COMPLETED
**Duration**: ~1 week

#### Tasks
- [x] Project setup and architecture
- [x] Testing infrastructure setup
- [x] Documentation structure (README, SOP, TESTING, ROADMAP)
- [x] Git repository initialization
- [x] GitHub repository creation

#### Deliverables
- [x] Complete documentation framework
- [x] Testing guidelines and infrastructure
- [x] GitHub repository with initial commit

#### Success Criteria
- [x] All documentation files created and reviewed
- [x] SOP workflow defined for future development
- [x] Repository publicly accessible on GitHub

---

### Phase 1.2: TypeScript/Node.js Setup ✅

**Status**: ✅ COMPLETED
**Duration**: ~3-4 days
**Dependencies**: Phase 1.1

#### Tasks
- [x] Initialize npm project (`package.json`)
- [x] Configure TypeScript (`tsconfig.json`, `tsconfig.test.json`)
- [x] Install core dependencies:
  - [x] `@modelcontextprotocol/sdk`
  - [x] `typescript`, `ts-node`
  - [x] Development tools (ESLint, Prettier)
- [x] Install testing dependencies:
  - [x] `jest`, `ts-jest`, `@types/jest`
  - [x] `nock` for HTTP mocking
- [x] Configure build scripts (`npm run build`, `npm run dev`)
- [x] Configure test scripts (all test commands from TESTING.md)
- [x] Create basic project structure (empty directories)
- [x] Write a "Hello World" MCP server to verify setup

#### Deliverables
- [x] `package.json` with all dependencies
- [x] `tsconfig.json` configured
- [x] Build system working (`npm run build` succeeds)
- [x] Test system working (`npm test` runs)
- [x] Basic MCP server boots successfully

#### Success Criteria
- [x] `npm run build` compiles without errors
- [x] `npm test` runs (all tests passing: 3/3)
- [x] Can run MCP server with `node build/index.js`
- [x] TypeScript types are properly configured
- [x] Linter runs without errors

---

### Phase 1.3: Authentication System ✅

**Status**: ✅ COMPLETED
**Duration**: ~1 week
**Dependencies**: Phase 1.2

#### Tasks
- [x] **Environment configuration**
  - [x] Create `.env` support with `dotenv`
  - [x] Load AWS and LWA credentials from environment
  - [x] Validate required environment variables on startup

- [x] **LWA OAuth 2.0 implementation**
  - [x] Implement token exchange (refresh token → access token)
  - [x] Create `TokenManager` class
  - [x] Add token caching (in-memory)
  - [x] Add token expiration checking
  - [x] Implement automatic token refresh

- [x] **AWS Signature V4**
  - [x] Install `aws4` library and types
  - [x] Implement request signing for SP-API calls
  - [x] Create signature helper functions

- [x] **Credential management**
  - [x] Create `CredentialsManager` class
  - [x] Implement credential validation
  - [x] Add error handling for missing/invalid credentials

#### Deliverables
- [x] `src/auth/credentials.ts` - Credential management
- [x] `src/auth/token-manager.ts` - LWA token handling
- [x] `src/config/sp-api.ts` - SP-API configuration
- [x] `src/utils/aws-signature.ts` - AWS Signature V4 utility
- [x] `src/types/sp-api.d.ts` - Type definitions
- [x] Unit tests for all auth components (98.24% coverage!)
- [x] Integration test for token refresh flow (6 tests)

#### Success Criteria
- [x] Can successfully obtain access token from LWA
- [x] Access tokens are cached and reused
- [x] Expired tokens are automatically refreshed
- [x] AWS Signature V4 is correctly generated
- [x] All tests pass (41/41 tests passing)
- [x] Code coverage: 98.24% (exceeds 80% requirement)
- [x] Error handling works for invalid credentials
- [x] No TypeScript errors
- [x] No linting errors

---

### Phase 1.4: SP-API HTTP Client & Rate Limiting ✅

**Status**: ✅ COMPLETED
**Duration**: ~4-5 days
**Dependencies**: Phase 1.3

#### Tasks
- [x] **HTTP Client implementation**
  - [x] Install HTTP client library (`axios` or `node-fetch`)
  - [x] Create `SPAPIClient` base class
  - [x] Add request method with auth headers
  - [x] Add AWS signature to all requests
  - [x] Add LWA access token to headers
  - [x] Implement response parsing

- [x] **Error handling**
  - [x] Create custom error classes (`SPAPIError`)
  - [x] Handle HTTP errors (4xx, 5xx)
  - [x] Parse SP-API error responses
  - [x] Implement retry logic for transient failures (429, 503)

- [x] **Rate limiting**
  - [x] Create `RateLimiter` utility
  - [x] Implement token bucket algorithm
  - [x] Add rate limits per endpoint (from SP-API docs)
  - [x] Queue requests when rate limit reached
  - [x] Add configurable rate limits

#### Deliverables
- [x] `src/utils/sp-api-client.ts` - HTTP client
- [x] `src/utils/rate-limiter.ts` - Rate limiting
- [x] `src/types/sp-api.d.ts` - Type definitions
- [x] `src/utils/errors.ts` - Error classes
- [x] Unit tests for client and rate limiter (65 tests)
- [x] Integration tests with mocked HTTP responses (9 tests)

#### Success Criteria
- [x] Can make authenticated requests to SP-API
- [x] Rate limiting prevents quota exceeded errors
- [x] Retries work for transient failures with exponential backoff
- [x] Error messages are clear and actionable
- [x] All tests pass (120/120) with 94.71% coverage (exceeds 80% requirement!)
- [x] Mock tests verify correct headers and signatures
- [x] No TypeScript errors
- [x] No linting errors

---

### Phase 1.5: Orders/Sales Tools

**Status**: 🔄 NOT STARTED
**Duration**: ~1 week
**Dependencies**: Phase 1.4

#### Tasks
- [ ] **Orders API client methods**
  - [ ] Implement `SPAPIClient.getOrders(params)`
  - [ ] Implement `SPAPIClient.getOrder(orderId)`
  - [ ] Add pagination support for large result sets
  - [ ] Add date range filtering
  - [ ] Add order status filtering

- [ ] **MCP Tools**
  - [ ] Create `get_orders` tool
    - Input: startDate, endDate, orderStatuses (optional)
    - Output: List of orders with key details
  - [ ] Create `get_order_details` tool
    - Input: orderId
    - Output: Complete order information
  - [ ] Create `get_sales_metrics` tool (optional)
    - Input: startDate, endDate
    - Output: Aggregated metrics (revenue, units, etc.)

- [ ] **Data formatting**
  - [ ] Format order data for readability
  - [ ] Calculate totals and summaries
  - [ ] Handle different currencies

- [ ] **MCP Server integration**
  - [ ] Register tools with MCP server
  - [ ] Create `src/index.ts` MCP server entry point
  - [ ] Wire up tool handlers

#### Deliverables
- [ ] `src/tools/sales.ts` - Sales MCP tools
- [ ] Working `get_orders` tool
- [ ] Working `get_order_details` tool
- [ ] Unit tests for tool logic
- [ ] Integration tests for Orders API
- [ ] E2E tests for MCP tools
- [ ] Test fixtures with sample order data

#### Success Criteria
- [ ] Can retrieve orders from last 30 days via MCP
- [ ] Can get details for a specific order
- [ ] Date filtering works correctly
- [ ] Pagination works for large result sets
- [ ] Tools work in Claude Code/Desktop
- [ ] All tests pass with ≥80% coverage

---

### Phase 1.6: Inventory Tools

**Status**: 🔄 NOT STARTED
**Duration**: ~5-6 days
**Dependencies**: Phase 1.4 (can run parallel with 1.5)

#### Tasks
- [ ] **FBA Inventory API client methods**
  - [ ] Implement `SPAPIClient.getFBAInventory()`
  - [ ] Implement `SPAPIClient.getInventoryHealth()`
  - [ ] Add SKU/ASIN filtering
  - [ ] Handle pagination

- [ ] **MCP Tools**
  - [ ] Create `get_inventory_summary` tool
    - Input: None or SKU filter (optional)
    - Output: Inventory levels for all/filtered SKUs
  - [ ] Create `get_fba_inventory` tool
    - Input: marketplace (optional)
    - Output: FBA inventory details
  - [ ] Create `check_stock_levels` tool
    - Input: List of SKUs/ASINs
    - Output: Stock levels for specified products

#### Deliverables
- [ ] `src/tools/inventory.ts` - Inventory MCP tools
- [ ] Working inventory tools
- [ ] Unit tests for tool logic
- [ ] Integration tests for FBA Inventory API
- [ ] E2E tests for MCP tools
- [ ] Test fixtures with sample inventory data

#### Success Criteria
- [ ] Can check current FBA inventory levels
- [ ] Can filter by specific SKUs/ASINs
- [ ] Inventory health metrics are accurate
- [ ] Tools work in Claude Code/Desktop
- [ ] All tests pass with ≥80% coverage

---

### Phase 1.7: Reports Tools

**Status**: 🔄 NOT STARTED
**Duration**: ~5-6 days
**Dependencies**: Phase 1.4 (can run parallel with 1.5, 1.6)

#### Tasks
- [ ] **Reports API client methods**
  - [ ] Implement `SPAPIClient.createReport(reportType, params)`
  - [ ] Implement `SPAPIClient.getReport(reportId)`
  - [ ] Implement `SPAPIClient.getReportDocument(documentId)`
  - [ ] Implement report status polling
  - [ ] Implement report document download and parsing

- [ ] **MCP Tools**
  - [ ] Create `request_report` tool
    - Input: reportType, startDate, endDate
    - Output: Report request confirmation with ID
  - [ ] Create `get_report` tool
    - Input: reportId
    - Output: Report status or data if complete
  - [ ] Create `list_reports` tool (optional)
    - Input: reportTypes (optional)
    - Output: List of recent reports

- [ ] **Report parsing**
  - [ ] Parse tab-delimited report format
  - [ ] Support common report types (sales, inventory)
  - [ ] Handle compressed reports (gzip)

#### Deliverables
- [ ] `src/tools/reports.ts` - Reports MCP tools
- [ ] Working reports tools
- [ ] Report parsing utilities
- [ ] Unit tests for tool logic
- [ ] Integration tests for Reports API
- [ ] E2E tests for MCP tools
- [ ] Test fixtures with sample report data

#### Success Criteria
- [ ] Can request a new report
- [ ] Can check report status
- [ ] Can download and parse completed reports
- [ ] Handles report processing delays gracefully
- [ ] Tools work in Claude Code/Desktop
- [ ] All tests pass with ≥80% coverage

---

### Phase 1.8: Integration, Polish & Documentation

**Status**: 🔄 NOT STARTED
**Duration**: ~3-4 days
**Dependencies**: Phases 1.5, 1.6, 1.7

#### Tasks
- [ ] **Integration testing**
  - [ ] Test complete workflows end-to-end
  - [ ] Test error scenarios across all tools
  - [ ] Test rate limiting under load
  - [ ] Verify all tools work together

- [ ] **Code cleanup**
  - [ ] Remove debug code and console.logs
  - [ ] Refactor duplicated code
  - [ ] Optimize imports
  - [ ] Run linter and fix all issues
  - [ ] Format all code consistently

- [ ] **Documentation updates**
  - [ ] Update README with actual usage examples
  - [ ] Add JSDoc comments to all public APIs
  - [ ] Update ROADMAP to mark Phase 1 complete
  - [ ] Create CHANGELOG.md with Phase 1 changes
  - [ ] Add troubleshooting section to README

- [ ] **Manual testing**
  - [ ] Build production bundle
  - [ ] Test with Claude Code
  - [ ] Test with Claude Desktop
  - [ ] Verify all example queries from README work

- [ ] **Performance optimization**
  - [ ] Profile critical paths
  - [ ] Optimize slow operations
  - [ ] Add request caching where appropriate

#### Deliverables
- [ ] All tests passing with ≥80% coverage
- [ ] Clean, well-documented code
- [ ] Updated documentation
- [ ] Working production build
- [ ] CHANGELOG.md for Phase 1

#### Success Criteria
- [ ] All Phase 1 tools work flawlessly
- [ ] MCP server boots in <2 seconds
- [ ] Code coverage ≥80% for all modules
- [ ] No TypeScript errors or warnings
- [ ] No linter errors or warnings
- [ ] Manual testing passes all scenarios
- [ ] Ready for production use

---

## Phase 1 Summary

### Overall Deliverables
- ✅ Complete project foundation and documentation
- ⏳ Working MCP server executable
- ⏳ Authentication system (LWA OAuth + AWS Sig V4)
- ⏳ Core tools: `get_orders`, `get_order_details`, `get_inventory_summary`, `request_report`, `get_report`
- ⏳ Comprehensive test suite with ≥80% coverage
- ⏳ Production-ready code

### Overall Success Criteria
- ✅ Project is well-documented and organized
- ⏳ MCP server connects to Amazon SP-API successfully
- ⏳ Can retrieve orders from last 30 days
- ⏳ Can check FBA inventory levels
- ⏳ Can request and download sales reports
- ⏳ Works seamlessly with Claude Code and Claude Desktop
- ⏳ 80%+ test coverage for all implemented features
- ⏳ Code is clean, maintainable, and follows best practices

### Timeline Summary
- **Phase 1.1**: ✅ COMPLETED (~1 week)
- **Phase 1.2**: ~3-4 days (Node.js/TypeScript setup)
- **Phase 1.3**: ~1 week (Authentication)
- **Phase 1.4**: ~4-5 days (HTTP Client & Rate Limiting)
- **Phase 1.5**: ~1 week (Orders/Sales)
- **Phase 1.6**: ~5-6 days (Inventory) - *can parallel with 1.5*
- **Phase 1.7**: ~5-6 days (Reports) - *can parallel with 1.5, 1.6*
- **Phase 1.8**: ~3-4 days (Integration & Polish)

**Total**: 4-6 weeks (with some parallel work)

---

## Phase 2: Extended Functionality

**Goal**: Add remaining core data types and improve reliability

### Tasks

- [ ] Returns and refunds data
  - [ ] Returns API integration
  - [ ] Return details retrieval
  - [ ] Refund information
  - [ ] Return metrics calculation
- [ ] Listing management tools
  - [ ] Catalog Items API integration
  - [ ] Product listing retrieval
  - [ ] ASIN details lookup
  - [ ] Search catalog functionality
- [ ] Advanced filtering and search
  - [ ] Complex query parameters
  - [ ] Multi-field filtering
  - [ ] Pagination support
  - [ ] Sorting options
- [ ] Caching layer
  - [ ] In-memory cache for frequent queries
  - [ ] Cache invalidation strategy
  - [ ] Configurable TTL
  - [ ] Cache statistics
- [ ] Integration tests for all tools
  - [ ] Mocked SP-API responses
  - [ ] Error scenario testing
  - [ ] Rate limiting tests

### Deliverables

- Returns tools: `get_returns`, `get_return_details`
- Listing tools: `get_listings`, `get_product_details`, `search_catalog`
- Caching system with configurable options
- Comprehensive integration test suite

### Success Criteria

- All core SP-API endpoints are accessible
- Caching reduces redundant API calls by 50%+
- Integration tests cover all tools
- Response times < 2 seconds for cached queries
- Handles pagination for large result sets

---

## Phase 3: Advanced Features

**Goal**: Add business intelligence and operational tools

### Tasks

- [ ] Order fulfillment operations
  - [ ] Fulfillment API integration
  - [ ] Shipment creation
  - [ ] Tracking updates
  - [ ] Fulfillment status
- [ ] Pricing tools
  - [ ] Competitive pricing data
  - [ ] Pricing API integration
  - [ ] Price change history
  - [ ] Buy Box analytics
- [ ] Advertising API integration
  - [ ] Sponsored Products data
  - [ ] Campaign metrics
  - [ ] Ad spend analysis
  - [ ] ACOS/ROAS calculations
- [ ] Performance metrics
  - [ ] Seller performance dashboard
  - [ ] Account health metrics
  - [ ] Policy compliance checking
  - [ ] Performance notifications
- [ ] E2E test coverage
  - [ ] Full workflow tests
  - [ ] MCP protocol compliance tests
  - [ ] Performance benchmarks

### Deliverables

- Fulfillment tools for order management
- Pricing intelligence tools
- Advertising analytics integration
- Performance monitoring tools
- Complete E2E test suite

### Success Criteria

- Can manage order fulfillment through MCP
- Provides competitive pricing insights
- Tracks advertising performance metrics
- E2E tests cover critical user workflows
- Performance metrics meet SLA requirements

---

## Phase 4: Scale & Optimize

**Goal**: Production-ready with advanced analytics and multi-marketplace support

### Tasks

- [ ] Real-time notifications
  - [ ] Notifications API integration
  - [ ] Webhook support
  - [ ] Event subscriptions (orders, inventory, etc.)
  - [ ] Real-time alerts
- [ ] Bulk operations
  - [ ] Batch order processing
  - [ ] Bulk inventory updates
  - [ ] Batch report requests
  - [ ] Parallel API calls with rate limiting
- [ ] Analytics and insights
  - [ ] Trend analysis
  - [ ] Predictive inventory alerts
  - [ ] Sales forecasting
  - [ ] Anomaly detection
- [ ] Multi-marketplace support
  - [ ] Support all Amazon marketplaces (US, UK, EU, JP, etc.)
  - [ ] Marketplace-specific configurations
  - [ ] Currency conversion
  - [ ] Localization support
- [ ] Load testing and performance benchmarks
  - [ ] Stress tests for high-volume scenarios
  - [ ] Performance optimization
  - [ ] Memory profiling
  - [ ] Latency optimization

### Deliverables

- Real-time notification system
- Bulk operation tools
- Advanced analytics dashboard
- Multi-marketplace configuration
- Performance benchmarks and optimization report

### Success Criteria

- Supports 10+ Amazon marketplaces
- Handles 1000+ orders/minute in bulk operations
- Real-time notifications with <5s latency
- 95th percentile response time < 500ms
- Analytics provide actionable insights

---

## Future Enhancements

Ideas for post-v1 development:

### Data Export & Reporting
- [ ] Custom report builder
- [ ] Export to CSV/Excel
- [ ] Scheduled reports
- [ ] Email report delivery

### Machine Learning Integration
- [ ] Demand forecasting models
- [ ] Price optimization recommendations
- [ ] Fraud detection
- [ ] Review sentiment analysis

### Third-Party Integrations
- [ ] QuickBooks/Xero accounting sync
- [ ] Shopify/WooCommerce integration
- [ ] Shipping provider APIs
- [ ] CRM integrations

### Developer Tools
- [ ] CLI tool for MCP server
- [ ] Web dashboard for monitoring
- [ ] API documentation generator
- [ ] Sandbox mode for testing

### Compliance & Security
- [ ] SOC 2 compliance
- [ ] GDPR compliance tools
- [ ] Audit logging
- [ ] Role-based access control

---

## Version History

### v0.1.0 (Planned)
- Initial release with Phase 1 features
- Core authentication and basic tools
- MVP functionality

### v0.2.0 (Planned)
- Phase 2 features
- Returns and listings support
- Caching layer

### v0.3.0 (Planned)
- Phase 3 features
- Advanced business intelligence
- Full tool coverage

### v1.0.0 (Planned)
- Phase 4 features
- Production-ready
- Multi-marketplace support
- Performance optimized

---

## Contributing to Roadmap

Have ideas for features? Here's how to contribute:

1. **Open an Issue**: Describe the feature and use case
2. **Discussion**: Engage with maintainers and community
3. **Proposal**: Write a detailed feature proposal
4. **Implementation**: Submit a PR after approval

---

## Timeline Estimates

These are rough estimates and subject to change:

| Phase | Duration | Target Completion |
|-------|----------|-------------------|
| Phase 1 (MVP) | 4-6 weeks | Q1 2025 |
| Phase 2 (Extended) | 4-6 weeks | Q2 2025 |
| Phase 3 (Advanced) | 6-8 weeks | Q3 2025 |
| Phase 4 (Scale) | 8-10 weeks | Q4 2025 |

**Note**: Timeline depends on:
- Developer availability
- Community contributions
- Amazon SP-API changes
- Feature complexity

---

## Dependencies & Blockers

### External Dependencies
- Amazon SP-API stability and availability
- MCP protocol updates
- Third-party service integrations

### Known Blockers
- None currently identified

### Risk Mitigation
- Maintain SP-API documentation awareness
- Follow MCP protocol changes
- Build robust error handling
- Implement comprehensive testing

---

## Feedback & Updates

This roadmap is a living document and will be updated based on:
- User feedback
- Market needs
- Technical constraints
- Community contributions

Last updated: 2025-01-17
