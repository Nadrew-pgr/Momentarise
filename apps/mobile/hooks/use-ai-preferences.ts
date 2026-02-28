import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AiPreferencesResponse,
  AiPreferencesUpdateRequest,
} from "@momentarise/shared";
import {
  aiPreferencesResponseSchema,
  aiPreferencesUpdateRequestSchema,
} from "@momentarise/shared";
import { apiFetch, readApiError } from "@/lib/api";

export function useAiPreferences() {
  return useQuery<AiPreferencesResponse>({
    queryKey: ["ai-preferences"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/preferences/ai");
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to fetch AI preferences"));
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
      const res = await apiFetch("/api/v1/preferences/ai", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to update AI preferences"));
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
