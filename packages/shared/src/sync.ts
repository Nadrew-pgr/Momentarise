import { z } from "zod";

const jsonObjectSchema = z.record(z.string(), z.unknown());
const isoDatetimeSchema = z.string().datetime({ offset: true });

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
  supports_json_schema: z.boolean(),
  max_context: z.number().int().positive().nullable(),
  cost_hint: z.string().nullable(),
});

export const syncModelSchema = z.object({
  id: z.string(),
  provider: z.string(),
  label: z.string(),
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
});

export const syncUndoSchema = z.object({
  run_id: z.string().uuid(),
  change_id: z.string().uuid(),
  undone: z.boolean(),
  undone_at: isoDatetimeSchema,
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

export const syncStreamRequestSchema = z.object({
  message: z.string().default(""),
  from_seq: z.number().int().nonnegative().optional(),
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
  z.object({ type: z.literal("applied"), payload: syncApplySchema }),
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

export const syncAgentsResponseSchema = z.object({
  agents: z.array(syncAgentSchema),
});

export const syncAutomationsResponseSchema = z.object({
  automations: z.array(syncAutomationSchema),
});

export type SyncRun = z.infer<typeof syncRunSchema>;
export type SyncRunSummary = z.infer<typeof syncRunSummarySchema>;
export type SyncMessage = z.infer<typeof syncMessageSchema>;
export type SyncQuestion = z.infer<typeof syncQuestionSchema>;
export type SyncDraft = z.infer<typeof syncDraftSchema>;
export type SyncPreview = z.infer<typeof syncPreviewSchema>;
export type SyncApply = z.infer<typeof syncApplySchema>;
export type SyncUndo = z.infer<typeof syncUndoSchema>;
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
