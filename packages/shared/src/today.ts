import { z } from "zod";

export const priorityItemOutSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  priority_order: z.number().int(),
});

export const eventSummaryOutSchema = z.object({
  id: z.string().uuid(),
  item_id: z.string().uuid(),
  title: z.string(),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
});

export const todayResponseSchema = z.object({
  priorities: z.array(priorityItemOutSchema),
  next_event: eventSummaryOutSchema.nullable(),
  next_action: priorityItemOutSchema.nullable(),
});

export type PriorityItemOut = z.infer<typeof priorityItemOutSchema>;
export type EventSummaryOut = z.infer<typeof eventSummaryOutSchema>;
export type TodayResponse = z.infer<typeof todayResponseSchema>;
