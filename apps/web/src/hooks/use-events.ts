"use client";

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

export function useEventsRange(from: string | null, to: string | null) {
  return useQuery<EventsRangeResponse>({
    queryKey: ["events", from, to],
    enabled: !!from && !!to,
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const res = await fetchWithAuth(`/api/events?${qs.toString()}`);
      if (!res.ok) throw await parseApiError(res, "Failed to fetch events");
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
      const res = await fetchWithAuth("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await parseApiError(res, "Failed to create event");
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
      const res = await fetchWithAuth(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await parseApiError(res, "Failed to update event");
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
      const res = await fetchWithAuth(`/api/events/${eventId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw await parseApiError(res, "Failed to delete event");
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
