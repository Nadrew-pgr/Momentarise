import { z } from "zod";

export const inboxCaptureOutSchema = z.object({
  id: z.string().uuid(),
  raw_content: z.string(),
  created_at: z.string().datetime(),
});

export const inboxListResponseSchema = z.object({
  captures: z.array(inboxCaptureOutSchema),
});

export const createCaptureRequestSchema = z.object({
  raw_content: z.string(),
});

export const processCaptureResponseSchema = z.object({
  item_id: z.string().uuid(),
});

export type InboxCaptureOut = z.infer<typeof inboxCaptureOutSchema>;
export type InboxListResponse = z.infer<typeof inboxListResponseSchema>;
export type CreateCaptureRequest = z.infer<typeof createCaptureRequestSchema>;
export type ProcessCaptureResponse = z.infer<typeof processCaptureResponseSchema>;
