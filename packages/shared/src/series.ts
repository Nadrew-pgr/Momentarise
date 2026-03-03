import { z } from "zod";

export const seriesOutSchema = z.object({
    id: z.string().uuid(),
    workspace_id: z.string().uuid(),
    project_id: z.string().uuid().nullable().optional(),
    title: z.string().min(1).max(255),
    rrule_template: z.string().max(255).nullable().optional(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

export type SeriesOut = z.infer<typeof seriesOutSchema>;

export const seriesCreateRequestSchema = z.object({
    title: z.string().min(1).max(255),
    project_id: z.string().uuid().nullable().optional(),
    rrule_template: z.string().max(255).nullable().optional(),
});

export type SeriesCreateRequest = z.infer<typeof seriesCreateRequestSchema>;

export const seriesUpdateRequestSchema = z.object({
    title: z.string().min(1).max(255).optional(),
    project_id: z.string().uuid().nullable().optional(),
    rrule_template: z.string().max(255).nullable().optional(),
});

export type SeriesUpdateRequest = z.infer<typeof seriesUpdateRequestSchema>;
