import { z } from "zod";

export const eventOutSchema = z.object({
  id: z.string().uuid(),
  item_id: z.string().uuid(),
  title: z.string(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  estimated_time_seconds: z.number().int(),
  actual_time_acc_seconds: z.number().int(),
  is_tracking: z.boolean(),
  tracking_started_at: z.string().datetime().nullable(),
});

export const timelineResponseSchema = z.object({
  date: z.string(),
  events: z.array(eventOutSchema),
});

export type EventOut = z.infer<typeof eventOutSchema>;
export type TimelineResponse = z.infer<typeof timelineResponseSchema>;
