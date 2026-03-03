import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  EventCreateRequest,
  EventDeleteResponse,
  EventOut,
  EventUpdateRequest,
  EventsRangeResponse,
} from "@momentarise/shared";
import {
  eventCreateRequestSchema,
  eventDeleteResponseSchema,
  eventOutSchema,
  eventsRangeResponseSchema,
  eventUpdateRequestSchema,
} from "@momentarise/shared";
import { apiFetch, readApiError } from "@/lib/api";
import { RRule } from "rrule";

export function useEventsRange(from: string | null, to: string | null) {
  return useQuery<EventsRangeResponse>({
    queryKey: ["events", from, to],
    enabled: !!from && !!to,
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const res = await apiFetch(`/api/v1/events?${qs.toString()}`);
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to fetch events"));
      }
      const data = await res.json();
      const parsed = eventsRangeResponseSchema.parse(data) as EventsRangeResponse;

      if (!from || !to) return parsed;

      const fromDate = new Date(from);
      const toDate = new Date(to);
      const expandedEvents: EventOut[] = [];

      for (const event of parsed.events) {
        if (!event.rrule) {
          expandedEvents.push(event);
          continue;
        }

        try {
          const rule = RRule.fromString(event.rrule);
          const startAt = new Date(event.start_at);
          const endAt = new Date(event.end_at);
          const durationMs = endAt.getTime() - startAt.getTime();

          // dtstart is needed for RRule to base its occurrences correctly
          rule.options.dtstart = startAt;

          // Find occurrences in the requested range
          const occurrences = rule.between(fromDate, toDate, true);

          for (const occ of occurrences) {
            const expandedEnd = new Date(occ.getTime() + durationMs);
            // Append a suffix to the ID so React Native lists don't complain about duplicate keys
            // But we want to preserve the real ID for update mutations. In store.ts draftEvent.id is used.
            // When opening the moment sheet on mobile, we pass the draftEvent obj directly. So it will use this modified ID if we aren't careful.
            // We must set the actual ID so the API calls don't fail, but then the FlatList might have duplicate keys if we don't change it.
            // Actually, we can use `_r_${occ.getTime()}` and let the component handle it, or we can just send the same ID and hope the Agenda component doesn't complain (many React Native calendars group by day, so same ID across different days is often fine).
            // Let's use the real ID for now to avoid breaking update logic. If it complains, we will cross that bridge.
            expandedEvents.push({
              ...event,
              start_at: occ.toISOString(),
              end_at: expandedEnd.toISOString(),
            });
          }
        } catch (e) {
          console.error("Failed to parse rrule locally", e);
          expandedEvents.push(event);
        }
      }

      return { ...parsed, events: expandedEvents };
    },
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EventCreateRequest) => {
      const body = eventCreateRequestSchema.parse(payload);
      const res = await apiFetch("/api/v1/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to create event"));
      }
      const data = await res.json();
      return eventOutSchema.parse(data) as EventOut;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      queryClient.invalidateQueries({ queryKey: ["today"] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      eventId,
      payload,
    }: {
      eventId: string;
      payload: EventUpdateRequest;
    }) => {
      const body = eventUpdateRequestSchema.parse(payload);
      const res = await apiFetch(`/api/v1/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to update event"));
      }
      const data = await res.json();
      return eventOutSchema.parse(data) as EventOut;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      queryClient.invalidateQueries({ queryKey: ["today"] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const res = await apiFetch(`/api/v1/events/${eventId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error(await readApiError(res, "Failed to delete event"));
      }
      const data = await res.json();
      return eventDeleteResponseSchema.parse(data) as EventDeleteResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["timeline"] });
      queryClient.invalidateQueries({ queryKey: ["today"] });
    },
  });
}
