import { z } from "zod";

export const projectOutSchema = z.object({
    id: z.string().uuid(),
    workspace_id: z.string().uuid(),
    title: z.string().min(1).max(255),
    description: z.string().nullable().optional(),
    color: z.string().max(50),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

export type ProjectOut = z.infer<typeof projectOutSchema>;

export const projectCreateRequestSchema = z.object({
    title: z.string().min(1).max(255),
    description: z.string().nullable().optional(),
    color: z.string().max(50).default("sky"),
});

export type ProjectCreateRequest = z.infer<typeof projectCreateRequestSchema>;

export const projectUpdateRequestSchema = z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
    color: z.string().max(50).optional(),
});

export type ProjectUpdateRequest = z.infer<typeof projectUpdateRequestSchema>;
