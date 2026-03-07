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
  onCreate: (input: CalendarCreateInput) => Promise<EventOut>;
  onUpdate: (input: CalendarUpdateInput) => Promise<EventOut>;
  onDelete: (eventId: string) => Promise<void>;
  onStartTracking: (eventId: string) => Promise<void>;
  onStopTracking: (eventId: string) => Promise<void>;
  startHour: number;
  endHour: number;
  onDisplayHoursChange: (startHour: number, endHour: number) => Promise<void>;
  isMutating: boolean;
}

function toCalendarEvent(event: EventOut): CalendarEvent {
  return {
    id: event.id,
    itemId: event.item_id,
    updatedAt: event.updated_at,
    title: event.title,
    description: event.description ?? undefined,
    start: new Date(event.start_at),
    end: new Date(event.end_at),
    allDay: event.all_day,
    location: event.location ?? undefined,
    color: event.color,
    isTracking: event.is_tracking,
    estimatedTimeSeconds: event.estimated_time_seconds,
    actualTimeAccSeconds: event.actual_time_acc_seconds,
  };
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
    return events.map(toCalendarEvent);
  }, [events]);

  const handleCreate = async (calendarEvent: CalendarEvent): Promise<CalendarEvent> => {
    try {
      const created = await onCreate({
        title: calendarEvent.title,
        description: calendarEvent.description,
        start: calendarEvent.start,
        end: calendarEvent.end,
        allDay: calendarEvent.allDay,
        location: calendarEvent.location,
        color: calendarEvent.color,
      });
      return toCalendarEvent(created);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create moment");
      throw err;
    }
  };

  const handleUpdate = async (calendarEvent: CalendarEvent): Promise<CalendarEvent> => {
    const source = eventById.get(calendarEvent.id);

    try {
      const updated = await onUpdate({
        eventId: calendarEvent.id,
        title: calendarEvent.title,
        description: calendarEvent.description,
        start: calendarEvent.start,
        end: calendarEvent.end,
        lastKnownUpdatedAt: source?.updated_at,
        allDay: calendarEvent.allDay,
        location: calendarEvent.location,
        color: calendarEvent.color,
      });
      return toCalendarEvent(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update moment");
      throw err;
    }
  };

  const handleDelete = async (eventId: string): Promise<void> => {
    try {
      await onDelete(eventId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete moment");
      throw err;
    }
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
