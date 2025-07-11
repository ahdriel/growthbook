# Jest to Vitest Migration Plan for packages/back-end

## Overview
This plan outlines the steps to migrate the back-end tests from Jest to Vitest, removing Jest entirely and using only Vitest for testing.

## Current State Analysis

### Jest Configuration
- **Version**: Jest 27.1.1
- **Transformer**: @swc/jest for TypeScript
- **Test Pattern**: `**/test/**/*.test.(ts|js)`
- **Module Mapping**: Custom axios mapping
- **Test Files**: ~17 test files including large integration tests

### Dependencies to Remove
- `jest: ^27.1.1`
- `@swc/jest: ^0.2.23`
- `@types/jest: ^27.0.1`

### Dependencies to Keep
- `supertest: ^7.0.0` (compatible with Vitest)
- `mongodb-memory-server: ^9.2.0` (compatible with Vitest)
- `fishery: ^2.2.2` (test factories)

## Migration Steps

### Phase 1: Setup Vitest Configuration

#### Step 1.1: Install Vitest Dependencies
```bash
cd packages/back-end
yarn add -D vitest @vitest/coverage-v8
```

#### Step 1.2: Create Vitest Configuration
Create `vitest.config.ts` with configuration optimized for Node.js backend testing:

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'test/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.config.ts'
      ]
    },
    testTimeout: 30000, // Increase timeout for integration tests
    hookTimeout: 30000
  },
  resolve: {
    alias: {
      'back-end': path.resolve(__dirname, '.'),
      'shared': path.resolve(__dirname, '../shared')
    }
  }
})
```

#### Step 1.3: Create Test Setup File
Create `test/setup.ts` for global test configuration:

```typescript
import { vi } from 'vitest'

// Mock external dependencies as needed
vi.mock('axios', () => ({
  default: {
    // Mock axios methods
  }
}))

// Global test setup
beforeAll(() => {
  // Global setup before all tests
})

afterAll(() => {
  // Global cleanup after all tests
})
```

### Phase 2: Update Package Configuration

#### Step 2.1: Update package.json Scripts
```json
{
  "scripts": {
    "test": "vitest run --reporter=verbose",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage"
  }
}
```

#### Step 2.2: Update Dependencies
Remove Jest dependencies and add Vitest:

```json
{
  "devDependencies": {
    "vitest": "^2.1.5",
    "@vitest/coverage-v8": "^2.1.5"
  }
}
```

### Phase 3: Update Test Files

#### Step 3.1: Update Type Imports
Replace Jest types with Vitest types in test files:

```typescript
// Remove: import { describe, it, expect } from '@jest/globals'
// Vitest globals are available automatically with globals: true
```

#### Step 3.2: Update Test Syntax
Most Jest syntax is compatible with Vitest, but check for:

- **Mocking**: Replace `jest.mock()` with `vi.mock()`
- **Spy Functions**: Replace `jest.fn()` with `vi.fn()`
- **Timers**: Replace `jest.useFakeTimers()` with `vi.useFakeTimers()`
- **Environment**: Replace `process.env` mocking with `vi.stubEnv()`

#### Step 3.3: Handle Specific Jest Features
- **__mocks__**: Move to `vi.mock()` calls
- **Manual mocks**: Convert to Vitest factory functions
- **Custom matchers**: Check compatibility or create Vitest versions

### Phase 4: Update TypeScript Configuration

#### Step 4.1: Update tsconfig.json for Tests
Add Vitest types to the test configuration:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "node"]
  }
}
```

#### Step 4.2: Update ESLint Configuration
If using ESLint, update to recognize Vitest globals:

```json
{
  "env": {
    "vitest/globals": true
  }
}
```

### Phase 5: Handle Integration Tests

#### Step 5.1: MongoDB Memory Server
Ensure MongoDB Memory Server works correctly with Vitest:

```typescript
// This should work without changes, but may need setup adjustments
import { MongoMemoryServer } from 'mongodb-memory-server'
```

#### Step 5.2: Database Connection Tests
Update database connection setup in test files to work with Vitest's test lifecycle.

#### Step 5.3: API Testing with Supertest
Supertest should work without changes, but verify request/response handling.

### Phase 6: Update CI/CD Configuration

#### Step 6.1: Update Test Commands
Update any CI/CD scripts to use Vitest instead of Jest:

```bash
# Old: yarn test
# New: vitest run
```

#### Step 6.2: Coverage Reports
Update coverage reporting configuration for Vitest.

### Phase 7: Clean Up

#### Step 7.1: Remove Jest Configuration
- Delete `jest.config.js`
- Remove Jest-related files and directories

#### Step 7.2: Remove Jest Dependencies
```bash
yarn remove jest @swc/jest @types/jest
```

#### Step 7.3: Update Documentation
Update any documentation that references Jest testing.

## Validation Steps

### Step 1: Run All Tests
```bash
cd packages/back-end
yarn test
```

### Step 2: Check Coverage
```bash
yarn test:coverage
```

### Step 3: Run Integration Tests
Ensure all integration tests pass, especially:
- Database connection tests
- API endpoint tests
- External service mocks

### Step 4: Performance Check
Compare test execution time between Jest and Vitest.

## Risk Mitigation

### Backup Strategy
1. Create a backup branch before starting migration
2. Test migration in a separate branch first
3. Keep Jest configuration files until migration is confirmed working

### Rollback Plan
1. Revert package.json changes
2. Restore Jest configuration
3. Reinstall Jest dependencies

### Testing Strategy
1. Run tests after each phase
2. Compare test results between Jest and Vitest
3. Validate all test categories (unit, integration, API)

## Expected Benefits

1. **Faster Test Execution**: Vitest typically runs faster than Jest
2. **Better TypeScript Support**: Native TypeScript support
3. **Modern Features**: ESM support, better watch mode
4. **Consistency**: Align with front-end testing approach
5. **Maintenance**: Remove Jest dependencies and configuration

## Timeline Estimate

- **Phase 1-2**: 2-4 hours (Setup and configuration)
- **Phase 3**: 4-8 hours (Test file updates, depending on Jest-specific features)
- **Phase 4-5**: 2-4 hours (TypeScript and integration tests)
- **Phase 6-7**: 1-2 hours (CI/CD and cleanup)
- **Validation**: 2-4 hours (Testing and verification)

**Total Estimated Time**: 11-22 hours

## Next Steps

1. Review this plan with the team
2. Create backup branch
3. Start with Phase 1 (Vitest setup)
4. Test configuration with a few sample tests
5. Proceed with full migration once configuration is validated