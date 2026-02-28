"use client";

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
  ProcessCaptureResponse,
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
  processCaptureResponseSchema,
  reprocessCaptureResponseSchema,
} from "@momentarise/shared";
import { fetchWithAuth } from "@/lib/bff-client";

async function readApiError(res: Response, fallback: string): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return fallback;
  }
  try {
    const payload = await res.json();
    if (payload && typeof payload === "object") {
      const data = payload as Record<string, unknown>;
      const detail = data.detail;
      const requestId =
        typeof data.request_id === "string" && data.request_id.trim().length > 0
          ? data.request_id
          : null;
      const suffix = requestId ? ` [request_id=${requestId}]` : "";
      if (typeof detail === "string" && detail.trim().length > 0) {
        return `${detail}${suffix}`;
      }
      if (detail && typeof detail === "object") {
        const detailObj = detail as Record<string, unknown>;
        const message =
          typeof detailObj.message === "string"
            ? detailObj.message
            : typeof detailObj.code === "string"
              ? detailObj.code
              : null;
        if (message) return `${message}${suffix}`;
      }
      if (requestId) return `${fallback}${suffix}`;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export function useInbox(options?: { includeArchived?: boolean }) {
  const includeArchived = options?.includeArchived ?? false;
  return useQuery<InboxListResponse>({
    queryKey: ["inbox", includeArchived],
    queryFn: async () => {
      const res = await fetchWithAuth(
        `/api/inbox?include_archived=${includeArchived ? "true" : "false"}`
      );
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
    refetchInterval: (data) => {
      const status = data?.capture?.status;
      return status === "queued" || status === "processing" ? 2000 : false;
    },
    queryFn: async () => {
      const res = await fetchWithAuth(`/api/inbox/${captureId}`);
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
      const res = await fetchWithAuth(`/api/inbox/${captureId}/artifacts`);
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
      const res = await fetchWithAuth("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to create capture"));
      return res.json() as Promise<{ id: string }>;
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
      file,
      captureType,
      source = "manual",
      metadata = {},
    }: {
      file: File;
      captureType: "voice" | "photo" | "file";
      source?: string;
      metadata?: Record<string, unknown>;
    }) => {
      const form = new FormData();
      form.append("capture_type", captureType);
      form.append("source", source);
      form.append("metadata", JSON.stringify(metadata));
      form.append("file", file);

      const res = await fetchWithAuth("/api/inbox/upload", {
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
      const res = await fetchWithAuth(`/api/inbox/${captureId}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetchWithAuth(`/api/inbox/${captureId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const res = await fetchWithAuth(`/api/inbox/${captureId}/reprocess`, {
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

export function useProcessCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      captureId,
      title,
    }: {
      captureId: string;
      title: string;
    }) => {
      const res = await fetchWithAuth(`/api/inbox/${captureId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to process capture"));
      const data = await res.json();
      return processCaptureResponseSchema.parse(data) as ProcessCaptureResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["item"] });
    },
  });
}

export function useDeleteCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ captureId }: { captureId: string }) => {
      const res = await fetchWithAuth(`/api/inbox/${captureId}`, {
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

export function useRestoreCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ captureId }: { captureId: string }) => {
      const res = await fetchWithAuth(`/api/inbox/${captureId}/restore`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await readApiError(res, "Failed to restore capture"));
      const data = await res.json();
      return captureActionResponseSchema.parse(data) as CaptureActionResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
}
