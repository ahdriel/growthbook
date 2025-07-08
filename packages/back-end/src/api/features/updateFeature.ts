import {
  featureRequiresReview,
  validateFeatureValue,
  validateScheduleRules,
} from "shared/util";
import { isEqual } from "lodash";
import { UpdateFeatureResponse } from "back-end/types/openapi";
import { createApiRequestHandler } from "back-end/src/util/handler";
import { updateFeatureValidator } from "back-end/src/validators/openapi";
import {
  getFeature,
  updateFeature as updateFeatureToDb,
} from "back-end/src/models/FeatureModel";
import { getExperimentMapForFeature } from "back-end/src/models/ExperimentModel";
import {
  addIdsToRules,
  getApiFeatureObj,
  getSavedGroupMap,
  updateInterfaceEnvSettingsFromApiEnvSettings,
} from "back-end/src/services/features";
import { FeatureInterface, FeatureEnvironment } from "back-end/types/feature";
import { getEnabledEnvironments } from "back-end/src/util/features";
import { addTagsDiff } from "back-end/src/models/TagModel";
import { auditDetailsUpdate } from "back-end/src/services/audit";
import {
  createRevision,
  getRevision,
} from "back-end/src/models/FeatureRevisionModel";
import { FeatureRevisionInterface } from "back-end/types/feature-revision";
import { getEnvironmentIdsFromOrg } from "back-end/src/services/organizations";
import { RevisionRules } from "back-end/src/validators/features";
import { 
  getExperimentById, 
  updateExperiment 
} from "back-end/src/models/ExperimentModel";
import { parseJsonSchemaForEnterprise, validateEnvKeys } from "./postFeature";

/**
 * Updates the condition of an experiment-ref rule by updating the underlying experiment's condition
 */
