import { z } from "zod";

export const startTrackingResponseSchema = z.object({
  event_id: z.string().uuid(),
  is_tracking: z.literal(true),
  tracking_started_at: z.string().datetime(),
});

export const stopTrackingResponseSchema = z.object({
  event_id: z.string().uuid(),
  is_tracking: z.literal(false),
  actual_time_acc: z.number().int(),
});

export type StartTrackingResponse = z.infer<typeof startTrackingResponseSchema>;
export type StopTrackingResponse = z.infer<typeof stopTrackingResponseSchema>;
