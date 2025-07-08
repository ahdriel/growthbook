# Implementation Plan: Support Updating Experiment-Ref Conditions in updateFeature API

## Problem Statement

The `updateFeature` API currently does not support updating the `condition` property for `experiment-ref` type rules. This is because the condition belongs to the underlying experiment, not the feature itself. However, for consistency and ease of use, we should allow users to update experiment conditions through the feature API when dealing with experiment-ref rules.

## Current State Analysis

### Schema Support
- ✅ The OpenAPI schema (`FeatureExperimentRefRule.yaml`) already includes the `condition` property
- ✅ The validators (`validators/features.ts`) already support `condition: z.string().optional()` for experiment-ref rules
- ❌ The `updateFeature` function ignores condition changes for experiment-ref rules

### User Workflow
Currently, to update an experiment-ref condition, users must:
1. Get the experiment ID from the feature's experiment-ref rule
2. Call `POST /api/v1/experiments/{experimentId}` with updated phases
3. Update the entire phase object including the condition

**Desired workflow:**
1. Call `POST /api/v1/features/{featureId}` with updated condition in the experiment-ref rule
2. The API handles updating the underlying experiment automatically

## Implementation Plan

### Step 1: Add Helper Function for Experiment Condition Updates

Create a helper function that:
- Fetches the experiment by ID
- Validates user permissions for both feature and experiment
- Updates the experiment's current phase condition
- Logs appropriate audit events

```typescript
// Add to packages/back-end/src/api/features/updateFeature.ts

import { 
  getExperimentById, 
  updateExperiment 
} from "back-end/src/models/ExperimentModel";

/**
 * Updates the condition of an experiment-ref rule by updating the underlying experiment's condition
 */
async function updateExperimentConditionForExperimentRef(
  req: any, // Use proper type from createApiRequestHandler
  experimentId: string,
  newCondition: string
): Promise<void> {
  const experiment = await getExperimentById(req.context, experimentId);
  if (!experiment) {
    throw new Error(`Experiment '${experimentId}' not found`);
  }

  // Check if user has permission to update the experiment
  if (!req.context.permissions.canUpdateExperiment(experiment, { condition: newCondition })) {
    throw new Error(`You don't have permission to update experiment '${experimentId}'`);
  }

  // Get the current/last phase (active phase)
  const currentPhaseIndex = experiment.phases.length - 1;
  const currentPhase = experiment.phases[currentPhaseIndex];
  
  if (!currentPhase) {
    throw new Error(`No active phase found for experiment '${experimentId}'`);
  }

  // Only update if the condition has actually changed
  if (currentPhase.condition !== newCondition) {
    const phases = [...experiment.phases];
    phases[currentPhaseIndex] = {
      ...currentPhase,
      condition: newCondition,
    };

    await updateExperiment({
      context: req.context,
      experiment,
      changes: { phases },
    });

    // Log the audit event for the experiment update
    await req.audit({
      event: "experiment.update",
      entity: {
        object: "experiment",
        id: experiment.id,
      },
      details: {
        pre: { condition: currentPhase.condition },
        post: { condition: newCondition },
      },
    });
  }
}
```

### Step 2: Modify updateFeature Function

Add logic to detect and handle experiment-ref condition changes:

```typescript
// Add before processing environment settings in updateFeature function

