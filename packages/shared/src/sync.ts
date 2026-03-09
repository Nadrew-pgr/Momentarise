import { z } from "zod";

const jsonObjectSchema = z.record(z.string(), z.unknown());
const isoDatetimeSchema = z.string().datetime({ offset: true });
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const syncRunModeSchema = z.enum(["free", "guided"]);
export const syncPromptModeSchema = z.enum(["full", "minimal", "none"]);
export const syncRunStatusSchema = z.enum([
  "pending",
  "streaming",
  "waiting_answer",
  "ready_to_apply",
  "applied",
  "done",
  "failed",
  "cancelled",
]);

export const syncModelCapabilitiesSchema = z.object({
  supports_tools: z.boolean(),
  supports_vision: z.boolean(),
  supports_reasoning: z.boolean().default(false),
  supports_json_schema: z.boolean().default(true),
  context_window: z.number().int().positive().nullable().optional(),
  max_context: z.number().int().positive().nullable().optional(),
  cost_hint: z.string().nullable(),
});

export const syncModelSchema = z.object({
  id: z.string(),
  provider: z.string(),
  label: z.string(),
  tier: z.string().default("free"),
  features: z.array(z.string()).default([]),
  reasoning_levels: z.array(z.string()).nullable().default(null),
  is_default: z.boolean().default(false),
  capabilities: syncModelCapabilitiesSchema,
});

export const syncRunSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  created_by_user_id: z.string().uuid(),
  agent_id: z.string().uuid().nullable(),
  mode: syncRunModeSchema,
  status: syncRunStatusSchema,
  selected_model: z.string().nullable(),
  title: z.string().nullable(),
  context_json: jsonObjectSchema,
  prompt_version: z.string().nullable(),
  prompt_mode: syncPromptModeSchema,
  system_prompt_snapshot: z.string().nullable(),
  toolset_snapshot: z.array(z.string()),
  retrieval_snapshot: z.array(jsonObjectSchema),
  created_at: isoDatetimeSchema,
  updated_at: isoDatetimeSchema,
});

export const syncRunSummarySchema = z.object({
  id: z.string().uuid(),
  status: syncRunStatusSchema,
  title: z.string().nullable(),
  selected_model: z.string().nullable(),
  updated_at: isoDatetimeSchema,
  last_message_preview: z.string().nullable(),
  last_message_at: isoDatetimeSchema.nullable(),
});

export const syncUsageSchema = z.object({
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
  cost_usd: z.number().nonnegative().nullable().optional(),
});

export const syncMessageRoleSchema = z.enum(["system", "user", "assistant", "tool"]);

export const syncMessageSchema = z.object({
  id: z.string().uuid(),
  run_id: z.string().uuid(),
  seq: z.number().int().nonnegative(),
  role: syncMessageRoleSchema,
  content_json: jsonObjectSchema,
  provider: z.string().nullable(),
  model: z.string().nullable(),
  usage_json: syncUsageSchema.nullable().optional(),
  error_code: z.string().nullable(),
  created_at: isoDatetimeSchema,
});

export const syncQuestionSchema = z.object({
  id: z.string().uuid(),
  run_id: z.string().uuid(),
  seq: z.number().int().nonnegative(),
  key: z.string(),
  prompt: z.string(),
  help_text: z.string().nullable().optional(),
  options: z.array(z.string()).default([]),
  created_at: isoDatetimeSchema,
});

export const syncDraftSchema = z.object({
  id: z.string().uuid(),
  run_id: z.string().uuid(),
  seq: z.number().int().nonnegative(),
  title: z.string().nullable(),
  body_json: jsonObjectSchema,
  summary: z.string().nullable(),
  created_at: isoDatetimeSchema,
});

