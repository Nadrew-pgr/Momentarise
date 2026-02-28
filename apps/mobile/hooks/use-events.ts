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
      return eventsRangeResponseSchema.parse(data) as EventsRangeResponse;
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
