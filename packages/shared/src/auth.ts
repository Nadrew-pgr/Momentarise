import { z } from "zod";

export const userOutSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
});

export const activeWorkspaceOutSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  role: z.string(),
});

export const meResponseSchema = z.object({
  user: userOutSchema,
  active_workspace: activeWorkspaceOutSchema.nullable(),
});

export const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export const signupSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export type UserOut = z.infer<typeof userOutSchema>;
export type ActiveWorkspaceOut = z.infer<typeof activeWorkspaceOutSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
