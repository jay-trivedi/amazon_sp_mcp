# Standard Operating Procedure (SOP)

This document defines the step-by-step process to follow when implementing each task from the [ROADMAP.md](ROADMAP.md).

## Overview

Every roadmap task should follow this workflow to ensure quality, maintainability, and consistency:

```
Research → Plan → Implement → Test → Cleanup → Document → Review
```

---

## ⚠️ CRITICAL: NO SHORTCUTS POLICY

**This is a non-negotiable rule that must NEVER be bypassed.**

### Testing Integrity

**NEVER take shortcuts when writing or fixing tests:**

- ❌ **NEVER** make tests pass by removing or weakening assertions
- ❌ **NEVER** skip failing tests or mark them as `.skip()` or `.todo()`
- ❌ **NEVER** reduce coverage thresholds to make tests pass
- ❌ **NEVER** mock functionality just to avoid testing the real logic
- ❌ **NEVER** change test expectations to match broken behavior
- ❌ **NEVER** disable strict type checking to avoid fixing type errors

**ALWAYS fix the root cause:**

- ✅ **ALWAYS** investigate why a test is failing
- ✅ **ALWAYS** fix the actual bug or implementation issue
- ✅ **ALWAYS** ensure tests validate real functionality, not mocked shortcuts
- ✅ **ALWAYS** maintain or increase coverage - never decrease it
- ✅ **ALWAYS** ensure tests validate actual behavior, not just pass green
- ✅ **ALWAYS** write tests that would catch real bugs

**If a test is failing:**
1. Understand WHY it's failing (read the error, debug the code)
2. Fix the implementation OR fix the test if the expectation was wrong
3. NEVER weaken the test just to make it pass

### Linting & Type Safety Integrity

**NEVER take shortcuts with code quality:**

- ❌ **NEVER** add files/directories to `.eslintignore` to bypass linting
- ❌ **NEVER** use `eslint-disable` comments to suppress real issues
- ❌ **NEVER** use `@ts-ignore` or `@ts-expect-error` to bypass type errors
- ❌ **NEVER** use `any` type to avoid proper typing
- ❌ **NEVER** disable strict TypeScript checks
- ❌ **NEVER** lower linting rule strictness to avoid fixing code

**ALWAYS maintain code quality:**

- ✅ **ALWAYS** fix linting errors by improving the code
- ✅ **ALWAYS** fix type errors with proper type definitions
- ✅ **ALWAYS** include all source code in linting (including scripts, tools, etc.)
- ✅ **ALWAYS** maintain strict TypeScript settings
- ✅ **ALWAYS** use proper types instead of `any`

**The only acceptable exceptions:**
- `eslint-disable no-console` in CLI scripts where console output is intentional
- Ignoring third-party files (node_modules, build output, generated code)
- Type assertions when you have more information than TypeScript (with comments explaining why)

### Why This Matters

**Tests are your safety net** - weakening them is like cutting your own parachute. Fake passing tests are WORSE than no tests because they give false confidence.

**Linting and type safety catch bugs before they ship** - bypassing them means shipping preventable bugs to users.

**Technical debt compounds** - shortcuts taken today become major problems tomorrow.

### Enforcement

