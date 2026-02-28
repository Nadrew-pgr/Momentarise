import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ApplyCaptureRequest,
  ApplyCaptureResponse,
  CaptureActionResponse,
  CapturePreviewResponse,
  CreateCaptureRequest,
  InboxListResponse,
  ProcessCaptureResponse,
} from "@momentarise/shared";
import {
  applyCaptureResponseSchema,
  captureActionResponseSchema,
  capturePreviewResponseSchema,
  createCaptureRequestSchema,
  inboxListResponseSchema,
  processCaptureResponseSchema,
} from "@momentarise/shared";
import { apiFetch } from "@/lib/api";

export function useInbox() {
  return useQuery<InboxListResponse>({
    queryKey: ["inbox"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/inbox");
      if (!res.ok) throw new Error("Failed to fetch inbox");
      const data = await res.json();
      return inboxListResponseSchema.parse(data) as InboxListResponse;
    },
  });
}

export function useCreateCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateCaptureRequest) => {
      const body = createCaptureRequestSchema.parse(payload);
      const res = await apiFetch("/api/v1/inbox", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create capture");
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function usePreviewCapture() {
  return useMutation({
    mutationFn: async ({ captureId }: { captureId: string }) => {
      const res = await apiFetch(`/api/v1/inbox/${captureId}/preview`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to preview capture");
      const data = await res.json();
      return capturePreviewResponseSchema.parse(data) as CapturePreviewResponse;
    },
  });
}

export function useApplyCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      captureId,
      payload,
    }: {
      captureId: string;
      payload?: ApplyCaptureRequest;
    }) => {
      const res = await apiFetch(`/api/v1/inbox/${captureId}/apply`, {
        method: "POST",
        body: JSON.stringify(payload ?? {}),
      });
      if (!res.ok) throw new Error("Failed to apply capture");
      const data = await res.json();
      return applyCaptureResponseSchema.parse(data) as ApplyCaptureResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useProcessCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      captureId,
      title,
    }: { captureId: string; title: string }) => {
      const res = await apiFetch(`/api/v1/inbox/${captureId}/process`, {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to process capture");
      const data = await res.json();
      return processCaptureResponseSchema.parse(data) as ProcessCaptureResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      queryClient.invalidateQueries({ queryKey: ["item"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useDeleteCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ captureId }: { captureId: string }) => {
      const res = await apiFetch(`/api/v1/inbox/${captureId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete capture");
      const data = await res.json();
      return captureActionResponseSchema.parse(data) as CaptureActionResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useRestoreCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ captureId }: { captureId: string }) => {
      const res = await apiFetch(`/api/v1/inbox/${captureId}/restore`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to restore capture");
      const data = await res.json();
      return captureActionResponseSchema.parse(data) as CaptureActionResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}
