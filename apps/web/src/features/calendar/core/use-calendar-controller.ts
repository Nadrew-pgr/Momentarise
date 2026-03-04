"use client";

import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { differenceInSeconds } from "date-fns";
import { useCallback, useMemo, useState } from "react";
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

/** Initial visible range = current month grid (same as getRangeForCalendarView(today, "month")) to avoid day→month transition jump. */
function getInitialMonthRange(): { from: string; to: string } {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  return {
    from: toLocalYYYYMMDD(gridStart),
    to: toLocalYYYYMMDD(gridEnd),
  };
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
const EMPTY_EVENTS: EventOut[] = [];

export function useCalendarController(): CalendarController {
  const [visibleRange, setVisibleRange] = useState<{ from: string; to: string }>(getInitialMonthRange);

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

  const events = useMemo<EventOut[]>(() => data?.events ?? EMPTY_EVENTS, [data?.events]);
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

  const createEvent = useCallback(async ({
    title,
    description,
    start,
    end,
    allDay,
    location,
    color,
    rrule,
    seriesId,
    projectId,
  }: CalendarCreateInput) => {
    return createMutation.mutateAsync({
      title: resolveTitle(title, "Untitled moment"),
      description: description ?? null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      all_day: allDay ?? false,
      location: location ?? null,
      estimated_time_seconds: toEstimatedSeconds(start, end),
      color,
      rrule,
      series_id: seriesId,
      project_id: projectId,
    });
  }, [createMutation]);

  const updateEvent = useCallback(async ({
    eventId,
    title,
    description,
    start,
    end,
    allDay,
    location,
    lastKnownUpdatedAt,
    color,
    rrule,
    seriesId,
    projectId,
    updateMode,
  }: CalendarUpdateInput) => {
    const source = eventById.get(eventId);

    try {
      return await updateMutation.mutateAsync({
        eventId,
        payload: {
          title: resolveTitle(title, source?.title ?? "Untitled moment"),
          description: description ?? source?.description ?? null,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          all_day: allDay ?? source?.all_day ?? false,
          location: location ?? source?.location ?? null,
          estimated_time_seconds: toEstimatedSeconds(start, end),
          last_known_updated_at: lastKnownUpdatedAt ?? source?.updated_at,
          color,
          rrule,
          series_id: seriesId,
          project_id: projectId,
          update_mode: updateMode,
        },
      });
    } catch (error) {
      await refetch();
      throw error;
    }
  }, [updateMutation, eventById, refetch]);

  const deleteEvent = useCallback(async (eventId: string) => {
    try {
      await deleteMutation.mutateAsync(eventId);
    } catch (error) {
      await refetch();
      throw error;
    }
  }, [deleteMutation, refetch]);

  const startTracking = useCallback(async (eventId: string) => {
    await startTrackingMutation(eventId);
  }, [startTrackingMutation]);

  const stopTracking = useCallback(async (eventId: string) => {
    await stopTrackingMutation(eventId);
  }, [stopTrackingMutation]);

  const updateCalendarPreferences = useCallback(async (nextStartHour: number, nextEndHour: number) => {
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
  }, [updatePreferencesMutation, preferencesQuery]);

  return useMemo(() => ({
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
  }), [
    events,
    error,
    isLoading,
    isFetching,
    createMutation.isPending,
    updateMutation.isPending,
    deleteMutation.isPending,
    updatePreferencesMutation.isPending,
    isStarting,
    isStopping,
    startHour,
    endHour,
    visibleRange,
    refetch,
    preferencesQuery,
    onRangeChange,
    updateCalendarPreferences,
    createEvent,
    updateEvent,
    deleteEvent,
    startTracking,
    stopTracking,
  ]);
}
