import { z } from "zod";

export const itemKindSchema = z.enum(["note", "objective", "task", "resource"]);
export const lifecycleStatusSchema = z.enum([
  "draft",
  "captured",
  "processing",
  "ready",
  "applied",
  "archived",
]);
export const entityTypeSchema = z.enum(["capture", "item", "event", "plan", "block"]);
export const linkRelationTypeSchema = z.enum([
  "derived_from",
  "supports_goal",
  "planned_as",
  "references",
  "part_of_sequence",
]);

/** ProseMirror/BlockNote block node - minimal structure for Phase 1+ */
export type ProseMirrorNode = {
  type: string;
  block_id?: string | null;
  content?: ProseMirrorNode[] | null;
  attrs?: Record<string, unknown> | null;
  text?: string | null;
  marks?: Record<string, unknown>[] | null;
};

export const proseMirrorNodeSchema: z.ZodType<ProseMirrorNode> = z.lazy(() =>
  z.object({
    type: z.string(),
    block_id: z.string().optional().nullable(),
    content: z.array(proseMirrorNodeSchema).optional().nullable(),
    attrs: z.record(z.string(), z.unknown()).optional().nullable(),
    text: z.string().optional().nullable(),
    marks: z.array(z.record(z.string(), z.unknown())).optional().nullable(),
  })
);

/** Item blocks: array of ProseMirror-compatible nodes */
export const itemBlocksSchema = z.array(proseMirrorNodeSchema);

export const itemOutSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  kind: itemKindSchema,
  status: lifecycleStatusSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  source_capture_id: z.string().uuid().nullable(),
  blocks: itemBlocksSchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
}).transform(({ meta, metadata, ...rest }) => ({
  ...rest,
  metadata: metadata ?? meta ?? {},
}));

export const itemCreateRequestSchema = z.object({
  title: z.string().min(1),
  kind: itemKindSchema.default("note"),
  status: lifecycleStatusSchema.default("draft"),
  metadata: z.record(z.string(), z.unknown()).default({}),
  source_capture_id: z.string().uuid().nullable().optional(),
  blocks: itemBlocksSchema.default([]),
});

export const updateItemRequestSchema = z.object({
  blocks: itemBlocksSchema.optional(),
  title: z.string().optional(),
  kind: itemKindSchema.optional(),
  status: lifecycleStatusSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const itemListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  kind: itemKindSchema,
  status: lifecycleStatusSchema,
  updated_at: z.string().datetime(),
});

export const itemListResponseSchema = z.object({
  items: z.array(itemListItemSchema),
});

export const itemActionResponseSchema = z.object({
  item_id: z.string().uuid(),
  status: z.string(),
});

export const entityLinkSchema = z.object({
  id: z.string().uuid(),
  from_entity_type: entityTypeSchema,
  from_entity_id: z.string().uuid(),
  to_entity_type: entityTypeSchema,
  to_entity_id: z.string().uuid(),
  relation_type: linkRelationTypeSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string().datetime(),
}).transform(({ meta, metadata, ...rest }) => ({
  ...rest,
  metadata: metadata ?? meta ?? {},
}));

export const itemLinksResponseSchema = z.object({
  links: z.array(entityLinkSchema),
});

export const createEntityLinkRequestSchema = z.object({
  to_entity_type: entityTypeSchema,
  to_entity_id: z.string().uuid(),
  relation_type: linkRelationTypeSchema,
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type ItemOut = z.infer<typeof itemOutSchema>;
export type ItemCreateRequest = z.input<typeof itemCreateRequestSchema>;
export type UpdateItemRequest = z.input<typeof updateItemRequestSchema>;
export type ItemListItem = z.infer<typeof itemListItemSchema>;
export type ItemListResponse = z.infer<typeof itemListResponseSchema>;
export type ItemActionResponse = z.infer<typeof itemActionResponseSchema>;
export type EntityLink = z.infer<typeof entityLinkSchema>;
export type ItemLinksResponse = z.infer<typeof itemLinksResponseSchema>;
export type CreateEntityLinkRequest = z.input<typeof createEntityLinkRequestSchema>;
