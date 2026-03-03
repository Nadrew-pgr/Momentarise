import { z } from "zod";

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

export type EventOut = z.infer<typeof eventOutSchema>;
export type TimelineResponse = z.infer<typeof timelineResponseSchema>;
export type EventCreateRequest = z.input<typeof eventCreateRequestSchema>;
export type EventUpdateRequest = z.input<typeof eventUpdateRequestSchema>;
export type EventsRangeResponse = z.infer<typeof eventsRangeResponseSchema>;
export type EventDeleteResponse = z.infer<typeof eventDeleteResponseSchema>;
export type EventColor = z.infer<typeof eventColorSchema>;
