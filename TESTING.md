# Testing Infrastructure

## Overview

The project uses a comprehensive testing strategy with three levels of tests:

1. **Unit Tests**: Test individual functions and modules in isolation
2. **Integration Tests**: Test interactions with SP-API (mocked)
3. **End-to-End Tests**: Test complete MCP tool workflows

## Testing Framework

We use **Jest** as the primary testing framework with TypeScript support via **ts-jest**.

## Test Organization

```
tests/
├── unit/           # Fast, isolated tests for individual functions
├── integration/    # Tests for API interactions (mocked)
├── e2e/           # Full workflow tests
├── fixtures/      # Sample data for tests
├── mocks/         # Reusable mock implementations
└── setup.ts       # Global test configuration
```

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only e2e tests
npm run test:e2e

# Run tests in CI mode
npm run test:ci
```

## Unit Tests

Unit tests focus on testing individual modules without external dependencies.

**Example Structure** (`tests/unit/auth/token-manager.test.ts`):

```typescript
import { TokenManager } from '../../../src/auth/token-manager';
import { mockLWACredentials } from '../../mocks/token-mock';

describe('TokenManager', () => {
  let tokenManager: TokenManager;

  beforeEach(() => {
    tokenManager = new TokenManager(mockLWACredentials);
  });

  describe('getAccessToken', () => {
    it('should return a valid access token', async () => {
      const token = await tokenManager.getAccessToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should cache tokens until expiration', async () => {
      const token1 = await tokenManager.getAccessToken();
      const token2 = await tokenManager.getAccessToken();
      expect(token1).toBe(token2);
    });

    it('should refresh expired tokens', async () => {
      // Test token refresh logic
    });
  });
});
```

## Integration Tests

Integration tests verify interactions with external services (SP-API) using mocked HTTP responses.

**Example Structure** (`tests/integration/sp-api.test.ts`):

```typescript
import nock from 'nock';
import { SPAPIClient } from '../../src/utils/sp-api-client';
import ordersFixture from '../fixtures/orders.json';

describe('SP-API Integration', () => {
  let client: SPAPIClient;

  beforeEach(() => {
    client = new SPAPIClient();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Orders API', () => {
    it('should fetch orders successfully', async () => {
      nock('https://sellingpartnerapi-na.amazon.com')
        .get('/orders/v0/orders')
        .query(true)
        .reply(200, ordersFixture);

      const orders = await client.getOrders({
        createdAfter: '2024-01-01'
      });

      expect(orders).toHaveLength(5);
      expect(orders[0].AmazonOrderId).toBeDefined();
    });

    it('should handle rate limiting', async () => {
      nock('https://sellingpartnerapi-na.amazon.com')
        .get('/orders/v0/orders')
        .query(true)
        .reply(429, { errors: [{ code: 'QuotaExceeded' }] });

      await expect(client.getOrders()).rejects.toThrow('QuotaExceeded');
    });
  });
});
```

## End-to-End Tests

E2E tests validate complete MCP tool workflows from input to output.

**Example Structure** (`tests/e2e/mcp-tools.test.ts`):

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { setupTestServer } from '../setup';

describe('MCP Tools E2E', () => {
  let server: Server;

  beforeAll(async () => {
    server = await setupTestServer();
  });

  describe('get_orders tool', () => {
    it('should retrieve orders and return formatted data', async () => {
      const result = await server.callTool('get_orders', {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      });

      expect(result.content).toBeDefined();
      expect(result.isError).toBe(false);
    });
  });
});
```

## Test Fixtures

Test fixtures contain sample data from SP-API responses.

**Example** (`tests/fixtures/orders.json`):

```json
{
  "payload": {
    "Orders": [
      {
        "AmazonOrderId": "123-4567890-1234567",
        "PurchaseDate": "2024-01-15T10:30:00Z",
        "OrderStatus": "Shipped",
        "OrderTotal": {
          "CurrencyCode": "USD",
          "Amount": "49.99"
        }
      }
    ]
  }
}
```

## Mocking Strategy

### HTTP Mocking with Nock

- Mock external API calls to SP-API
- Simulate various response scenarios (success, errors, rate limits)
- No real API calls during tests

### Module Mocking with Jest

- Mock authentication modules
- Mock environment variables
- Mock file system operations

**Example Mock** (`tests/mocks/sp-api-mock.ts`):

```typescript
export const mockSPAPIClient = {
  getOrders: jest.fn(),
  getInventory: jest.fn(),
  getReturns: jest.fn(),
  requestReport: jest.fn()
};

export const mockTokenResponse = {
  access_token: 'mock_access_token',
  expires_in: 3600,
  token_type: 'bearer'
};
```

## Test Configuration

### Jest Configuration

**`jest.config.js`**:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**'
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testTimeout: 10000
};
```

### TypeScript Test Configuration

**`tsconfig.test.json`**:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["jest", "node"]
  },
  "include": ["tests/**/*", "src/**/*"]
}
```