export const syncPreviewSchema = z.object({
  id: z.string().uuid(),
  run_id: z.string().uuid(),
  seq: z.number().int().nonnegative(),
  entity_type: z.string(),
  entity_id: z.string().uuid().nullable(),
  action: z.string(),
  diff_json: z
    .object({
      summary: z.string().optional(),
      notes: z.array(z.string()).optional(),
      mutation: z
        .object({
          kind: z.string(),
          args: jsonObjectSchema,
          display_summary: z.string().optional(),
        })
        .optional(),
      mutations: z
        .array(
          z.object({
            kind: z.string(),
            args: jsonObjectSchema,
            display_summary: z.string().optional(),
          })
        )
        .optional(),
    })
    .passthrough(),
  expires_at: isoDatetimeSchema.nullable(),
  undoable: z.boolean(),
  created_at: isoDatetimeSchema,
});

export const syncApplySchema = z.object({
  run_id: z.string().uuid(),
  preview_id: z.string().uuid(),
  change_id: z.string().uuid(),
  applied_at: isoDatetimeSchema,
  undoable: z.boolean(),
  entity_type: z.string(),
  entity_id: z.string().uuid(),
  open_target_kind: z.enum(["item", "event", "timeline"]),
  open_target_id: z.string().uuid().nullable(),
  open_target_date: isoDateSchema.nullable(),
});

export const syncAppliedEventPayloadSchema = z
  .object({
    run_id: z.string().uuid(),
    preview_id: z.string().uuid(),
    change_id: z.string().uuid(),
    applied_at: isoDatetimeSchema,
    undoable: z.boolean(),
    entity_type: z.string().optional(),
    entity_id: z.string().uuid().nullable().optional(),
    open_target_kind: z.enum(["item", "event", "timeline"]).optional(),
    open_target_id: z.string().uuid().nullable().optional(),
    open_target_date: isoDateSchema.nullable().optional(),
  })
  .transform((payload) => ({
    run_id: payload.run_id,
    preview_id: payload.preview_id,
    change_id: payload.change_id,
    applied_at: payload.applied_at,
    undoable: payload.undoable,
    entity_type: payload.entity_type ?? "unknown",
    entity_id: payload.entity_id ?? null,
    open_target_kind: payload.open_target_kind ?? "timeline",
    open_target_id: payload.open_target_id ?? null,
    open_target_date: payload.open_target_date ?? null,
  }));

export const syncUndoSchema = z.object({
  run_id: z.string().uuid(),
  change_id: z.string().uuid(),
  undone: z.boolean(),
  undone_at: isoDatetimeSchema,
});

export const syncUndoneSchema = z.object({
  run_id: z.string().uuid(),
  source_change_id: z.string().uuid(),
  undo_change_id: z.string().uuid().nullable(),
  undone_at: isoDatetimeSchema,
  open_target_kind: z.enum(["item", "event", "timeline"]),
  open_target_id: z.string().uuid().nullable(),
  open_target_date: isoDateSchema.nullable(),
});

export const syncUndoneEventPayloadSchema = z
  .union([
    syncUndoneSchema,
    z.object({
      run_id: z.string().uuid(),
      change_id: z.string().uuid(),
      undone: z.boolean(),
      undone_at: isoDatetimeSchema,
    }),
  ])
  .transform((payload) => {
    if ("source_change_id" in payload) {
      return payload;
    }
    return {
      run_id: payload.run_id,
      source_change_id: payload.change_id,
      undo_change_id: null,
      undone_at: payload.undone_at,
      open_target_kind: "timeline" as const,
      open_target_id: null,
      open_target_date: null,
    };
  });

export const syncChangeSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  run_id: z.string().uuid().nullable(),
  actor_user_id: z.string().uuid().nullable(),
  entity_type: z.string(),
  entity_id: z.string().uuid(),
  action: z.string(),
  reason: z.string().nullable(),
  before_payload: z.unknown().nullable(),
  after_payload: z.unknown().nullable(),
  undoable: z.boolean(),
  created_at: isoDatetimeSchema,
});

export const syncCreateRunRequestSchema = z.object({
  mode: syncRunModeSchema.default("guided"),
  message: z.string().default(""),
  model: z.string().optional(),
  agent_id: z.string().uuid().nullable().optional(),
  title: z.string().nullable().optional(),
  context_json: jsonObjectSchema.default({}),
});

export const syncPatchRunRequestSchema = z.object({
  title: z.string().trim().min(1).max(180).nullable().optional(),
});

