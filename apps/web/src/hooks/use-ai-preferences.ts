"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AiPreferencesResponse,
  AiPreferencesUpdateRequest,
} from "@momentarise/shared";
import {
  aiPreferencesResponseSchema,
  aiPreferencesUpdateRequestSchema,
} from "@momentarise/shared";
import { fetchWithAuth } from "@/lib/bff-client";

async function parseApiError(res: Response, fallback: string): Promise<Error> {
  try {
    const payload = await res.json();
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? String((payload as { detail: unknown }).detail)
        : null;
    return new Error(detail ? `${fallback}: ${detail}` : fallback);
  } catch {
    return new Error(fallback);
  }
}

export function useAiPreferences() {
  return useQuery<AiPreferencesResponse>({
    queryKey: ["ai-preferences"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/preferences/ai");
      if (!res.ok) {
        throw await parseApiError(res, "Failed to fetch AI preferences");
      }
      const data = await res.json();
      return aiPreferencesResponseSchema.parse(data);
    },
  });
}

export function useUpdateAiPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AiPreferencesUpdateRequest) => {
      const body = aiPreferencesUpdateRequestSchema.parse(payload);
      const res = await fetchWithAuth("/api/preferences/ai", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw await parseApiError(res, "Failed to update AI preferences");
      }
      const data = await res.json();
      return aiPreferencesResponseSchema.parse(data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["ai-preferences"], data);
      queryClient.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}
