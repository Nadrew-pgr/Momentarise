import { z } from "zod";

export const calendarPreferencesResponseSchema = z.object({
  start_hour: z.number().int().min(0).max(23),
  end_hour: z.number().int().min(1).max(24),
  updated_at: z.string().datetime(),
});

export const calendarPreferencesUpdateRequestSchema = z.object({
  start_hour: z.number().int().min(0).max(23),
  end_hour: z.number().int().min(1).max(24),
  last_known_updated_at: z.string().datetime().optional(),
});

export type CalendarPreferencesResponse = z.infer<
  typeof calendarPreferencesResponseSchema
>;
export type CalendarPreferencesUpdateRequest = z.input<
  typeof calendarPreferencesUpdateRequestSchema
>;
