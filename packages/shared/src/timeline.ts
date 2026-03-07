import { z } from "zod";
import { businessBlocksSchema } from "./business-blocks";

export const eventColorSchema = z.enum([
  "sky",
  "amber",
  "violet",
  "rose",
  "emerald",
  "orange",
]);

export const eventOutSchema = z.object({
  id: z.string().uuid(),
  item_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  all_day: z.boolean(),
  location: z.string().nullable(),
  estimated_time_seconds: z.number().int(),
  actual_time_acc_seconds: z.number().int(),
  is_tracking: z.boolean(),
  color: eventColorSchema,
  tracking_started_at: z.string().datetime().nullable(),
  updated_at: z.string().datetime(),
  rrule: z.string().nullable().optional(),
  parent_event_id: z.string().uuid().nullable().optional(),
  series_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
});

export const timelineResponseSchema = z.object({
  date: z.string(),
  events: z.array(eventOutSchema),
});

export const eventCreateRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  all_day: z.boolean().optional(),
  location: z.string().optional().nullable(),
  estimated_time_seconds: z.number().int().min(0).optional(),
  item_id: z.string().uuid().optional().nullable(),
  color: eventColorSchema.optional(),
  rrule: z.string().nullable().optional(),
  series_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
});

export const eventUpdateRequestSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  start_at: z.string().datetime().optional(),
  end_at: z.string().datetime().optional(),
  all_day: z.boolean().optional(),
  location: z.string().optional().nullable(),
  estimated_time_seconds: z.number().int().min(0).optional(),
  last_known_updated_at: z.string().datetime().optional(),
  color: eventColorSchema.optional(),
  rrule: z.string().nullable().optional(),
  series_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  update_mode: z.enum(["single", "future", "all"]).optional(),
});

export const eventsRangeResponseSchema = z.object({
  events: z.array(eventOutSchema),
});

export const eventDeleteResponseSchema = z.object({
  id: z.string().uuid(),
  deleted: z.boolean(),
});

export const eventContentSchemaVersionSchema = z.literal("business_blocks_v1");

export const eventContentResponseSchema = z.object({
  event_id: z.string().uuid(),
  item_id: z.string().uuid(),
  schema_version: eventContentSchemaVersionSchema,
  blocks: businessBlocksSchema,
});

export const eventContentUpdateRequestSchema = z.object({
  schema_version: eventContentSchemaVersionSchema.default("business_blocks_v1"),
  blocks: businessBlocksSchema,
});

export const eventAnalyticsMetricsSchema = z.object({
  completion_rate: z.number(),
  effort_seconds: z.number().int(),
  training_volume: z.number(),
  energy_score: z.number(),
  inbox_refs_count: z.number().int(),
  block_count: z.number().int(),
});

export const eventAnalyticsPeriodSchema = z.enum(["week", "month"]);
export const eventAnalyticsCompareSchema = z.enum(["previous"]);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const eventAnalyticsResponseSchema = z.object({
  event_id: z.string().uuid(),
  period: eventAnalyticsPeriodSchema,
  compare: eventAnalyticsCompareSchema,
  current: eventAnalyticsMetricsSchema,
  previous: eventAnalyticsMetricsSchema,
  delta: eventAnalyticsMetricsSchema,
  current_start: isoDateSchema,
  current_end: isoDateSchema,
  previous_start: isoDateSchema,
  previous_end: isoDateSchema,
});

export type EventOut = z.infer<typeof eventOutSchema>;
export type TimelineResponse = z.infer<typeof timelineResponseSchema>;
export type EventCreateRequest = z.input<typeof eventCreateRequestSchema>;
export type EventUpdateRequest = z.input<typeof eventUpdateRequestSchema>;
export type EventsRangeResponse = z.infer<typeof eventsRangeResponseSchema>;
export type EventDeleteResponse = z.infer<typeof eventDeleteResponseSchema>;
export type EventColor = z.infer<typeof eventColorSchema>;
export type EventContentResponse = z.infer<typeof eventContentResponseSchema>;
export type EventContentUpdateRequest = z.input<typeof eventContentUpdateRequestSchema>;
export type EventAnalyticsMetrics = z.infer<typeof eventAnalyticsMetricsSchema>;
export type EventAnalyticsResponse = z.infer<typeof eventAnalyticsResponseSchema>;
