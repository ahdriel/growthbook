export const entityEvents = {
  attribute: ["create", "update", "delete"],
  experiment: [
    "create",
    "update",
    "start",
    "phase",
    "phase",
    "stop",
    "status",
    "archive",
    "unarchive",
    "delete",
    "results",
    "analysis",
    "screenshot",
    "screenshot",
    "refresh",
    "launchChecklist.updated",
    "phase.delete",
    "screenshot.delete",
    "screenshot.create",
  ],
  project: ["create", "update", "delete"],
  environment: ["create", "update", "delete"],
  feature: [
    "create",
    "publish",
    "revert",
    "update",
    "toggle",
    "archive",
    "delete",
  ],
  featureRevisionLog: ["create", "update", "delete"],
  urlRedirect: ["create", "update", "delete"],
  metric: ["autocreate", "create", "update", "delete", "analysis"],
  metricAnalysis: ["create", "update", "delete"],
  metricGroup: ["create", "delete", "update"],
  populationData: ["create", "delete", "update"],
  datasource: ["create", "update", "delete", "import"],
  comment: ["create", "update", "delete"],
  "sdk-connection": ["create", "update", "delete"],
  user: ["create", "update", "delete", "invite"],
  organization: ["create", "update", "delete", "disable", "enable"],
  savedGroup: ["created", "deleted", "updated"],
  segment: ["create", "delete", "update"],
  archetype: ["created", "deleted", "updated"],
  team: ["create", "delete", "update"],
  vercelNativeIntegration: ["create", "update", "delete"],
  factTable: ["autocreate"],
  customField: ["create", "update", "delete"],
  experimentTemplate: ["create", "update", "delete"],
  safeRollout: ["create", "update", "delete"],
  decisionCriteria: ["create", "update", "delete"],
  execReport: ["create", "update", "delete"],
  savedQuery: ["create", "update", "delete"],
} as const;

export type EntityEvents = typeof entityEvents;
export const EntityType = Object.keys(entityEvents) as [keyof EntityEvents];
export type EntityType = typeof EntityType[number];

export type EventTypes<K> = K extends EntityType
  ? `${K}.${EntityEvents[K][number]}`
  : never;

export type EventType = EventTypes<EntityType>;
