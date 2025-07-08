# Test: Experiment-Ref Condition Update

## Test Case: Update Experiment-Ref Condition via updateFeature API

### Setup
1. Create a test experiment with initial condition
2. Create a test feature with experiment-ref rule pointing to the experiment
3. Update the feature with a new condition for the experiment-ref rule
4. Verify the underlying experiment's condition is updated

### Test Example

#### 1. Create Initial Experiment
```bash
POST /api/v1/experiments
{
  "name": "Test Experiment",
  "trackingKey": "test-experiment-123",
  "phases": [
    {
      "name": "Main",
      "condition": "{\"country\": \"US\"}",
      "dateStarted": "2025-01-01T00:00:00.000Z"
    }
  ],
  "variations": [
    {"id": "control", "key": "control", "name": "Control"},
    {"id": "treatment", "key": "treatment", "name": "Treatment"}
  ]
}
```

#### 2. Create Feature with Experiment-Ref Rule
```bash
POST /api/v1/features
{
  "id": "test-feature-123",
  "valueType": "string",
  "defaultValue": "default",
  "environments": {
    "production": {
      "enabled": true,
      "rules": [
        {
          "type": "experiment-ref",
          "description": "Test experiment reference",
          "experimentId": "exp_123abc",
          "condition": "{\"country\": \"US\"}",
          "variations": [
            {"variationId": "control", "value": "control-value"},
            {"variationId": "treatment", "value": "treatment-value"}
          ]
        }
      ]
    }
  }
}
```

#### 3. Update Feature with New Condition
```bash
POST /api/v1/features/test-feature-123
{
  "environments": {
    "production": {
      "enabled": true,
      "rules": [
        {
          "type": "experiment-ref",
          "description": "Test experiment reference",
          "experimentId": "exp_123abc",
          "condition": "{\"country\": \"CA\", \"age\": {\"$gte\": 18}}",
          "variations": [
            {"variationId": "control", "value": "control-value"},
            {"variationId": "treatment", "value": "treatment-value"}
          ]
        }
      ]
    }
  }
}
```

#### 4. Verify Experiment Updated
```bash
GET /api/v1/experiments/exp_123abc
```

Expected response should show the experiment's current phase condition has been updated to:
```json
{
  "phases": [
    {
      "name": "Main",
      "condition": "{\"country\": \"CA\", \"age\": {\"$gte\": 18}}",
      "dateStarted": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### Test Scenarios

#### ✅ Positive Test Cases
1. **Basic condition update** - Update simple condition string
2. **Complex condition update** - Update with nested JSON conditions
3. **Multiple environments** - Update experiment-ref in multiple environments
4. **Same experiment, different features** - Multiple features referencing same experiment
5. **No change optimization** - Same condition should not trigger update

#### ❌ Negative Test Cases
1. **Experiment not found** - Should return clear error message
2. **No permission on experiment** - Should validate both feature and experiment permissions
3. **No active phase** - Should handle experiments without phases
4. **Invalid condition JSON** - Should validate condition format
5. **Different experiment ID** - Should not update when experiment ID changes

### Expected Behavior

1. **Automatic Update**: When a feature's experiment-ref condition changes, the underlying experiment should be updated automatically
2. **Permission Validation**: User must have both `canUpdateFeature` and `canUpdateExperiment` permissions
3. **Audit Trail**: Both feature and experiment updates should be logged
4. **Performance**: Should avoid unnecessary updates when condition hasn't changed
5. **Error Handling**: Clear error messages for common failure scenarios

### Implementation Verification

The implementation includes:
- ✅ Helper function `updateExperimentConditionForExperimentRef()`
- ✅ Permission validation for both feature and experiment
- ✅ Audit logging for experiment updates
- ✅ Optimization to avoid unnecessary updates
- ✅ Error handling for missing experiments and phases
- ✅ Integration with existing updateFeature workflow

### Success Criteria
- [ ] Experiment condition is updated when feature experiment-ref condition changes
- [ ] No update occurs when condition is the same
- [ ] Proper error handling for invalid scenarios
- [ ] Audit logs show both feature and experiment updates
- [ ] Performance impact is minimal
- [ ] User permissions are properly validated