## Code Coverage

Target coverage thresholds:
- **Lines**: 80%+
- **Branches**: 80%+
- **Functions**: 80%+
- **Statements**: 80%+

Generate coverage reports:

```bash
npm run test:coverage
```

View HTML coverage report:

```bash
open coverage/lcov-report/index.html
```

## Continuous Integration

### GitHub Actions Workflow

**`.github/workflows/test.yml`**:

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run tests
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
```

## Test Environment Variables

Create `.env.test` for test-specific configuration:

```env
# Test credentials (mock values)
AWS_ACCESS_KEY_ID=test_access_key
AWS_SECRET_ACCESS_KEY=test_secret_key
LWA_CLIENT_ID=test_client_id
LWA_CLIENT_SECRET=test_client_secret
LWA_REFRESH_TOKEN=test_refresh_token
SELLER_ID=test_seller_id
MARKETPLACE_ID=ATVPDKIKX0DER

# Use mock endpoint for tests
SP_API_ENDPOINT=http://localhost:3000/mock-sp-api
```

## Running Tests in Development

### Watch Mode

```bash
npm run test:watch
```

### Debugging Tests

Add to `launch.json` (VS Code):

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Best Practices

1. **Keep tests fast**: Unit tests should run in milliseconds
2. **Use descriptive test names**: Follow "should do X when Y" pattern
3. **Test edge cases**: Include error scenarios, empty data, boundary conditions
4. **Mock external dependencies**: Never make real API calls in tests
5. **Maintain test fixtures**: Keep sample data up-to-date with API changes
6. **Write tests first**: Consider TDD for critical functionality
7. **Clean up**: Use `beforeEach`/`afterEach` to reset state
8. **Avoid test interdependence**: Each test should run independently

## Testing NPM Scripts

Add these scripts to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "jest tests/e2e",
    "test:ci": "jest --ci --coverage --maxWorkers=2",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
  }
}
```

## Dependencies for Testing

Install these dev dependencies:

```bash
npm install --save-dev \
  jest \
  ts-jest \
  @types/jest \
  nock \
  @types/nock \
  jest-mock-extended \
  @shelf/jest-mongodb
```

## Test Coverage Reports

### Local Coverage Report

After running `npm run test:coverage`, you'll get:

```
PASS  tests/unit/auth/token-manager.test.ts
PASS  tests/unit/utils/rate-limiter.test.ts
PASS  tests/integration/sp-api.test.ts

Test Suites: 15 passed, 15 total
Tests:       127 passed, 127 total
Snapshots:   0 total
Time:        12.456 s

Coverage summary:
Statements   : 85.23% ( 234/274 )
Branches     : 82.14% ( 92/112 )
Functions    : 87.50% ( 56/64 )
Lines        : 85.71% ( 228/266 )
```

### CI Coverage Integration

Integrate with code coverage services:
- **Codecov**: Upload coverage to Codecov for PR tracking
- **Coveralls**: Alternative coverage tracking
- **SonarQube**: Code quality and coverage analysis

## Writing New Tests

### When to Write Tests

- Before implementing new features (TDD)
- When fixing bugs (regression tests)
- For all public APIs and tools
- For critical authentication/security code
- For complex business logic

### Test Structure Template

```typescript
// tests/unit/tools/new-feature.test.ts
import { NewFeature } from '../../../src/tools/new-feature';
import { mockDependency } from '../../mocks/dependency-mock';

describe('NewFeature', () => {
  let feature: NewFeature;

  beforeEach(() => {
    feature = new NewFeature(mockDependency);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      const input = { /* test data */ };

      // Act
      const result = await feature.methodName(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('success');
    });

    it('should handle error case', async () => {
      // Arrange
      const invalidInput = { /* bad data */ };

      // Act & Assert
      await expect(feature.methodName(invalidInput))
        .rejects.toThrow('Expected error message');
    });

    it('should handle edge case', async () => {
      // Test boundary conditions
    });
  });
});
```

## Troubleshooting

### Tests Failing Locally

1. **Clear Jest cache**: `npm run test -- --clearCache`
2. **Check Node version**: Ensure Node 18+ is installed
3. **Verify dependencies**: Run `npm install` again
4. **Check environment**: Ensure `.env.test` exists

### Tests Pass Locally but Fail in CI

1. **Check Node versions**: CI might use different version
2. **Timezone issues**: Use UTC for date comparisons
3. **Race conditions**: Add proper async/await handling
4. **Environment variables**: Ensure CI has access to secrets

### Slow Tests

1. **Identify slow tests**: Use `jest --verbose` to see timing
2. **Reduce timeout**: Lower `testTimeout` for faster failure
3. **Parallelize**: Jest runs tests in parallel by default
4. **Mock heavy operations**: Don't make actual API calls

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
- [Nock Documentation](https://github.com/nock/nock)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
