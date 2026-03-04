import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ApplyCaptureRequest,
  ApplyCaptureResponse,
  CaptureActionResponse,
  CaptureArtifactsResponse,
  CaptureDetailResponse,
  CapturePreviewRequest,
  CapturePreviewResponse,
  CaptureUploadResponse,
  CreateCaptureRequest,
  InboxListResponse,
  ReprocessCaptureResponse,
} from "@momentarise/shared";
import {
  applyCaptureRequestSchema,
  applyCaptureResponseSchema,
  captureActionResponseSchema,
  captureArtifactsResponseSchema,
  captureDetailResponseSchema,
  capturePreviewRequestSchema,
  capturePreviewResponseSchema,
  captureUploadResponseSchema,
  createCaptureRequestSchema,
  inboxListResponseSchema,
  reprocessCaptureResponseSchema,
} from "@momentarise/shared";
import { apiFetch, readApiError } from "@/lib/api";

export type InboxBucket = "all" | "untreated" | "treated";

export function useInbox(options?: { includeArchived?: boolean; bucket?: InboxBucket }) {
  const includeArchived = options?.includeArchived ?? false;
  const bucket = options?.bucket ?? "all";
  return useQuery<InboxListResponse>({
    queryKey: ["inbox", includeArchived, bucket],
    queryFn: async () => {
      const qs = new URLSearchParams({
        include_archived: includeArchived ? "true" : "false",
        bucket,
      });
      const res = await apiFetch(`/api/v1/inbox?${qs.toString()}`);
      if (!res.ok) throw new Error(await readApiError(res, "Failed to fetch inbox"));
      const data = await res.json();
      return inboxListResponseSchema.parse(data) as InboxListResponse;
    },
  });
}

export function useCaptureDetail(captureId: string | null) {
  return useQuery<CaptureDetailResponse>({
    queryKey: ["inbox", "capture", captureId],
    enabled: Boolean(captureId),
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/inbox/${captureId}`);
      if (!res.ok) throw new Error(await readApiError(res, "Failed to fetch capture detail"));
      const data = await res.json();
      return captureDetailResponseSchema.parse(data) as CaptureDetailResponse;
    },
  });
}

export function useCaptureArtifacts(captureId: string | null) {
  return useQuery<CaptureArtifactsResponse>({
    queryKey: ["inbox", "capture", captureId, "artifacts"],
    enabled: Boolean(captureId),
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/inbox/${captureId}/artifacts`);
      if (!res.ok) throw new Error(await readApiError(res, "Failed to fetch capture artifacts"));
      const data = await res.json();
      return captureArtifactsResponseSchema.parse(data) as CaptureArtifactsResponse;
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
      if (!res.ok) throw new Error(await readApiError(res, "Failed to create capture"));
      return res.json() as Promise<{ id: string; item_id?: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useUploadCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      uri,
      name,
      type,
      captureType,
      source = "manual",
      metadata = {},
    }: {
      uri: string;
      name: string;
      type: string;
      captureType: "voice" | "photo" | "file";
      source?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const form = new FormData();
      form.append("capture_type", captureType);
      form.append("source", source);
      form.append("metadata", JSON.stringify(metadata));
      form.append("file", { uri, name, type } as never);

      const res = await apiFetch("/api/v1/inbox/upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to upload capture"));
      const data = await res.json();
      return captureUploadResponseSchema.parse(data) as CaptureUploadResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function usePreviewCapture() {
  return useMutation({
    mutationFn: async ({
      captureId,
      actionKey,
    }: {
      captureId: string;
      actionKey?: string;
    }) => {
      const payload = capturePreviewRequestSchema.parse({
        action_key: actionKey,
      }) as CapturePreviewRequest;
      const res = await apiFetch(`/api/v1/inbox/${captureId}/preview`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to preview capture"));
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
      const body = applyCaptureRequestSchema.parse(payload ?? {});
      const res = await apiFetch(`/api/v1/inbox/${captureId}/apply`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to apply capture"));
      const data = await res.json();
      return applyCaptureResponseSchema.parse(data) as ApplyCaptureResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useReprocessCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ captureId }: { captureId: string }) => {
      const res = await apiFetch(`/api/v1/inbox/${captureId}/reprocess`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to reprocess capture"));
      const data = await res.json();
      return reprocessCaptureResponseSchema.parse(data) as ReprocessCaptureResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useArchiveCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ captureId }: { captureId: string }) => {
      const res = await apiFetch(`/api/v1/inbox/${captureId}/archive`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to archive capture"));
      const data = await res.json();
      return captureActionResponseSchema.parse(data) as CaptureActionResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
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
      if (!res.ok) throw new Error(await readApiError(res, "Failed to delete capture"));
      const data = await res.json();
      return captureActionResponseSchema.parse(data) as CaptureActionResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}
