import { z } from "zod";
import { itemKindSchema } from "./item";

export const captureTypeSchema = z.enum([
  "text",
  "voice",
  "photo",
  "link",
  "share",
  "deeplink",
]);
export const captureStatusSchema = z.enum([
  "draft",
  "captured",
  "processing",
  "ready",
  "applied",
]);

export const inboxCaptureOutSchema = z.object({
  id: z.string().uuid(),
  raw_content: z.string(),
  source: z.string().nullable().optional(),
  capture_type: captureTypeSchema,
  status: captureStatusSchema,
  metadata: z.record(z.string(), z.unknown()),
  created_at: z.string().datetime(),
});

export const inboxListResponseSchema = z.object({
  captures: z.array(inboxCaptureOutSchema),
});

export const createCaptureRequestSchema = z.object({
  raw_content: z.string().default(""),
  source: z.string().nullable().optional().default("manual"),
  capture_type: captureTypeSchema.default("text"),
  status: captureStatusSchema.default("captured"),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const processCaptureRequestSchema = z.object({
  title: z.string().min(1),
});

export const processCaptureResponseSchema = z.object({
  item_id: z.string().uuid(),
});

export const capturePreviewResponseSchema = z.object({
  capture_id: z.string().uuid(),
  suggested_title: z.string(),
  suggested_kind: itemKindSchema,
  confidence: z.number(),
  reason: z.string(),
});

export const applyCaptureRequestSchema = z.object({
  title: z.string().optional(),
  kind: itemKindSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const applyCaptureResponseSchema = z.object({
  capture_id: z.string().uuid(),
  item_id: z.string().uuid(),
});

export type CaptureType = z.infer<typeof captureTypeSchema>;
export type CaptureStatus = z.infer<typeof captureStatusSchema>;
export type InboxCaptureOut = z.infer<typeof inboxCaptureOutSchema>;
export type InboxListResponse = z.infer<typeof inboxListResponseSchema>;
export type CreateCaptureRequest = z.input<typeof createCaptureRequestSchema>;
export type ProcessCaptureRequest = z.input<typeof processCaptureRequestSchema>;
export type ProcessCaptureResponse = z.infer<typeof processCaptureResponseSchema>;
export type CapturePreviewResponse = z.infer<typeof capturePreviewResponseSchema>;
export type ApplyCaptureRequest = z.input<typeof applyCaptureRequestSchema>;
export type ApplyCaptureResponse = z.infer<typeof applyCaptureResponseSchema>;