export const syncAnswerRequestSchema = z.object({
  answer: z.string().min(1),
  question_id: z.string().uuid().optional(),
});

export const syncApplyRequestSchema = z.object({
  preview_id: z.string().uuid(),
  idempotency_key: z.string().min(1).max(128),
});

export const syncUndoRequestSchema = z.object({
  change_id: z.string().uuid(),
  idempotency_key: z.string().min(1).max(128).optional(),
});

export const syncAttachmentSourceSchema = z.enum(["upload", "inbox"]);

export const syncAttachmentSchema = z.object({
  capture_id: z.string().uuid(),
  source: syncAttachmentSourceSchema,
});

export const syncReferenceKindSchema = z.enum(["capture", "item"]);

export const syncReferenceSchema = z.object({
  kind: syncReferenceKindSchema,
  id: z.string().uuid(),
  label: z.string().trim().min(1).max(180).optional(),
});

export const syncStreamRequestSchema = z.object({
  message: z.string().default(""),
  from_seq: z.number().int().nonnegative().optional(),
  attachments: z.array(syncAttachmentSchema).max(5).optional().default([]),
  references: z.array(syncReferenceSchema).max(5).optional().default([]),
}).superRefine((value, ctx) => {
  const total = value.attachments.length + value.references.length;
  if (total > 5) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A maximum of 5 attachments/references is allowed",
      path: ["attachments"],
    });
  }
});

export const syncUsageEventPayloadSchema = z.object({
  provider: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  usage: syncUsageSchema,
});

export const syncWarningEventPayloadSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const syncErrorEventPayloadSchema = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean().default(false),
});

export const syncDoneEventPayloadSchema = z.object({
  status: syncRunStatusSchema,
});

export const syncToolCallPayloadSchema = z.object({
  tool_call_id: z.string().uuid(),
  tool_name: z.string(),
  args_json: jsonObjectSchema,
  requires_confirm: z.boolean(),
  status: z.enum(["started", "completed", "failed"]),
});

export const syncToolResultPayloadSchema = z.object({
  tool_call_id: z.string().uuid(),
  status: z.enum(["completed", "failed"]),
  summary: z.string().nullable(),
  result_json: z.unknown().nullable(),
});

export const syncReasoningPayloadSchema = z.object({
  summary: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  duration_ms: z.number().int().nonnegative().nullable().optional(),
});

export const syncSourceItemSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  url: z.string().url(),
  snippet: z.string().nullable().optional(),
});

export const syncSourcesPayloadSchema = z.object({
  items: z.array(syncSourceItemSchema),
});

export const syncTaskPayloadSchema = z.object({
  task_id: z.string(),
  title: z.string(),
  status: z.enum(["started", "completed", "failed"]),
  detail: z.string().nullable().optional(),
  tool_name: z.string().nullable().optional(),
});

export const syncQueuePayloadSchema = z.object({
  queue_id: z.string(),
  label: z.string(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  detail: z.string().nullable().optional(),
});

export const syncEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("token"), payload: z.object({ delta: z.string() }) }),
  z.object({ type: z.literal("message"), payload: syncMessageSchema }),
  z.object({ type: z.literal("question"), payload: syncQuestionSchema }),
  z.object({ type: z.literal("draft"), payload: syncDraftSchema }),
  z.object({ type: z.literal("preview"), payload: syncPreviewSchema }),
  z.object({ type: z.literal("applied"), payload: syncAppliedEventPayloadSchema }),
  z.object({ type: z.literal("undone"), payload: syncUndoneEventPayloadSchema }),
  z.object({ type: z.literal("usage"), payload: syncUsageEventPayloadSchema }),
  z.object({ type: z.literal("warning"), payload: syncWarningEventPayloadSchema }),
  z.object({ type: z.literal("error"), payload: syncErrorEventPayloadSchema }),
  z.object({ type: z.literal("done"), payload: syncDoneEventPayloadSchema }),
  z.object({ type: z.literal("tool_call"), payload: syncToolCallPayloadSchema }),
  z.object({ type: z.literal("tool_result"), payload: syncToolResultPayloadSchema }),
  z.object({ type: z.literal("reasoning"), payload: syncReasoningPayloadSchema }),
  z.object({ type: z.literal("sources"), payload: syncSourcesPayloadSchema }),
  z.object({ type: z.literal("task"), payload: syncTaskPayloadSchema }),
  z.object({ type: z.literal("queue"), payload: syncQueuePayloadSchema }),
]);

