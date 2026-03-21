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
export const syncChannelSchema = z.enum([
  "in_app",
  "push",
  "email",
  "web",
  "mobile",
  "whatsapp",
  "telegram",
  "instagram_business",
  "mobile_share_extension",
  "browser_extension",
]);
export const syncOutputTypeSchema = z.enum(["sync_response", "alert", "digest", "reminder"]);

export const syncChannelByOutputTypeSchema = z.object({
  sync_response: syncChannelSchema,
  alert: syncChannelSchema,
  digest: syncChannelSchema,
  reminder: syncChannelSchema,
});

export const syncChannelByOutputTypeUpdateSchema = z.object({
  sync_response: syncChannelSchema.optional(),
  alert: syncChannelSchema.optional(),
  digest: syncChannelSchema.optional(),
  reminder: syncChannelSchema.optional(),
});

export const syncChannelPreferencesSchema = z.object({
  preferred_channel: syncChannelSchema,
  available_channels: z.array(syncChannelSchema).min(1),
  channel_by_output_type: syncChannelByOutputTypeSchema,
  input_channel: syncChannelSchema,
  output_channel: syncChannelSchema,
});

export const syncChannelPreferencesUpdateSchema = z.object({
  preferred_channel: syncChannelSchema.optional(),
  available_channels: z.array(syncChannelSchema).optional(),
  channel_by_output_type: syncChannelByOutputTypeUpdateSchema.optional(),
  input_channel: syncChannelSchema.optional(),
  output_channel: syncChannelSchema.optional(),
});

const DEFAULT_SYNC_CHANNEL_PREFERENCES = {
  preferred_channel: "in_app" as const,
  available_channels: ["in_app", "web", "mobile"] as const,
  channel_by_output_type: {
    sync_response: "in_app" as const,
    alert: "in_app" as const,
    digest: "in_app" as const,
    reminder: "in_app" as const,
  },
  input_channel: "in_app" as const,
  output_channel: "in_app" as const,
};

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
  editor_default_agent_id: z.string().uuid().nullable().optional(),
  editor_agent_routing_rules: z.record(z.string(), z.unknown()).default({}),
  capture_research_policy: captureResearchPolicySchema.default("proposal_only"),
  sync_model: z.string().default("auto"),
  sync_reasoning_level: z.string().nullable().optional(),
  sync_channel_preferences: syncChannelPreferencesSchema.default({
    preferred_channel: DEFAULT_SYNC_CHANNEL_PREFERENCES.preferred_channel,
    available_channels: [...DEFAULT_SYNC_CHANNEL_PREFERENCES.available_channels],
    channel_by_output_type: {
      ...DEFAULT_SYNC_CHANNEL_PREFERENCES.channel_by_output_type,
    },
    input_channel: DEFAULT_SYNC_CHANNEL_PREFERENCES.input_channel,
    output_channel: DEFAULT_SYNC_CHANNEL_PREFERENCES.output_channel,
  }),
  updated_at: z.string().datetime(),
});

export const aiPreferencesUpdateRequestSchema = z.object({
  mode: aiModeSchema,
  auto_apply_threshold: z.number().min(0).max(1),
  max_actions_per_capture: z.number().int().min(1).max(3),
  capture_provider_preferences: captureProviderPreferencesSchema.optional(),
  capture_default_agent_id: z.string().uuid().nullable().optional(),
  capture_agent_routing_rules: z.record(z.string(), z.unknown()).optional(),
  editor_default_agent_id: z.string().uuid().nullable().optional(),
  editor_agent_routing_rules: z.record(z.string(), z.unknown()).optional(),
  capture_research_policy: captureResearchPolicySchema.optional(),
  sync_model: z.string().optional(),
  sync_reasoning_level: z.string().nullable().optional(),
  sync_channel_preferences: syncChannelPreferencesUpdateSchema.optional(),
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
export type SyncChannel = z.infer<typeof syncChannelSchema>;
export type SyncOutputType = z.infer<typeof syncOutputTypeSchema>;
export type SyncChannelByOutputType = z.infer<typeof syncChannelByOutputTypeSchema>;
export type SyncChannelPreferences = z.infer<typeof syncChannelPreferencesSchema>;
export type SyncChannelPreferencesUpdate = z.input<typeof syncChannelPreferencesUpdateSchema>;
export type AiPreferencesResponse = z.infer<typeof aiPreferencesResponseSchema>;
export type AiPreferencesUpdateRequest = z.input<
  typeof aiPreferencesUpdateRequestSchema
>;
