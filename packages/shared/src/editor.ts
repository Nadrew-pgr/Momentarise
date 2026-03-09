import { z } from "zod";

const metadataRecordSchema = z.record(z.string(), z.unknown());

export const editorAssistActionSchema = z.enum([
  "rewrite",
  "shorter",
  "longer",
  "summarize",
  "grammar_fix",
  "translate_fr_en",
]);

export const editorAssistRequestSchema = z.object({
  action: editorAssistActionSchema,
  text: z.string().min(1),
  selection_text: z.string().optional(),
  locale: z.string().default("fr-FR"),
  target_language: z.string().optional(),
  context: metadataRecordSchema.optional(),
});

export const editorAssistResponseSchema = z.object({
  result_text: z.string(),
  agent_id: z.string().uuid().nullable().optional(),
  agent_name: z.string().optional(),
  model: z.string(),
  fallback_used: z.boolean().default(false),
  prompt_snapshot: z.string(),
  toolset_snapshot: z.array(z.string()).default([]),
  retrieval_snapshot: z.array(metadataRecordSchema).default([]),
});

export type EditorAssistAction = z.infer<typeof editorAssistActionSchema>;
export type EditorAssistRequest = z.input<typeof editorAssistRequestSchema>;
export type EditorAssistResponse = z.infer<typeof editorAssistResponseSchema>;
