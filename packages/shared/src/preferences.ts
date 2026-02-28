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

export const aiModeSchema = z.enum(["proposal_only", "auto_apply"]);

export const aiPreferencesResponseSchema = z.object({
  mode: aiModeSchema,
  auto_apply_threshold: z.number().min(0).max(1),
  max_actions_per_capture: z.number().int().min(1).max(3),
  updated_at: z.string().datetime(),
});

export const aiPreferencesUpdateRequestSchema = z.object({
  mode: aiModeSchema,
  auto_apply_threshold: z.number().min(0).max(1),
  max_actions_per_capture: z.number().int().min(1).max(3),
  last_known_updated_at: z.string().datetime().optional(),
});

export type CalendarPreferencesResponse = z.infer<
  typeof calendarPreferencesResponseSchema
>;
export type CalendarPreferencesUpdateRequest = z.input<
  typeof calendarPreferencesUpdateRequestSchema
>;
export type AiMode = z.infer<typeof aiModeSchema>;
export type AiPreferencesResponse = z.infer<typeof aiPreferencesResponseSchema>;
export type AiPreferencesUpdateRequest = z.input<
  typeof aiPreferencesUpdateRequestSchema
>;
