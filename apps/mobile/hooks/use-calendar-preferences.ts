import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CalendarPreferencesResponse,
  CalendarPreferencesUpdateRequest,
} from "@momentarise/shared";
import {
  calendarPreferencesResponseSchema,
  calendarPreferencesUpdateRequestSchema,
} from "@momentarise/shared";
import { apiFetch, readApiError } from "@/lib/api";

export function useCalendarPreferences() {
  return useQuery<CalendarPreferencesResponse>({
    queryKey: ["calendar-preferences"],
    queryFn: async () => {
      const res = await apiFetch("/api/v1/preferences/calendar");
      if (!res.ok) {
        throw new Error(
          await readApiError(res, "Failed to fetch calendar preferences")
        );
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
      const res = await apiFetch("/api/v1/preferences/calendar", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(
          await readApiError(res, "Failed to update calendar preferences")
        );
      }
      const data = await res.json();
      return calendarPreferencesResponseSchema.parse(data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["calendar-preferences"], data);
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}