async function updateExperimentConditionForExperimentRef(
  req: any,
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

export const updateFeature = createApiRequestHandler(updateFeatureValidator)(
  async (req): Promise<UpdateFeatureResponse> => {
    const feature = await getFeature(req.context, req.params.id);
    if (!feature) {
      throw new Error(`Feature id '${req.params.id}' not found.`);
    }

    const { owner, archived, description, project, tags } = req.body;

    const effectiveProject =
      typeof project === "undefined" ? feature.project : project;

    const orgEnvs = getEnvironmentIdsFromOrg(req.context.org);

    if (!req.context.permissions.canUpdateFeature(feature, req.body)) {
      req.context.permissions.throwPermissionError();
    }
    if (
      req.context.org.settings?.requireProjectForFeatures &&
      feature.project &&
      (effectiveProject == null || effectiveProject === "")
    ) {
      throw new Error("Must specify a project");
    }

    if (project != null) {
      if (
        !req.context.permissions.canPublishFeature(
          feature,
          Array.from(getEnabledEnvironments(feature, orgEnvs))
        ) ||
        !req.context.permissions.canPublishFeature(
          { project },
          Array.from(getEnabledEnvironments(feature, orgEnvs))
        )
      ) {
        req.context.permissions.throwPermissionError();
      }
    }

    // Validate projects - We can remove this validation when FeatureModel is migrated to BaseModel
    if (project) {
      const projects = await req.context.getProjects();
      if (!projects.some((p) => p.id === req.body.project)) {
        throw new Error(
          `Project id ${req.body.project} is not a valid project.`
        );
      }
    }

    // ensure environment keys are valid
    if (req.body.environments != null) {
      validateEnvKeys(orgEnvs, Object.keys(req.body.environments ?? {}));
    }

    // Validate scheduleRules before processing environment settings
    if (req.body.environments) {
      Object.entries(req.body.environments).forEach(
        ([envName, envSettings]: [string, any]) => {
          if (envSettings.rules) {
            envSettings.rules.forEach((rule: any, ruleIndex: number) => {
              if (rule.scheduleRules) {
                // Validate that the org has access to schedule rules
                if (!req.context.hasPremiumFeature("schedule-feature-flag")) {
                  throw new Error(
                    "This organization does not have access to schedule rules. Upgrade to Pro or Enterprise."
                  );
                }
                try {
                  validateScheduleRules(rule.scheduleRules);
                } catch (error) {
                  throw new Error(
                    `Invalid scheduleRules in environment "${envName}", rule ${
                      ruleIndex + 1
                    }: ${error.message}`
                  );
                }
              }
            });
          }
        }
      );
    }

    // ensure default value matches value type
    let defaultValue;
    if (req.body.defaultValue != null) {
      defaultValue = validateFeatureValue(feature, req.body.defaultValue);
    }

    // Handle experiment-ref condition updates before processing environment settings
    if (req.body.environments) {
      for (const [envName, envSettings] of Object.entries(req.body.environments)) {
        const envSettingsTyped = envSettings as any;
        if (envSettingsTyped.rules) {
          const originalEnvSetting = feature.environmentSettings?.[envName];
          
          for (let i = 0; i < envSettingsTyped.rules.length; i++) {
            const newRule = envSettingsTyped.rules[i];
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

    const environmentSettings =
      req.body.environments != null
        ? updateInterfaceEnvSettingsFromApiEnvSettings(
            feature,
            req.body.environments
          )
        : null;

    const prerequisites =
      req.body.prerequisites != null
        ? req.body.prerequisites?.map((p: string) => ({
            id: p,
            condition: `{"value": true}`,
          }))
        : null;

    const jsonSchema =
      feature.valueType === "json" && req.body.jsonSchema != null
        ? parseJsonSchemaForEnterprise(req.organization, req.body.jsonSchema)
        : null;

    const updates: Partial<FeatureInterface> = {
      ...(owner != null ? { owner } : {}),
      ...(archived != null ? { archived } : {}),
      ...(description != null ? { description } : {}),
      ...(project != null ? { project } : {}),
      ...(tags != null ? { tags } : {}),
      ...(defaultValue != null ? { defaultValue } : {}),
      ...(environmentSettings != null ? { environmentSettings } : {}),
      ...(prerequisites != null ? { prerequisites } : {}),
      ...(jsonSchema != null ? { jsonSchema } : {}),
    };

    if (
      updates.environmentSettings ||
      updates.defaultValue != null ||
      updates.project != null ||
      updates.archived != null
    ) {
      if (
        !req.context.permissions.canPublishFeature(
          { project: effectiveProject },
          Array.from(
            getEnabledEnvironments(
              {
                ...feature,
                ...updates,
              },
              orgEnvs
            )
          )
        )
      ) {
        req.context.permissions.throwPermissionError();
      }
      addIdsToRules(updates.environmentSettings, feature.id);
    }

    // Create a revision for the changes and publish them immediately
    let defaultValueChanged = false;
    const changedEnvironments: string[] = [];
    if ("defaultValue" in updates || "environmentSettings" in updates) {
      const revisionChanges: Partial<FeatureRevisionInterface> = {};
      const revisedRules: RevisionRules = {};

      // Copy over current envSettings to revision as this endpoint support partial updates
      Object.entries(feature.environmentSettings).forEach(([env, settings]: [string, FeatureEnvironment]) => {
        revisedRules[env] = settings.rules;
      });

      let hasChanges = false;
      if (
        "defaultValue" in updates &&
        updates.defaultValue !== feature.defaultValue
      ) {
        revisionChanges.defaultValue = updates.defaultValue;
        hasChanges = true;
        defaultValueChanged = true;
      }
      if (updates.environmentSettings) {
        Object.entries(updates.environmentSettings).forEach(
          ([env, settings]: [string, FeatureEnvironment]) => {
            if (
              !isEqual(
                settings.rules,
                feature.environmentSettings?.[env]?.rules || []
              )
            ) {
              hasChanges = true;
              changedEnvironments.push(env);
              // if the rule is different from the current feature value, update revisionChanges
              revisedRules[env] = settings.rules;
            }
          }
        );
      }

      revisionChanges.rules = revisedRules;

      if (hasChanges) {
        const reviewRequired = featureRequiresReview(
          feature,
          changedEnvironments,
          defaultValueChanged,
          req.organization.settings
        );
        if (reviewRequired) {
          if (!req.context.permissions.canBypassApprovalChecks(feature)) {
            throw new Error(
              "This feature requires a review and the API key being used does not have permission to bypass reviews."
            );
          }
        }

        const revision = await createRevision({
          context: req.context,
          feature,
          user: req.eventAudit,
          baseVersion: feature.version,
          comment: "Created via REST API",
          environments: orgEnvs,
          publish: true,
          changes: revisionChanges,
          org: req.organization,
          canBypassApprovalChecks: true,
        });
        updates.version = revision.version;
      }
    }

    const updatedFeature = await updateFeatureToDb(
      req.context,
      feature,
      updates
    );

    await addTagsDiff(
      req.context.org.id,
      feature.tags || [],
      updates.tags || []
    );

    await req.audit({
      event: "feature.update",
      entity: {
        object: "feature",
        id: feature.id,
      },
      details: auditDetailsUpdate(feature, updatedFeature),
    });

    const groupMap = await getSavedGroupMap(req.organization);

    const experimentMap = await getExperimentMapForFeature(
      req.context,
      feature.id
    );
    const revision = await getRevision({
      context: req.context,
      organization: updatedFeature.organization,
      featureId: updatedFeature.id,
      version: updatedFeature.version,
    });
    const safeRolloutMap = await req.context.models.safeRollout.getAllPayloadSafeRollouts();
    return {
      feature: getApiFeatureObj({
        feature: updatedFeature,
        organization: req.organization,
        groupMap,
        experimentMap,
        revision,
        safeRolloutMap,
      }),
    };
  }
);