export const syncEventEnvelopeSchema = z
  .object({
    seq: z.number().int().nonnegative(),
    run_id: z.string().uuid(),
    ts: isoDatetimeSchema,
    trace_id: z.string().uuid().nullable(),
  })
  .and(syncEventSchema);

export const syncResumeMessageSchema = z.object({
  type: z.literal("resume"),
  from_seq: z.number().int().nonnegative(),
});

export const syncWsTokenResponseSchema = z.object({
  ws_url: z.string().url(),
  token: z.string(),
  expires_at: isoDatetimeSchema,
});

export const syncAgentOriginSchema = z.enum(["system", "user", "template"]);

export const syncAgentSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  origin: syncAgentOriginSchema,
  name: z.string(),
  description: z.string().nullable(),
  prompt_mode: syncPromptModeSchema,
  prompt_instructions: z.string().nullable(),
  tool_policy_json: jsonObjectSchema,
  memory_scope_json: jsonObjectSchema,
  is_default: z.boolean(),
  is_active: z.boolean(),
  published_version: z.number().int().nullable(),
  created_at: isoDatetimeSchema,
  updated_at: isoDatetimeSchema,
});

export const syncCreateAgentRequestSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().nullable().optional(),
  prompt_mode: syncPromptModeSchema.default("full"),
  prompt_instructions: z.string().nullable().optional(),
  tool_policy_json: jsonObjectSchema.default({}),
  memory_scope_json: jsonObjectSchema.default({}),
  is_default: z.boolean().default(false),
});

export const syncPatchAgentRequestSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().nullable().optional(),
  prompt_mode: syncPromptModeSchema.optional(),
  prompt_instructions: z.string().nullable().optional(),
  tool_policy_json: jsonObjectSchema.optional(),
  memory_scope_json: jsonObjectSchema.optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export const syncPublishAgentVersionResponseSchema = z.object({
  agent_id: z.string().uuid(),
  version: z.number().int().positive(),
  published_at: isoDatetimeSchema,
});

export const syncAutomationStatusSchema = z.enum(["draft", "active", "paused"]);

export const syncAutomationSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  created_by_user_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  spec_json: jsonObjectSchema,
  status: syncAutomationStatusSchema,
  requires_confirm: z.boolean(),
  last_validated_at: isoDatetimeSchema.nullable(),
  created_at: isoDatetimeSchema,
  updated_at: isoDatetimeSchema,
});

export const syncCreateAutomationRequestSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().nullable().optional(),
  spec_json: jsonObjectSchema.default({}),
  requires_confirm: z.boolean().default(true),
});

export const syncPatchAutomationRequestSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().nullable().optional(),
  spec_json: jsonObjectSchema.optional(),
  requires_confirm: z.boolean().optional(),
});

export const syncValidateAutomationResponseSchema = z.object({
  automation_id: z.string().uuid(),
  ok: z.boolean(),
  errors: z.array(z.string()),
});

export const syncModelsResponseSchema = z.object({
  models: z.array(syncModelSchema),
});

export const syncRunsResponseSchema = z.object({
  run: syncRunSchema,
});

export const syncRunListResponseSchema = z.object({
  runs: z.array(syncRunSummarySchema),
  next_cursor: z.string().nullable().optional(),
});

export const syncMessagesResponseSchema = z.object({
  messages: z.array(syncMessageSchema),
});

export const syncEventsResponseSchema = z.object({
  run_id: z.string().uuid(),
  from_seq: z.number().int().nonnegative(),
  last_seq: z.number().int().nonnegative(),
  events: z.array(syncEventEnvelopeSchema),
});

export const syncChangesResponseSchema = z.object({
  changes: z.array(syncChangeSchema),
});

