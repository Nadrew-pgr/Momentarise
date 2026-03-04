import { z } from "zod";
import { itemKindSchema } from "./item";

export const capturePipelineStatusSchema = z.enum([
  "captured",
  "queued",
  "processing",
  "ready",
  "failed",
  "applied",
  "archived",
]);

export const captureTypeSchema = z.enum([
  "text",
  "voice",
  "photo",
  "link",
  "file",
  "share",
  "deeplink",
]);

export const captureStatusSchema = z.enum([
  "draft",
  "captured",
  "queued",
  "processing",
  "ready",
  "failed",
  "applied",
  "archived",
]);

export const captureActionTypeSchema = z.enum([
  "create_event",
  "create_task",
  "create_item",
  "draft_reply",
  "pay_invoice",
  "summarize",
  "review",
]);

export const captureCategorySchema = z.enum([
  "finance",
  "communication",
  "schedule",
  "document",
  "travel",
  "personal",
  "general",
]);

export const captureActorSchema = z.enum(["user", "sync", "system"]);

export const captureBadgeKindSchema = z.enum([
  "type",
  "category",
  "actor",
  "tag",
  "status",
]);

export const captureBadgeSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  kind: captureBadgeKindSchema,
  tone: z.enum(["default", "secondary", "outline"]).default("outline"),
});

const metadataRecordSchema = z.record(z.string(), z.unknown());

export const captureActionSuggestionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: captureActionTypeSchema,
  confidence: z.number().min(0).max(1),
  requires_confirm: z.boolean(),
  preview_payload: metadataRecordSchema.default({}),
  is_primary: z.boolean().default(false),
});

const inboxCaptureOutWireSchema = z.object({
  id: z.string().uuid(),
  item_id: z.string().uuid().nullable().optional(),
  raw_content: z.string(),
  source: z.string().nullable().optional(),
  source_type: z.string().optional(),
  capture_type: captureTypeSchema,
  status: captureStatusSchema,
  pipeline_state: capturePipelineStatusSchema.optional(),
  treated_bucket: z.enum(["untreated", "treated"]).optional(),
  agent_hint: z.string().nullable().optional(),
  coming_soon_capabilities: z.array(z.string()).optional(),
  metadata: metadataRecordSchema.optional(),
  meta: metadataRecordSchema.optional(),
  suggested_actions: z.array(captureActionSuggestionSchema).default([]),
  primary_action: captureActionSuggestionSchema.nullable().optional(),
  requires_review: z.boolean().optional(),
  archived: z.boolean().optional(),
  archived_reason: z.enum(["applied", "deleted", "archived"]).nullable().optional(),
  deleted_at: z.string().datetime().nullable().optional(),
  category: captureCategorySchema.nullable().optional(),
  actor: captureActorSchema.optional(),
  tags: z.array(z.string()).optional(),
  badges: z.array(captureBadgeSchema).optional(),
  created_at: z.string().datetime(),
});

export const inboxCaptureOutSchema = inboxCaptureOutWireSchema.transform(
  ({
    meta,
    metadata,
    requires_review,
    primary_action,
    suggested_actions,
    item_id,
    source_type,
    pipeline_state,
    treated_bucket,
    agent_hint,
    coming_soon_capabilities,
    archived,
    archived_reason,
    deleted_at,
    category,
    actor,
    tags,
    badges,
    ...rest
  }) => ({
    ...rest,
    item_id: item_id ?? null,
    source_type: source_type ?? rest.capture_type,
    pipeline_state: pipeline_state ?? rest.status,
    treated_bucket: treated_bucket ?? (rest.status === "applied" ? "treated" : "untreated"),
    agent_hint: agent_hint ?? null,
    coming_soon_capabilities: coming_soon_capabilities ?? [],
    metadata: metadata ?? meta ?? {},
    suggested_actions,
    primary_action: primary_action ?? null,
    requires_review: requires_review ?? false,
    archived: archived ?? false,
    archived_reason: archived_reason ?? null,
    deleted_at: deleted_at ?? null,
    category: category ?? null,
    actor: actor ?? "user",
    tags: tags ?? [],
    badges: badges ?? [],
  })
);

export const inboxListResponseSchema = z
  .object({
    captures: z.array(inboxCaptureOutSchema).optional(),
    entries: z.array(inboxCaptureOutSchema).optional(),
  })
  .transform(({ captures, entries }) => {
    const resolvedEntries = entries ?? captures ?? [];
    const resolvedCaptures = captures ?? entries ?? [];
    return {
      captures: resolvedCaptures,
      entries: resolvedEntries,
    };
  });

export const createCaptureRequestSchema = z.object({
  raw_content: z.string().default(""),
  source: z.string().nullable().optional().default("manual"),
  capture_type: captureTypeSchema.default("text"),
  status: captureStatusSchema.default("captured"),
  metadata: metadataRecordSchema.default({}),
});

export const captureUploadResponseSchema = z.object({
  id: z.string().uuid(),
  status: captureStatusSchema,
});

const captureAssetWireSchema = z.object({
  id: z.string().uuid(),
  kind: z.string(),
  storage_key: z.string(),
  mime_type: z.string(),
  size_bytes: z.number().int().nonnegative(),
  duration_ms: z.number().int().nullable().optional(),
  checksum: z.string().nullable().optional(),
  metadata: metadataRecordSchema.optional(),
  meta: metadataRecordSchema.optional(),
  created_at: z.string().datetime(),
  preview_kind: z.enum(["audio", "image", "pdf", "text", "binary"]).optional(),
  file_name: z.string().optional(),
  content_path: z.string().optional(),
});

