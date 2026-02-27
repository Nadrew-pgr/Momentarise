"use client";

import { differenceInSeconds } from "date-fns";
import { useMemo, useState } from "react";
import type { EventOut } from "@momentarise/shared";
import { useCalendarPreferences, useUpdateCalendarPreferences } from "@/hooks/use-calendar-preferences";
import { useCreateEvent, useDeleteEvent, useEventsRange, useUpdateEvent } from "@/hooks/use-events";
import { useTracking } from "@/hooks/use-tracking";
import type {
  CalendarController,
  CalendarCreateInput,
  CalendarRangeChange,
  CalendarUpdateInput,
} from "./types";

function toLocalYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toEstimatedSeconds(start: Date, end: Date): number {
  return Math.max(0, differenceInSeconds(end, start));
}

function resolveTitle(inputTitle: string | undefined, fallback: string): string {
  const normalized = (inputTitle ?? "").trim();
  return normalized.length > 0 ? normalized : fallback;
}

const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 24;

export function useCalendarController(): CalendarController {
  const todayKey = toLocalYYYYMMDD(new Date());
  const [visibleRange, setVisibleRange] = useState<{ from: string; to: string }>({
    from: todayKey,
    to: todayKey,
  });

  const { data, error, isFetching, isLoading, refetch } = useEventsRange(
    visibleRange.from,
    visibleRange.to
  );
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();
  const preferencesQuery = useCalendarPreferences();
  const updatePreferencesMutation = useUpdateCalendarPreferences();
  const {
    startTracking: startTrackingMutation,
    stopTracking: stopTrackingMutation,
    isStarting,
    isStopping,
  } = useTracking();

  const events = useMemo<EventOut[]>(() => data?.events ?? [], [data?.events]);
  const startHour = preferencesQuery.data?.start_hour ?? DEFAULT_START_HOUR;
  const endHour = preferencesQuery.data?.end_hour ?? DEFAULT_END_HOUR;
  const eventById = useMemo(() => {
    return new Map(events.map((event) => [event.id, event]));
  }, [events]);

  const onRangeChange = ({ from, to }: CalendarRangeChange) => {
    const next = {
      from: toLocalYYYYMMDD(from),
      to: toLocalYYYYMMDD(to),
    };
    setVisibleRange((prev) =>
      prev.from === next.from && prev.to === next.to ? prev : next
    );
  };

  const createEvent = async ({ title, start, end, color }: CalendarCreateInput) => {
    await createMutation.mutateAsync({
      title: resolveTitle(title, "Untitled event"),
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      estimated_time_seconds: toEstimatedSeconds(start, end),
      color,
    });
  };

  const updateEvent = async ({
    eventId,
    title,
    start,
    end,
    lastKnownUpdatedAt,
    color,
  }: CalendarUpdateInput) => {
    const source = eventById.get(eventId);

    try {
      await updateMutation.mutateAsync({
        eventId,
        payload: {
          title: resolveTitle(title, source?.title ?? "Untitled event"),
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          estimated_time_seconds: toEstimatedSeconds(start, end),
          last_known_updated_at: lastKnownUpdatedAt ?? source?.updated_at,
          color,
        },
      });
    } catch (error) {
      await refetch();
      throw error;
    }
  };

  const deleteEvent = async (eventId: string) => {
    try {
      await deleteMutation.mutateAsync(eventId);
    } catch (error) {
      await refetch();
      throw error;
    }
  };

  const startTracking = async (eventId: string) => {
    await startTrackingMutation(eventId);
  };

  const stopTracking = async (eventId: string) => {
    await stopTrackingMutation(eventId);
  };

  const updateCalendarPreferences = async (nextStartHour: number, nextEndHour: number) => {
    try {
      await updatePreferencesMutation.mutateAsync({
        start_hour: nextStartHour,
        end_hour: nextEndHour,
        last_known_updated_at: preferencesQuery.data?.updated_at,
      });
    } catch (error) {
      await preferencesQuery.refetch();
      throw error;
    }
  };

  return {
    events,
    error: error ?? null,
    isLoading,
    isFetching,
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      updatePreferencesMutation.isPending ||
      isStarting ||
      isStopping,
    startHour,
    endHour,
    visibleRange,
    refetch: async () => Promise.all([refetch(), preferencesQuery.refetch()]),
    onRangeChange,
    updateCalendarPreferences,
    createEvent,
    updateEvent,
    deleteEvent,
    startTracking,
    stopTracking,
  };
}
