import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateCaptureRequest,
  InboxListResponse,
  ProcessCaptureResponse,
} from "@momentarise/shared";
import {
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
      const res = await apiFetch("/api/v1/inbox", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create capture");
      return res.json() as Promise<{ id: string }>;
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