export const syncContextSearchResultSchema = z.object({
  kind: syncReferenceKindSchema,
  id: z.string().uuid(),
  label: z.string(),
  subtitle: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  capture_type: z.string().nullable().optional(),
  updated_at: isoDatetimeSchema,
});

export const syncContextSearchResponseSchema = z.object({
  results: z.array(syncContextSearchResultSchema),
});

export const syncAgentsResponseSchema = z.object({
  agents: z.array(syncAgentSchema),
});

export const syncAutomationsResponseSchema = z.object({
  automations: z.array(syncAutomationSchema),
});

export type SyncRunMode = z.infer<typeof syncRunModeSchema>;
export type SyncRun = z.infer<typeof syncRunSchema>;
export type SyncRunSummary = z.infer<typeof syncRunSummarySchema>;
export type SyncMessage = z.infer<typeof syncMessageSchema>;
export type SyncAttachmentSource = z.infer<typeof syncAttachmentSourceSchema>;
export type SyncAttachment = z.infer<typeof syncAttachmentSchema>;
export type SyncReferenceKind = z.infer<typeof syncReferenceKindSchema>;
export type SyncReference = z.infer<typeof syncReferenceSchema>;
export type SyncQuestion = z.infer<typeof syncQuestionSchema>;
export type SyncDraft = z.infer<typeof syncDraftSchema>;
export type SyncPreview = z.infer<typeof syncPreviewSchema>;
export type SyncApply = z.infer<typeof syncApplySchema>;
export type SyncAppliedEventPayload = z.infer<typeof syncAppliedEventPayloadSchema>;
export type SyncUndo = z.infer<typeof syncUndoSchema>;
export type SyncUndone = z.infer<typeof syncUndoneSchema>;
export type SyncUndoneEventPayload = z.infer<typeof syncUndoneEventPayloadSchema>;
export type SyncChange = z.infer<typeof syncChangeSchema>;
export type SyncModel = z.infer<typeof syncModelSchema>;
export type SyncModelCapabilities = z.infer<typeof syncModelCapabilitiesSchema>;
export type SyncEvent = z.infer<typeof syncEventSchema>;
export type SyncEventEnvelope = z.infer<typeof syncEventEnvelopeSchema>;
export type SyncReasoningEventPayload = z.infer<typeof syncReasoningPayloadSchema>;
export type SyncSourcesEventPayload = z.infer<typeof syncSourcesPayloadSchema>;
export type SyncTaskEventPayload = z.infer<typeof syncTaskPayloadSchema>;
export type SyncQueueEventPayload = z.infer<typeof syncQueuePayloadSchema>;
export type SyncResumeMessage = z.infer<typeof syncResumeMessageSchema>;
export type SyncWsTokenResponse = z.infer<typeof syncWsTokenResponseSchema>;
export type SyncCreateRunRequest = z.input<typeof syncCreateRunRequestSchema>;
export type SyncPatchRunRequest = z.input<typeof syncPatchRunRequestSchema>;
export type SyncAnswerRequest = z.input<typeof syncAnswerRequestSchema>;
export type SyncApplyRequest = z.input<typeof syncApplyRequestSchema>;
export type SyncUndoRequest = z.input<typeof syncUndoRequestSchema>;
export type SyncStreamRequest = z.input<typeof syncStreamRequestSchema>;
export type SyncAgent = z.infer<typeof syncAgentSchema>;
export type SyncCreateAgentRequest = z.input<typeof syncCreateAgentRequestSchema>;
export type SyncPatchAgentRequest = z.input<typeof syncPatchAgentRequestSchema>;
export type SyncAutomation = z.infer<typeof syncAutomationSchema>;
export type SyncCreateAutomationRequest = z.input<typeof syncCreateAutomationRequestSchema>;
export type SyncPatchAutomationRequest = z.input<typeof syncPatchAutomationRequestSchema>;
export type SyncRunListResponse = z.infer<typeof syncRunListResponseSchema>;
export type SyncEventsResponse = z.infer<typeof syncEventsResponseSchema>;
export type SyncContextSearchResult = z.infer<typeof syncContextSearchResultSchema>;
export type SyncContextSearchResponse = z.infer<typeof syncContextSearchResponseSchema>;
