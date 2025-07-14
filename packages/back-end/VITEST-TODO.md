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
- [ ] Migrate test imports from Jest to Vitest
  - [ ] Replace Jest globals (describe, it, expect, etc.)
  - [ ] Update mock syntax
  - [ ] Handle Jest-specific features
- [ ] Test files to migrate:
  - [ ] `/test/stats.test.ts` (simple, good starting point)
  - [ ] `/test/enterprise.test.ts` (simple)
  - [ ] `/test/billing.test.ts` (complex mocking)
  - [ ] `/test/features.test.ts` (large file, 44KB)
  - [ ] `/test/license.test.ts` (large file, 50KB)
  - [ ] `/test/migrations.test.ts` (large file, 48KB)
  - [ ] `/test/mixpanel.test.ts`
  - [ ] `/test/permissions.test.ts` (very large file, 175KB)
  - [ ] `/test/prerequisites.test.ts`
  - [ ] `/test/sqlintegration.test.ts`
  - [ ] API tests directory: `/test/api/`
    - [ ] `api.setup.ts`
    - [ ] `attributes.test.ts`
    - [ ] `environments.test.ts`
    - [ ] `features.test.ts`
    - [ ] `projects.test.ts`
    - [ ] `sdk-connections-validations.test.ts`
    - [ ] `sdk-connections.test.ts`
    - [ ] `snapshots.test.ts`
  - [ ] Services tests directory: `/test/services/`
    - [ ] `datasource.test.ts`
    - [ ] `experimentNotifications.test.ts`
    - [ ] `experiments.test.ts`
  - [ ] Models tests directory: `/test/models/`
    - [ ] `BaseModel.test.ts`
    - [ ] `EventWebhookModel.test.ts`
    - [ ] `VisualChangesetModel.test.ts`
    - [ ] `dataSourceModel.test.ts`
  - [ ] Other test directories and files

### Phase 3: Mocking Updates 🔄
- [ ] Update Jest mocks to Vitest equivalents
  - [ ] `jest.mock()` → `vi.mock()`
  - [ ] `jest.fn()` → `vi.fn()`
  - [ ] `jest.spyOn()` → `vi.spyOn()`
  - [ ] `jest.requireActual()` → `vi.importActual()`
  - [ ] `jest.MockedFunction` → `MockedFunction` from vitest
- [ ] Handle mock hoisting differences
- [ ] Update module mocking patterns

### Phase 4: Test Utilities and Setup 🔄
- [ ] Update test-helpers.ts if needed
- [ ] Handle test setup files
- [ ] Update factory/fixture files
- [ ] Update test database setup

### Phase 5: Cleanup and Validation 🔄
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

### Benefits After Migration:
- Faster test execution
- Better TypeScript support
- Native ESM support
- Better watch mode
- Consistent with front-end package (already uses Vitest)

## Progress Tracking

- **Phase 1**: ✅ Complete
- **Phase 2**: 🔄 In Progress (0/25+ files migrated)
- **Phase 3**: 🔄 In Progress 
- **Phase 4**: ⏳ Pending
- **Phase 5**: ⏳ Pending

## Next Steps

1. Start with simple test files (stats.test.ts, enterprise.test.ts)
2. Identify common patterns for automated migration
3. Handle complex mocking scenarios
4. Test thoroughly before removing Jest dependencies