export const captureAssetOutSchema = captureAssetWireSchema.transform(
  ({ meta, metadata, preview_kind, file_name, content_path, ...rest }) => ({
    ...rest,
    metadata: metadata ?? meta ?? {},
    duration_ms: rest.duration_ms ?? null,
    checksum: rest.checksum ?? null,
    preview_kind: preview_kind ?? "binary",
    file_name: file_name ?? "",
    content_path: content_path ?? "",
  })
);

export const captureArtifactOutSchema = z.object({
  id: z.string().uuid(),
  artifact_type: z.string(),
  content_json: metadataRecordSchema,
  provider: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  confidence: z.number().nullable().optional(),
  created_at: z.string().datetime(),
});

export const captureJobOutSchema = z.object({
  id: z.string().uuid(),
  job_type: z.string(),
  status: z.string(),
  attempt_count: z.number().int().nonnegative(),
  last_error: z.string().nullable().optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
  started_at: z.string().datetime().nullable().optional(),
  finished_at: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
});

export const captureDetailResponseSchema = z.object({
  capture: inboxCaptureOutSchema,
  assets: z.array(captureAssetOutSchema),
  artifacts: z.array(captureArtifactOutSchema),
  jobs: z.array(captureJobOutSchema),
  pipeline_trace: z.array(metadataRecordSchema).default([]),
  artifacts_summary: metadataRecordSchema.default({}),
});

export const captureArtifactsResponseSchema = z.object({
  artifacts: z.array(captureArtifactOutSchema),
});

export const reprocessCaptureResponseSchema = z.object({
  capture_id: z.string().uuid(),
  status: z.string(),
});

export const processCaptureRequestSchema = z.object({
  title: z.string().min(1),
});

export const processCaptureResponseSchema = z.object({
  item_id: z.string().uuid(),
});

export const capturePreviewRequestSchema = z.object({
  action_key: z.string().optional(),
});

export const capturePreviewResponseSchema = z.object({
  capture_id: z.string().uuid(),
  action_key: z.string().nullable().optional(),
  action_type: captureActionTypeSchema.nullable().optional(),
  suggested_title: z.string(),
  suggested_kind: itemKindSchema,
  confidence: z.number(),
  reason: z.string(),
  preview_payload: metadataRecordSchema.default({}),
});

export const applyCaptureRequestSchema = z.object({
  title: z.string().optional(),
  kind: itemKindSchema.optional(),
  action_key: z.string().optional(),
  metadata: metadataRecordSchema.default({}),
});

export const applyCaptureResponseSchema = z.object({
  capture_id: z.string().uuid(),
  item_id: z.string().uuid(),
  event_id: z.string().uuid().nullable().optional(),
  applied_action_key: z.string().nullable().optional(),
});

export const captureActionResponseSchema = z.object({
  capture_id: z.string().uuid(),
  status: z.string(),
});

export const externalCaptureRequestSchema = z.object({
  raw_content: z.string().default(""),
  source: z.string().nullable().optional().default("extension"),
  capture_type: captureTypeSchema.default("text"),
  metadata: metadataRecordSchema.default({}),
  idempotency_key: z.string().nullable().optional(),
});

export type CapturePipelineStatus = z.infer<typeof capturePipelineStatusSchema>;
export type CaptureType = z.infer<typeof captureTypeSchema>;
export type CaptureStatus = z.infer<typeof captureStatusSchema>;
export type CaptureActionType = z.infer<typeof captureActionTypeSchema>;
export type CaptureCategory = z.infer<typeof captureCategorySchema>;
export type CaptureActor = z.infer<typeof captureActorSchema>;
export type CaptureBadge = z.infer<typeof captureBadgeSchema>;
export type CaptureActionSuggestion = z.infer<typeof captureActionSuggestionSchema>;
export type InboxCaptureOut = z.infer<typeof inboxCaptureOutSchema>;
export type InboxListResponse = z.infer<typeof inboxListResponseSchema>;
export type CreateCaptureRequest = z.input<typeof createCaptureRequestSchema>;
export type CaptureUploadResponse = z.infer<typeof captureUploadResponseSchema>;
export type CaptureAssetOut = z.infer<typeof captureAssetOutSchema>;
export type CaptureArtifactOut = z.infer<typeof captureArtifactOutSchema>;
export type CaptureJobOut = z.infer<typeof captureJobOutSchema>;
export type CaptureDetailResponse = z.infer<typeof captureDetailResponseSchema>;
export type CaptureArtifactsResponse = z.infer<typeof captureArtifactsResponseSchema>;
export type ReprocessCaptureResponse = z.infer<typeof reprocessCaptureResponseSchema>;
export type ProcessCaptureRequest = z.input<typeof processCaptureRequestSchema>;
export type ProcessCaptureResponse = z.infer<typeof processCaptureResponseSchema>;
export type CapturePreviewRequest = z.input<typeof capturePreviewRequestSchema>;
export type CapturePreviewResponse = z.infer<typeof capturePreviewResponseSchema>;
export type ApplyCaptureRequest = z.input<typeof applyCaptureRequestSchema>;
export type ApplyCaptureResponse = z.infer<typeof applyCaptureResponseSchema>;
export type CaptureActionResponse = z.infer<typeof captureActionResponseSchema>;
export type ExternalCaptureRequest = z.input<typeof externalCaptureRequestSchema>;