// Handle experiment-ref condition updates before processing environment settings
if (req.body.environments) {
  for (const [envName, envSettings] of Object.entries(req.body.environments)) {
    if (envSettings.rules) {
      const originalEnvSetting = feature.environmentSettings?.[envName];
      
      for (let i = 0; i < envSettings.rules.length; i++) {
        const newRule = envSettings.rules[i];
        const oldRule = originalEnvSetting?.rules[i];
        
        if (
          newRule.type === "experiment-ref" &&
          oldRule?.type === "experiment-ref" &&
          newRule.experimentId === oldRule.experimentId &&
          newRule.condition !== oldRule.condition &&
          newRule.condition !== undefined
        ) {
          // Update the underlying experiment's condition
          await updateExperimentConditionForExperimentRef(
            req,
            newRule.experimentId,
            newRule.condition
          );
        }
      }
    }
  }
}
```

### Step 3: Handle Type Safety

The main challenge is TypeScript type safety. The `req.body.environments` uses API types while internal functions use interface types. Solutions:

1. **Option A (Recommended)**: Type the function parameters properly by examining the `createApiRequestHandler` return type
2. **Option B**: Use type assertions with proper validation
3. **Option C**: Create type conversion utilities

### Step 4: Add Comprehensive Tests

Create tests for:
- Basic experiment-ref condition update
- Permission validation (user must have access to both feature and experiment)
- Error handling (experiment not found, no active phase, etc.)
- Audit logging verification
- Edge cases (same condition, multiple rules, etc.)

### Step 5: Update Documentation

Update API documentation to clarify:
- The `condition` property in experiment-ref rules updates the underlying experiment
- Required permissions for this operation
- Examples of usage

## Key Considerations

### 1. Permission Model
- User must have `canUpdateFeature` permission for the feature
- User must have `canUpdateExperiment` permission for the underlying experiment
- Both checks are required for security

### 2. Phase Management
- Always update the last/current phase (active phase)
- Validate that the experiment has at least one phase
- Preserve all other phase properties

### 3. Audit Trail
- Log both feature update and experiment update events
- Include before/after condition values
- Maintain clear audit trail for compliance

### 4. Error Handling
- Clear error messages for missing experiments
- Permission errors that specify which resource is restricted
- Validation errors for invalid conditions

### 5. Performance
- Consider the additional database queries needed
- Batch updates when possible
- Avoid unnecessary experiment updates when condition hasn't changed

## Implementation Steps

1. **Research Types**: Investigate the exact TypeScript types needed
2. **Implement Helper**: Create the experiment condition update helper
3. **Add Logic**: Integrate the helper into updateFeature
4. **Test Thoroughly**: Create comprehensive test suite
5. **Document**: Update API documentation and examples

## Testing Strategy

```typescript
// Test cases to implement:

describe('updateFeature experiment-ref condition updates', () => {
  it('should update experiment condition when experiment-ref rule condition changes', async () => {
    // Test basic functionality
  });

  it('should validate user has permission to update both feature and experiment', async () => {
    // Test permission validation
  });

  it('should handle missing experiment gracefully', async () => {
    // Test error handling
  });

  it('should not update experiment when condition is the same', async () => {
    // Test optimization
  });

  it('should log appropriate audit events', async () => {
    // Test audit logging
  });

  it('should handle multiple experiment-ref rules in different environments', async () => {
    // Test complex scenarios
  });
});
```

## Alternative Approaches

### Option 1: Separate API Endpoint
Create a dedicated endpoint for updating experiment-ref conditions:
- `POST /api/v1/features/{featureId}/experiment-refs/{ruleId}/condition`
- Pros: Clear separation of concerns, easier to implement
- Cons: Additional API complexity, breaks user workflow

### Option 2: Sync on Read
Don't update experiment conditions, but sync them when reading features:
- Pros: No complex update logic
- Cons: Eventual consistency issues, confusing user experience

### Option 3: Make it Explicit
Require users to explicitly enable experiment condition updates:
- Add a flag like `updateExperimentCondition: true` to the request
- Pros: Clear user intent, safer
- Cons: More complex API

## Recommendation

Implement **Option 1** from the main plan - modify the existing `updateFeature` function to handle experiment-ref condition updates automatically. This provides the best user experience while maintaining data consistency.

The implementation should be:
1. **Automatic**: No additional flags or parameters needed
2. **Safe**: Comprehensive permission and validation checks
3. **Auditable**: Clear logging of all changes
4. **Performant**: Minimal additional database queries

This approach aligns with the principle of least surprise and provides a seamless user experience while maintaining the integrity of the underlying data model.