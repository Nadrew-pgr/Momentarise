import { z } from "zod";

/** ProseMirror/BlockNote block node - minimal structure for Phase 1 */
export type ProseMirrorNode = {
  type: string;
  content?: ProseMirrorNode[] | null;
  attrs?: Record<string, unknown> | null;
  text?: string | null;
  marks?: Record<string, unknown>[] | null;
};

export const proseMirrorNodeSchema: z.ZodType<ProseMirrorNode> = z.lazy(() =>
  z.object({
    type: z.string(),
    content: z.array(proseMirrorNodeSchema).optional().nullable(),
    attrs: z.record(z.string(), z.unknown()).optional().nullable(),
    text: z.string().optional().nullable(),
    marks: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
  })
);

/** Item blocks: array of ProseMirror-compatible objects (permissive for Phase 1) */
export const itemBlocksSchema = z.array(z.record(z.string(), z.unknown()));

export const itemOutSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  blocks: itemBlocksSchema,
});

export const updateItemRequestSchema = z.object({
  blocks: itemBlocksSchema.optional(),
  title: z.string().optional(),
});

export type ItemOut = z.infer<typeof itemOutSchema>;
export type UpdateItemRequest = z.infer<typeof updateItemRequestSchema>;
