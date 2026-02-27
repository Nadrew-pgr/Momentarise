"use client";

import { differenceInSeconds } from "date-fns";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { EventCalendar } from "@/components/event-calendar";
import type { CalendarEvent } from "@/components/event-calendar";
import { Button } from "@/components/ui/button";
import {
  useCreateEvent,
  useDeleteEvent,
  useEventsRange,
  useUpdateEvent,
} from "@/hooks/use-events";

function toLocalYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toEstimatedSeconds(start: Date, end: Date): number {
  return Math.max(0, differenceInSeconds(end, start));
}

export default function TimelinePage() {
  const today = new Date();
  const todayKey = toLocalYYYYMMDD(today);
  const [visibleRange, setVisibleRange] = useState<{ from: string; to: string }>({
    from: todayKey,
    to: todayKey,
  });

  const {
    data,
    error,
    isFetching,
    isLoading,
    refetch: refetchEvents,
  } = useEventsRange(visibleRange.from, visibleRange.to);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  const events = useMemo(() => data?.events ?? [], [data?.events]);
  const eventById = useMemo(() => {
    return new Map(events.map((event) => [event.id, event]));
  }, [events]);

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    return events.map((event) => ({
      allDay: false,
      color: event.is_tracking ? "emerald" : "sky",
      end: new Date(event.end_at),
      id: event.id,
      start: new Date(event.start_at),
      title: event.title,
    }));
  }, [events]);

  const handleRangeChange = ({ from, to }: { from: Date; to: Date }) => {
    const nextRange = {
      from: toLocalYYYYMMDD(from),
      to: toLocalYYYYMMDD(to),
    };
    setVisibleRange((prev) =>
      prev.from === nextRange.from && prev.to === nextRange.to ? prev : nextRange
    );
  };

  const handleCreateEvent = (calendarEvent: CalendarEvent) => {
    void createEvent
      .mutateAsync({
        title: calendarEvent.title.trim() || "Untitled event",
        start_at: calendarEvent.start.toISOString(),
        end_at: calendarEvent.end.toISOString(),
        estimated_time_seconds: toEstimatedSeconds(calendarEvent.start, calendarEvent.end),
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to create event");
      });
  };

  const handleUpdateEvent = (calendarEvent: CalendarEvent) => {
    const source = eventById.get(calendarEvent.id);
    void updateEvent
      .mutateAsync({
        eventId: calendarEvent.id,
        payload: {
          title: calendarEvent.title.trim() || source?.title || "Untitled event",
          start_at: calendarEvent.start.toISOString(),
          end_at: calendarEvent.end.toISOString(),
          estimated_time_seconds: toEstimatedSeconds(calendarEvent.start, calendarEvent.end),
          last_known_updated_at: source?.updated_at,
        },
      })
      .catch(async (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to update event");
        await refetchEvents();
      });
  };

  const handleDeleteEvent = (eventId: string) => {
    void deleteEvent.mutateAsync(eventId).catch(async (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete event");
      await refetchEvents();
    });
  };

  return (
    <div className="flex h-full w-full flex-1 flex-col">
      {error ? (
        <div className="bg-destructive/10 border-destructive m-4 rounded-md border px-3 py-2">
          <p className="text-destructive text-sm">{error.message}</p>
          <Button
            className="mt-2"
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => {
              void refetchEvents();
            }}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {isLoading ? <p className="px-4 text-sm text-muted-foreground">Loading...</p> : null}
      <EventCalendar
        events={calendarEvents}
        onVisibleRangeChange={handleRangeChange}
        onEventAdd={handleCreateEvent}
        onEventUpdate={handleUpdateEvent}
        onEventDelete={handleDeleteEvent}
      />
    </div>
  );
}
