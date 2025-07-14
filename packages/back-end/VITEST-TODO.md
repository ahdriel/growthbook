# Jest to Vitest Migration Plan - packages/back-end

## Current State Analysis

### Current Jest Configuration:
- **Jest Version**: 27.1.1
- **Transform**: @swc/jest for TypeScript files
- **Test Pattern**: `**/test/**/*.test.(ts|js)`
- **Module Name Mapping**: axios -> axios/dist/axios.js
- **Test Command**: `jest --forceExit --verbose --detectOpenHandles`

### Current Test Structure:
- **Total Test Files**: ~20+ test files
- **Main Test Categories**:
  - Root level tests: billing, enterprise, features, license, migrations, etc.
  - API tests: `/test/api/` (8 files)
  - Services tests: `/test/services/` (3 files)
  - Models tests: `/test/models/` (4 files)
  - Integration tests: `/test/integrations/`
  - Utility tests: `/test/util/`

### Current Dependencies to Remove:
- `jest` (^27.1.1)
- `@swc/jest` (^0.2.23)
- `@types/jest` (^27.0.1)

## Migration Plan

### Phase 1: Setup and Configuration ✅
- [x] Install Vitest dependencies
- [x] Create vitest.config.ts
- [x] Update package.json scripts
- [x] Update TypeScript configuration

### Phase 2: Test File Migration 🔄
- [x] Migrate test imports from Jest to Vitest
  - [x] Replace Jest globals (describe, it, expect, etc.)
  - [x] Update mock syntax
  - [x] Handle Jest-specific features
- [x] Test files migrated:
  - [x] `/test/stats.test.ts` (simple, good starting point) ✅
  - [x] `/test/enterprise.test.ts` (simple) ✅
  - [x] `/test/mixpanel.test.ts` (simple) ✅
  - [x] `/test/sqlintegration.test.ts` (medium complexity) ✅
  - [x] `/test/api/snapshots.test.ts` (with mocks) ✅
  - [x] `/test/models/EventWebhookModel.test.ts` (with spies) ✅
  - [x] `/test/services/experimentNotifications.test.ts` (with mocks) ✅
  - [ ] `/test/billing.test.ts` (complex mocking)
  - [ ] `/test/features.test.ts` (large file, 44KB)
  - [ ] `/test/license.test.ts` (large file, 50KB)
  - [ ] `/test/migrations.test.ts` (large file, 48KB)
  - [ ] `/test/permissions.test.ts` (very large file, 175KB)
  - [ ] `/test/prerequisites.test.ts`
  - [ ] API tests directory: `/test/api/`
    - [ ] `api.setup.ts`
    - [ ] `attributes.test.ts`
    - [ ] `environments.test.ts`
    - [ ] `features.test.ts`
    - [ ] `projects.test.ts`
    - [ ] `sdk-connections-validations.test.ts`
    - [ ] `sdk-connections.test.ts`
  - [ ] Services tests directory: `/test/services/`
    - [ ] `datasource.test.ts`
    - [ ] `experiments.test.ts`
  - [ ] Models tests directory: `/test/models/`
    - [ ] `BaseModel.test.ts`
    - [ ] `VisualChangesetModel.test.ts`
    - [ ] `dataSourceModel.test.ts`
  - [ ] Other test directories and files

### Phase 3: Mocking Updates ✅
- [x] Update Jest mocks to Vitest equivalents
  - [x] `jest.mock()` → `vi.mock()`
  - [x] `jest.fn()` → `vi.fn()`
  - [x] `jest.spyOn()` → `vi.spyOn()`
  - [x] `jest.requireActual()` → `vi.importActual()`
  - [x] `jest.MockedFunction` → `MockedFunction` from vitest
- [x] Handle mock hoisting differences
- [x] Update module mocking patterns

### Phase 4: Test Utilities and Setup 🔄
- [ ] Update test-helpers.ts if needed
- [ ] Handle test setup files
- [ ] Update factory/fixture files
- [ ] Update test database setup

### Phase 5: Cleanup and Validation ⏳
- [ ] Remove Jest dependencies
- [ ] Remove jest.config.js
- [ ] Update CI/CD configuration
- [ ] Verify all tests pass
- [ ] Performance comparison

## Migration Notes

### Key Differences Jest → Vitest:
1. **Globals**: Vitest can use globals like Jest, but needs configuration
2. **Mocking**: Different API but similar concepts
3. **Module Resolution**: Vitest uses Vite's resolver
4. **TypeScript**: Native TypeScript support
5. **Performance**: Generally faster than Jest
6. **ESM**: Better ESM support

### Potential Issues:
1. **Mock Hoisting**: Vitest handles hoisting differently
2. **Module Mocking**: Some complex mocking patterns may need adjustment
3. **Timers**: `vi.useFakeTimers()` vs `jest.useFakeTimers()`
4. **Snapshot Testing**: Similar but may have subtle differences

### Migration Patterns Established:
1. **Import Pattern**: `import { describe, it, expect, vi } from "vitest";`
2. **Mock Pattern**: `vi.mock()` with `vi.mocked()` for type safety
3. **Spy Pattern**: `vi.spyOn()` with `as any` casting when needed
4. **Async Mocks**: Use `mockResolvedValueOnce` for async functions

### Benefits After Migration:
- Faster test execution
- Better TypeScript support
- Native ESM support
- Better watch mode
- Consistent with front-end package (already uses Vitest)

## Progress Tracking

- **Phase 1**: ✅ Complete
- **Phase 2**: 🔄 In Progress (7/25+ files migrated)
- **Phase 3**: ✅ Complete (patterns established)
- **Phase 4**: ⏳ Pending
- **Phase 5**: ⏳ Pending

## Current Status

### Successfully Migrated Files:
1. `test/stats.test.ts` - Simple test with basic imports
2. `test/enterprise.test.ts` - Simple test with basic imports
3. `test/mixpanel.test.ts` - Simple test with basic imports
4. `test/sqlintegration.test.ts` - Medium complexity test
5. `test/api/snapshots.test.ts` - Complex test with mocks and async functions
6. `test/models/EventWebhookModel.test.ts` - Test with spies and type casting
7. `test/services/experimentNotifications.test.ts` - Test with mocks and type safety

### Migration Patterns Used:
- **Basic imports**: `import { describe, it, expect, vi } from "vitest";`
- **Module mocking**: `vi.mock()` instead of `jest.mock()`
- **Function mocking**: `vi.fn()` instead of `jest.fn()`
- **Spying**: `vi.spyOn()` instead of `jest.spyOn()`
- **Type safety**: `vi.mocked()` for proper TypeScript support
- **Async mocks**: `mockResolvedValueOnce` for async functions
- **Type casting**: `as any` when needed for complex types

### Known Issues:
- Jest cannot run migrated files (expected during transition)
- Need to build dependencies before running tests
- Some complex type casting needed for mocks

## Next Steps

1. Continue migrating remaining test files starting with smaller ones
2. Focus on API tests and services tests next
3. Handle complex mocking scenarios in larger files
4. Test thoroughly before removing Jest dependencies
5. Update CI/CD configuration once migration is complete