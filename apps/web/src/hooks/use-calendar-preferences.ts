"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CalendarPreferencesResponse,
  CalendarPreferencesUpdateRequest,
} from "@momentarise/shared";
import {
  calendarPreferencesResponseSchema,
  calendarPreferencesUpdateRequestSchema,
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

export function useCalendarPreferences() {
  return useQuery<CalendarPreferencesResponse>({
    queryKey: ["calendar-preferences"],
    queryFn: async () => {
      const res = await fetchWithAuth("/api/preferences/calendar");
      if (!res.ok) {
        throw await parseApiError(res, "Failed to fetch calendar preferences");
      }
      const data = await res.json();
      return calendarPreferencesResponseSchema.parse(data);
    },
  });
}

export function useUpdateCalendarPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CalendarPreferencesUpdateRequest) => {
      const body = calendarPreferencesUpdateRequestSchema.parse(payload);
      const res = await fetchWithAuth("/api/preferences/calendar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw await parseApiError(res, "Failed to update calendar preferences");
      }
      const data = await res.json();
      return calendarPreferencesResponseSchema.parse(data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["calendar-preferences"], data);
    },
  });
}
