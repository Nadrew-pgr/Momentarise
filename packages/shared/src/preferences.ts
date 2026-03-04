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
export const captureResearchPolicySchema = z.enum(["proposal_only", "auto_if_safe"]);

export const captureProviderKindSchema = z.enum(["mistral", "openai", "heuristic"]);

export const captureProviderSettingSchema = z.object({
  provider: captureProviderKindSchema,
  model: z.string().min(1),
  language: z.string().nullable().optional(),
  fallback_enabled: z.boolean().default(true),
});

export const captureProviderPreferencesSchema = z.object({
  transcription: captureProviderSettingSchema.extend({
    language: z.string().default("auto"),
  }),
  ocr: captureProviderSettingSchema,
  vlm: captureProviderSettingSchema,
});

export const aiPreferencesResponseSchema = z.object({
  mode: aiModeSchema,
  auto_apply_threshold: z.number().min(0).max(1),
  max_actions_per_capture: z.number().int().min(1).max(3),
  capture_provider_preferences: captureProviderPreferencesSchema,
  capture_default_agent_id: z.string().uuid().nullable().optional(),
  capture_agent_routing_rules: z.record(z.string(), z.unknown()).default({}),
  capture_research_policy: captureResearchPolicySchema.default("proposal_only"),
  updated_at: z.string().datetime(),
});

export const aiPreferencesUpdateRequestSchema = z.object({
  mode: aiModeSchema,
  auto_apply_threshold: z.number().min(0).max(1),
  max_actions_per_capture: z.number().int().min(1).max(3),
  capture_provider_preferences: captureProviderPreferencesSchema.optional(),
  capture_default_agent_id: z.string().uuid().nullable().optional(),
  capture_agent_routing_rules: z.record(z.string(), z.unknown()).optional(),
  capture_research_policy: captureResearchPolicySchema.optional(),
  last_known_updated_at: z.string().datetime().optional(),
});

export type CalendarPreferencesResponse = z.infer<
  typeof calendarPreferencesResponseSchema
>;
export type CalendarPreferencesUpdateRequest = z.input<
  typeof calendarPreferencesUpdateRequestSchema
>;
export type AiMode = z.infer<typeof aiModeSchema>;
export type CaptureResearchPolicy = z.infer<typeof captureResearchPolicySchema>;
export type CaptureProviderKind = z.infer<typeof captureProviderKindSchema>;
export type CaptureProviderSetting = z.infer<typeof captureProviderSettingSchema>;
export type CaptureProviderPreferences = z.infer<typeof captureProviderPreferencesSchema>;
export type AiPreferencesResponse = z.infer<typeof aiPreferencesResponseSchema>;
export type AiPreferencesUpdateRequest = z.input<
  typeof aiPreferencesUpdateRequestSchema
>;