When working on this codebase:
1. If tests fail, fix the implementation (or the test expectation if it was wrong)
2. If linting fails, fix the code (don't silence the warning)
3. If types are wrong, add proper types (don't use `any` or `@ts-ignore`)
4. If coverage drops, add more tests (don't lower the threshold)

**There are NO exceptions to this rule unless explicitly documented and justified.**

---

## ⚠️ CRITICAL: ALWAYS WORK IN FEATURE BRANCHES

**NEVER commit directly to main branch.**

### Branching Policy

**ALWAYS create a feature branch before starting work:**

- ✅ **ALWAYS** create a new branch from main for each task
- ✅ **ALWAYS** use descriptive branch names following the convention below
- ✅ **ALWAYS** keep branches focused on a single feature/fix
- ✅ **ALWAYS** merge to main only after all quality gates pass
- ❌ **NEVER** commit directly to main branch
- ❌ **NEVER** push untested code to any branch
- ❌ **NEVER** merge without ensuring all tests pass

### Branch Naming Convention

```bash
feature/phase-1-4-http-client      # For new features
fix/rate-limiter-timing            # For bug fixes
docs/update-setup-guide            # For documentation
test/add-integration-tests         # For test additions
refactor/simplify-error-handling   # For refactoring
```

### Workflow

**Before starting any task:**

```bash
# 1. Ensure you're on main and it's up to date
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Work on your feature (following all 7 SOP steps)

# 4. Before pushing, ensure quality gates pass
npm run build
npm run test:coverage
npm run lint
npm run type-check

# 5. Commit your changes
git add .
git commit -m "feat: your descriptive commit message"

# 6. Push feature branch
git push origin feature/your-feature-name

# 7. Only merge to main after verification
git checkout main
git merge feature/your-feature-name
git push origin main

# 8. Delete feature branch
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

### Why This Matters

- **Protects main branch** from broken code
- **Enables rollback** if something goes wrong
- **Makes code review easier** with clear history
- **Allows parallel work** on multiple features
- **Prevents conflicts** with other developers

### Exceptions

The ONLY time you commit directly to main:
- Initial repository setup (first commit)
- Hotfix for critical production issue (document why)

**For everything else: feature branch first, merge after validation.**

---

## Workflow Steps

### Step 1: Research & Planning

**Objective**: Understand requirements and gather necessary information before writing code.

#### Tasks:

- [ ] **Read the roadmap task** in [ROADMAP.md](ROADMAP.md)
  - Understand the feature scope
  - Identify dependencies on other tasks
  - Note success criteria

- [ ] **Review relevant documentation**
  - Amazon SP-API documentation for the specific endpoint
  - MCP SDK documentation for tool implementation
  - Review existing similar implementations in the codebase

- [ ] **Read API specifications**
  - Endpoint URLs and HTTP methods
  - Request/response schemas
  - Rate limits and quotas
  - Authentication requirements
  - Error codes and handling

- [ ] **Design the implementation**
  - Sketch out the API client method
  - Design the MCP tool interface (input schema, output format)
  - Identify helper functions needed
  - Plan error handling strategy

- [ ] **Update the roadmap**
  - Mark the task as "in progress" in ROADMAP.md
  - Add any sub-tasks discovered during planning

#### Documentation Sources:

- [Amazon SP-API Docs](https://developer-docs.amazon.com/sp-api/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [SP-API Models](https://github.com/amzn/selling-partner-api-models)
- Project files: `TESTING.md`, `README.md`, existing code in `src/`

#### Example Checklist for "Orders API Integration":

```markdown
- [x] Read SP-API Orders API documentation
- [x] Understand getOrders endpoint parameters (CreatedAfter, OrderStatuses, etc.)
- [x] Review rate limits (0.0167 requests/second)
- [x] Study authentication flow (LWA tokens + AWS Sig V4)
- [x] Design SPAPIClient.getOrders() method
- [x] Design get_orders MCP tool schema
```

---

### Step 2: Implementation

**Objective**: Write clean, maintainable code following project conventions.

#### Tasks:

- [ ] **Create/update source files**
  - Follow the project structure in `src/`
  - Use TypeScript with proper type definitions
  - Follow existing code style and patterns

- [ ] **Implement core functionality**
  - Create API client methods in `src/utils/sp-api-client.ts`
  - Implement authentication if needed in `src/auth/`
  - Add rate limiting logic in `src/utils/rate-limiter.ts`

- [ ] **Create MCP tools**
  - Add tool definitions in appropriate `src/tools/*.ts` file
  - Define input schemas with proper validation
  - Implement tool handlers
  - Format output for readability

- [ ] **Add type definitions**
  - Create types in `src/types/sp-api.d.ts`
  - Export types for use in other modules

- [ ] **Handle errors gracefully**
  - Catch and handle API errors
  - Provide meaningful error messages
  - Implement retry logic for transient failures

- [ ] **Add logging (optional)**
  - Log important operations
  - Don't log sensitive data (credentials, tokens)

#### Code Quality Checklist:

```markdown
- [ ] Code follows TypeScript best practices
- [ ] All functions have proper type signatures
- [ ] Error handling is comprehensive
- [ ] No hardcoded values (use environment variables)
- [ ] Code is DRY (Don't Repeat Yourself)
- [ ] Functions are single-purpose and testable
- [ ] Code is commented where necessary
- [ ] No console.log statements (use proper logging)
```

#### Example Implementation:

**API Client** (`src/utils/sp-api-client.ts`):
```typescript
export class SPAPIClient {
  async getOrders(params: GetOrdersParams): Promise<Order[]> {
    // Implementation with error handling, rate limiting, etc.
  }
}
```

**MCP Tool** (`src/tools/sales.ts`):
```typescript
export const getOrdersTool: Tool = {
  name: 'get_orders',
  description: 'Retrieve orders within a date range',
  inputSchema: {
    type: 'object',
    properties: {
      startDate: { type: 'string', description: 'Start date (ISO 8601)' },
      endDate: { type: 'string', description: 'End date (ISO 8601)' }
    },
    required: ['startDate', 'endDate']
  },
  handler: async (args) => {
    // Implementation
  }
};
```

---

### Step 3: Write Tests

**Objective**: Create comprehensive tests before or alongside implementation (TDD encouraged).

#### Tasks:

- [ ] **Create unit tests**
  - Test individual functions in isolation
  - Mock external dependencies
  - Test edge cases and error scenarios
  - Location: `tests/unit/`

- [ ] **Create integration tests**
  - Test API client interactions (mocked with nock)
  - Test authentication flow
  - Test error handling and retries
  - Location: `tests/integration/`

- [ ] **Create E2E tests**
  - Test complete MCP tool workflows
  - Test input validation
  - Test output formatting
  - Location: `tests/e2e/`

- [ ] **Create test fixtures**
  - Add sample API response data
  - Location: `tests/fixtures/`

- [ ] **Create mocks if needed**
  - Mock API clients, tokens, etc.
  - Location: `tests/mocks/`

#### Test Coverage Requirements:

```markdown
- [ ] Unit tests cover all new functions
- [ ] Integration tests cover all API calls
- [ ] E2E tests cover the complete user flow
- [ ] Error scenarios are tested
- [ ] Edge cases are tested (empty data, null values, etc.)
- [ ] Rate limiting is tested
- [ ] Authentication errors are tested
```

#### Example Test Structure:

**Unit Test** (`tests/unit/utils/sp-api-client.test.ts`):
```typescript
describe('SPAPIClient', () => {
  describe('getOrders', () => {
    it('should fetch orders successfully', async () => {
      // Test implementation
    });

    it('should handle rate limiting errors', async () => {
      // Test implementation
    });

    it('should throw on invalid date range', async () => {
      // Test implementation
    });
  });
});
```

**Integration Test** (`tests/integration/orders-api.test.ts`):
```typescript
describe('Orders API Integration', () => {
  it('should call correct endpoint with proper auth', async () => {
    nock('https://sellingpartnerapi-na.amazon.com')
      .get('/orders/v0/orders')
      .reply(200, ordersFixture);

    // Test implementation
  });
});
```

---

### Step 4: Run Tests & Verify

**Objective**: Ensure all tests pass and meet coverage requirements.

#### Tasks:

- [ ] **Run unit tests**
  ```bash
  npm run test:unit
  ```
  - All tests should pass
  - Review any failures and fix

- [ ] **Run integration tests**
  ```bash
  npm run test:integration
  ```
  - All tests should pass
  - Verify mocks are working correctly

- [ ] **Run E2E tests**
  ```bash
  npm run test:e2e
  ```
  - All tests should pass
  - Verify complete workflows work

- [ ] **Run full test suite**
  ```bash
  npm run test
  ```
  - All tests should pass

- [ ] **Check code coverage**
  ```bash
  npm run test:coverage
  ```
  - Lines: ≥80%
  - Branches: ≥80%
  - Functions: ≥80%
  - Statements: ≥80%

- [ ] **Fix failing tests**
  - Debug and fix any test failures
  - Update tests if requirements changed
  - Don't lower coverage thresholds

- [ ] **Run type check**
  ```bash
  npm run type-check
  ```
  - No TypeScript errors

- [ ] **Run linter**
  ```bash
  npm run lint
  ```
  - No linting errors
  - Fix any warnings

#### Quality Gates:

```markdown
✅ All tests passing
✅ Code coverage ≥80% for all metrics
✅ No TypeScript errors
✅ No linting errors
✅ No console warnings or errors
```

---

### Step 5: Cleanup

**Objective**: Remove unnecessary code, improve readability, and ensure maintainability.

#### Tasks:

- [ ] **Remove dead code**
  - Delete unused functions
  - Remove commented-out code
  - Remove unused imports

- [ ] **Remove debug code**
  - Remove console.log statements
  - Remove debug comments
  - Remove temporary variables

- [ ] **Refactor if needed**
  - Extract repeated code into functions
  - Simplify complex logic
  - Improve naming for clarity

- [ ] **Optimize imports**
  - Remove unused imports
  - Organize imports logically
  - Use consistent import style

- [ ] **Review error messages**
  - Ensure error messages are helpful
  - Don't expose sensitive information
  - Use consistent error format

- [ ] **Check for security issues**
  - No hardcoded credentials
  - No sensitive data in logs
  - Proper input validation

- [ ] **Format code**
  ```bash
  npm run format
  ```
  - Consistent formatting throughout

#### Cleanup Checklist:

```markdown
- [ ] No TODO comments left in code
- [ ] No unused variables or functions
- [ ] No console.log or debug statements
- [ ] All imports are used
- [ ] Code is properly formatted
- [ ] No sensitive data exposed
- [ ] Error messages are user-friendly
```

---

### Step 6: Update Documentation

**Objective**: Keep all documentation current and accurate.

#### Tasks:

- [ ] **Update README.md**
  - Add new tools to "MCP Tools" section
  - Update feature list if applicable
  - Update setup instructions if changed
  - Add usage examples

- [ ] **Update ROADMAP.md**
  - Mark task as completed
  - Update phase progress
  - Add any new tasks discovered

- [ ] **Update TESTING.md** (if applicable)
  - Add testing examples for new features
  - Update test coverage information
  - Document new testing utilities

- [ ] **Update API documentation** (if applicable)
  - Document new functions and types
  - Add JSDoc comments to code
  - Create usage examples

- [ ] **Update GOOGLE_SHEETS_SETUP.md** (if applicable)
  - Add new sheet templates if needed
  - Update usage examples

- [ ] **Create/update inline documentation**
  - Add JSDoc comments to public functions
  - Document complex logic
  - Add type documentation

- [ ] **Update CHANGELOG.md** (create if doesn't exist)
  - Document what changed
  - Note any breaking changes
  - Reference issue/PR numbers

#### Documentation Checklist:

```markdown
- [ ] README.md updated with new features
- [ ] ROADMAP.md task marked complete
- [ ] Code has proper JSDoc comments
- [ ] Usage examples are provided
- [ ] Breaking changes are noted
- [ ] All references are up to date
```

#### Example Documentation Updates:

**README.md - Add new tool**:
```markdown
### Sales Tools

- `get_orders`: Retrieve orders within a date range
- `get_order_details`: Get detailed information for a specific order
- `get_sales_metrics`: Calculate sales metrics (revenue, units sold, etc.) ← NEW
```

**ROADMAP.md - Mark complete**:
```markdown
### Phase 1 (MVP)
- [x] Project setup and architecture
- [x] Testing infrastructure setup
- [x] Authentication and token management ← COMPLETED
- [ ] Basic sales data retrieval
```

**Code - Add JSDoc**:
```typescript
/**
 * Retrieves orders from Amazon SP-API within the specified date range.
 *
 * @param params - Order query parameters
 * @param params.startDate - Start date in ISO 8601 format (e.g., "2024-01-01T00:00:00Z")
 * @param params.endDate - End date in ISO 8601 format
 * @returns Promise resolving to array of Order objects
 * @throws {SPAPIError} When API request fails
 *
 * @example
 * ```typescript
 * const orders = await client.getOrders({
 *   startDate: '2024-01-01T00:00:00Z',
 *   endDate: '2024-01-31T23:59:59Z'
 * });
 * ```
 */
export async function getOrders(params: GetOrdersParams): Promise<Order[]> {
  // Implementation
}
```

---

### Step 7: Code Review & Validation

**Objective**: Final review before considering the task complete.

#### Tasks:

- [ ] **Self-review the code**
  - Read through all changes
  - Check for logic errors
  - Verify it solves the original problem

- [ ] **Test manually** (if applicable)
  - Build the project: `npm run build`
  - Run the MCP server locally
  - Test with Claude Code or Claude Desktop
  - Verify the tool works as expected

- [ ] **Review test results**
  - Check CI/CD pipeline (if set up)
  - Verify all tests pass
  - Review coverage report

- [ ] **Check for breaking changes**
  - Did you change any public APIs?
  - Do existing tools still work?
  - Update version if needed (semantic versioning)

- [ ] **Peer review** (if working in a team)
  - Create a pull request
  - Request review from team members
  - Address feedback

- [ ] **Final checklist**
  - All quality gates passed
  - Documentation is complete
  - Tests are comprehensive
  - No known bugs

#### Final Validation Checklist:

```markdown
✅ Code compiles without errors
✅ All tests pass (unit, integration, E2E)
✅ Code coverage ≥80%
✅ Linter passes
✅ Type checker passes
✅ Documentation is updated
✅ Manual testing completed successfully
✅ ROADMAP.md updated
✅ No breaking changes (or documented if present)
✅ Ready for production
```

---

## Task Completion Template

Use this template when completing a roadmap task:

```markdown
## Task: [Task Name from ROADMAP.md]

### ✅ Step 1: Research & Planning
- [x] Read SP-API documentation for [endpoint]
- [x] Reviewed MCP SDK documentation
- [x] Designed implementation approach
- [x] Updated ROADMAP.md to "in progress"

### ✅ Step 2: Implementation
- [x] Created `src/utils/[module].ts`
- [x] Implemented `[function-name]()`
- [x] Added types to `src/types/sp-api.d.ts`
- [x] Created MCP tool in `src/tools/[tool].ts`

### ✅ Step 3: Write Tests
- [x] Unit tests: `tests/unit/[module].test.ts`
- [x] Integration tests: `tests/integration/[module].test.ts`
- [x] E2E tests: `tests/e2e/[tool].test.ts`
- [x] Test fixtures: `tests/fixtures/[data].json`

### ✅ Step 4: Run Tests & Verify
- [x] Unit tests passing (100%)
- [x] Integration tests passing (100%)
- [x] E2E tests passing (100%)
- [x] Coverage: 87% lines, 85% branches, 90% functions

### ✅ Step 5: Cleanup
- [x] Removed debug code
- [x] Removed unused imports
- [x] Refactored [specific function]
- [x] Code formatted

### ✅ Step 6: Update Documentation
- [x] Updated README.md (added tool to list)
- [x] Updated ROADMAP.md (marked complete)
- [x] Added JSDoc comments
- [x] Created usage examples

### ✅ Step 7: Code Review & Validation
- [x] Self-review completed
- [x] Manual testing successful
- [x] All quality gates passed
- [x] Ready for production

**Result**: Feature is complete and production-ready ✨
```

---

## Common Pitfalls to Avoid

### ❌ CRITICAL: Don't Take Shortcuts on Tests or Linting

**See the "NO SHORTCUTS POLICY" section above. This is the #1 rule.**

Violating this rule is not acceptable:
- ❌ Making tests pass artificially
- ❌ Bypassing linting to avoid fixing code
- ❌ Using `any` or `@ts-ignore` to avoid proper typing
- ❌ Lowering coverage thresholds

**Remember:** A passing CI with fake tests is worse than a failing CI with real tests.

### ❌ Don't Skip Steps
- Every step is important
- Skipping tests leads to bugs
- Skipping documentation leads to confusion

### ❌ Don't Commit Directly to Main
- **Always work in a feature branch** (see "ALWAYS WORK IN FEATURE BRANCHES" section)
- Never commit directly to main branch
- Merge to main only after all quality gates pass
- Keep main branch always deployable

### ❌ Don't Commit Without Testing
- Always run tests before committing
- Always check coverage
- Always lint your code
- Never commit code that fails quality checks
- Run quality gates before pushing to ANY branch

### ❌ Don't Leave TODOs in Code
- Finish what you start
- Create issues for future work
- Don't ship incomplete features

### ❌ Don't Ignore Warnings
- Fix TypeScript warnings
- Fix linter warnings
- Address test warnings
- Warnings today become errors tomorrow

### ❌ Don't Forget Documentation
- Future you will thank present you
- Other developers need context
- Documentation is part of the feature

---

## Quick Reference Commands

### Development
```bash
npm run dev          # Run in development mode
npm run build        # Build for production
npm run type-check   # Check TypeScript types
npm run lint         # Run linter
npm run format       # Format code
```

### Testing
```bash
npm run test                # Run all tests
npm run test:unit          # Run unit tests only
npm run test:integration   # Run integration tests only
npm run test:e2e           # Run E2E tests only
npm run test:watch         # Watch mode
npm run test:coverage      # Generate coverage report
npm run test:ci            # CI mode
```

### Quality Gates
```bash
# Run before committing
npm run build && npm run test:coverage && npm run lint && npm run type-check
```

---

## Version Control Best Practices

### ⚠️ Always Use Feature Branches

**See "ALWAYS WORK IN FEATURE BRANCHES" section above for full workflow.**

**Quick reminder:**
```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Work and commit
git add .
git commit -m "feat: your message"

# 3. Push feature branch (not main!)
git push origin feature/your-feature-name

# 4. Merge to main only after all quality gates pass
```

### Commit Messages
Follow conventional commits format:

```
feat: add get_orders MCP tool
fix: handle rate limiting errors correctly
docs: update README with new tools
test: add integration tests for orders API
refactor: simplify error handling logic
chore: update dependencies
```

### Branch Naming
```
feature/orders-api-integration
fix/rate-limiting-bug
docs/update-readme
test/add-e2e-tests
refactor/simplify-error-handling
```

### Before Pushing (to ANY branch)
```bash
# Ensure everything is clean
npm run build
npm run test:coverage
npm run lint
npm run type-check

# If all pass, commit and push to feature branch
git add .
git commit -m "feat: implement orders API integration"
git push origin feature/your-feature-name  # Push to feature branch, NOT main

# Only merge to main after verification
```

### Merging to Main
```bash
# Only after ALL quality gates pass:
git checkout main
git pull origin main           # Get latest changes
git merge feature/your-branch  # Merge your feature
git push origin main           # Push to main

# Clean up feature branch
git branch -d feature/your-branch
git push origin --delete feature/your-branch
```

---

## Continuous Improvement

This SOP should evolve with the project:

- [ ] Update as new patterns emerge
- [ ] Add lessons learned
- [ ] Refine steps based on experience
- [ ] Get team feedback
- [ ] Keep it practical and useful

**Remember**: Quality is not an accident; it's the result of following a disciplined process.

---

## Questions?

If you're unsure about any step:
1. Check existing implementations in the codebase
2. Review [TESTING.md](TESTING.md) for testing guidance
3. Check [ROADMAP.md](ROADMAP.md) for task dependencies
4. Review Amazon SP-API documentation
5. Ask for clarification before proceeding

**When in doubt, over-communicate and over-document.**
