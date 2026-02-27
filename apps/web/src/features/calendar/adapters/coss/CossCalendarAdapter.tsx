"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import type { EventOut } from "@momentarise/shared";
import { EventCalendar } from "@/components/event-calendar";
import type { CalendarEvent } from "@/components/event-calendar";
import type {
  CalendarCreateInput,
  CalendarRangeChange,
  CalendarUpdateInput,
} from "../../core/types";

interface CossCalendarAdapterProps {
  events: EventOut[];
  onRangeChange: (range: CalendarRangeChange) => void;
  onCreate: (input: CalendarCreateInput) => Promise<void>;
  onUpdate: (input: CalendarUpdateInput) => Promise<void>;
  onDelete: (eventId: string) => Promise<void>;
  onStartTracking: (eventId: string) => Promise<void>;
  onStopTracking: (eventId: string) => Promise<void>;
  startHour: number;
  endHour: number;
  onDisplayHoursChange: (startHour: number, endHour: number) => Promise<void>;
  isMutating: boolean;
}

export function CossCalendarAdapter({
  events,
  onRangeChange,
  onCreate,
  onUpdate,
  onDelete,
  onStartTracking,
  onStopTracking,
  startHour,
  endHour,
  onDisplayHoursChange,
  isMutating,
}: CossCalendarAdapterProps) {
  const eventById = useMemo(() => {
    return new Map(events.map((event) => [event.id, event]));
  }, [events]);

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    return events.map((event) => ({
      allDay: false,
      color: event.color,
      end: new Date(event.end_at),
      id: event.id,
      start: new Date(event.start_at),
      title: event.title,
      isTracking: event.is_tracking,
    }));
  }, [events]);

  const handleCreate = (calendarEvent: CalendarEvent) => {
    void onCreate({
      title: calendarEvent.title,
      start: calendarEvent.start,
      end: calendarEvent.end,
      color: calendarEvent.color,
    }).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Failed to create event");
    });
  };

  const handleUpdate = (calendarEvent: CalendarEvent) => {
    const source = eventById.get(calendarEvent.id);

    void onUpdate({
      eventId: calendarEvent.id,
      title: calendarEvent.title,
      start: calendarEvent.start,
      end: calendarEvent.end,
      lastKnownUpdatedAt: source?.updated_at,
      color: calendarEvent.color,
    }).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update event");
    });
  };

  const handleDelete = (eventId: string) => {
    void onDelete(eventId).catch((err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete event");
    });
  };

  return (
    <div className="calendar-parity flex min-h-0 flex-1">
      <EventCalendar
        className="w-full"
        events={calendarEvents}
        onVisibleRangeChange={onRangeChange}
        onEventAdd={handleCreate}
        onEventUpdate={handleUpdate}
        onEventDelete={handleDelete}
        onEventStartTracking={onStartTracking}
        onEventStopTracking={onStopTracking}
        startHour={startHour}
        endHour={endHour}
        onDisplayHoursChange={onDisplayHoursChange}
        isMutating={isMutating}
      />
    </div>
  );
}
