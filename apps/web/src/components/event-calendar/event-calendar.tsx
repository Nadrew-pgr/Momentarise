"use client";

import {
  format,
} from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AgendaView } from "./agenda-view";
import { CalendarDndProvider } from "./calendar-dnd-context";
import { EventGap, EventHeight, WeekCellsHeight } from "./constants";
import { DayView } from "./day-view";
import { MonthView } from "./month-view";
import type { CalendarEvent, CalendarView } from "./types";
import { addHoursToDate } from "./utils";
import { WeekView } from "./week-view";
import { getCalendarViewTitle, getRangeForCalendarView, shiftCalendarDate } from "@/features/calendar/core/view-types";
import { CalendarEventDialog } from "@/features/calendar/ui/CalendarEventDialog";
import { CalendarToolbar } from "@/features/calendar/ui/CalendarToolbar";

export interface EventCalendarProps {
  events?: CalendarEvent[];
  onEventAdd?: (event: CalendarEvent) => void | Promise<void>;
  onEventUpdate?: (event: CalendarEvent) => void | Promise<void>;
  onEventDelete?: (eventId: string) => void | Promise<void>;
  onEventStartTracking?: (eventId: string) => void | Promise<void>;
  onEventStopTracking?: (eventId: string) => void | Promise<void>;
  isMutating?: boolean;
  onVisibleRangeChange?: (range: {
    from: Date;
    to: Date;
    view: CalendarView;
    currentDate: Date;
  }) => void;
  className?: string;
  initialView?: CalendarView;
  startHour?: number;
  endHour?: number;
  onDisplayHoursChange?: (startHour: number, endHour: number) => Promise<void>;
}

export function EventCalendar({
  events = [],
  onEventAdd,
  onEventUpdate,
  onEventDelete,
  onEventStartTracking,
  onEventStopTracking,
  isMutating = false,
  onVisibleRangeChange,
  className,
  initialView = "month",
  startHour = 8,
  endHour = 24,
  onDisplayHoursChange,
}: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>(initialView);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );

  const handlePrevious = () => {
    setCurrentDate((prev) => shiftCalendarDate(prev, view, "prev"));
  };

  const handleNext = () => {
    setCurrentDate((prev) => shiftCalendarDate(prev, view, "next"));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventSelect = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };

  const handleEventCreate = (startTime: Date) => {
    // Snap to 15-minute intervals
    const minutes = startTime.getMinutes();
    const remainder = minutes % 15;
    if (remainder !== 0) {
      if (remainder < 7.5) {
        // Round down to nearest 15 min
        startTime.setMinutes(minutes - remainder);
      } else {
        // Round up to nearest 15 min
        startTime.setMinutes(minutes + (15 - remainder));
      }
      startTime.setSeconds(0);
      startTime.setMilliseconds(0);
    }

    const newEvent: CalendarEvent = {
      allDay: false,
      end: addHoursToDate(startTime, 1),
      id: "",
      start: startTime,
      title: "",
    };
    setSelectedEvent(newEvent);
    setIsEventDialogOpen(true);
  };

  const handleEventSave = (event: CalendarEvent) => {
    if (event.id) {
      onEventUpdate?.(event);
      // Show toast notification when an event is updated
      toast(`Event "${event.title}" updated`, {
        description: format(new Date(event.start), "MMM d, yyyy"),
        position: "bottom-left",
      });
    } else {
      onEventAdd?.(event);
      // Show toast notification when an event is added
      toast(`Event "${event.title}" added`, {
        description: format(new Date(event.start), "MMM d, yyyy"),
        position: "bottom-left",
      });
    }
    setIsEventDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleEventDelete = (eventId: string) => {
    const deletedEvent = events.find((e) => e.id === eventId);
    onEventDelete?.(eventId);
    setIsEventDialogOpen(false);
    setSelectedEvent(null);

    // Show toast notification when an event is deleted
    if (deletedEvent) {
      toast(`Event "${deletedEvent.title}" deleted`, {
        description: format(new Date(deletedEvent.start), "MMM d, yyyy"),
        position: "bottom-left",
      });
    }
  };

  const handleEventUpdate = (updatedEvent: CalendarEvent) => {
    onEventUpdate?.(updatedEvent);

    // Show toast notification when an event is updated via drag and drop
    toast(`Event "${updatedEvent.title}" moved`, {
      description: format(new Date(updatedEvent.start), "MMM d, yyyy"),
      position: "bottom-left",
    });
  };

  const viewTitle = useMemo(
    () => getCalendarViewTitle(currentDate, view),
    [currentDate, view]
  );

  useEffect(() => {
    if (!onVisibleRangeChange) return;
    const range = getRangeForCalendarView(currentDate, view);
    onVisibleRangeChange({
      from: range.from,
      to: range.to,
      view,
      currentDate,
    });
  }, [currentDate, onVisibleRangeChange, view]);

  return (
    <div
      className="flex flex-1 flex-col has-data-[slot=month-view]:flex-1"
      style={
        {
          "--event-gap": `${EventGap}px`,
          "--event-height": `${EventHeight}px`,
          "--week-cells-height": `${WeekCellsHeight}px`,
        } as React.CSSProperties
      }
    >
      <CalendarDndProvider onEventUpdate={handleEventUpdate}>
        <CalendarToolbar
          className={className}
          view={view}
          title={viewTitle}
          onToday={handleToday}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onViewChange={(nextView) => setView(nextView as CalendarView)}
          onCreate={() => {
            const start = new Date(currentDate);
            start.setHours(startHour, 0, 0, 0);
            setSelectedEvent({
              id: "",
              title: "",
              start,
              end: addHoursToDate(start, 1),
              allDay: false,
              color: "sky",
              isTracking: false,
            });
            setIsEventDialogOpen(true);
          }}
          startHour={startHour}
          endHour={endHour}
          onDisplayHoursChange={onDisplayHoursChange}
          disableActions={isMutating}
          shortcutsEnabled={!isEventDialogOpen}
        />

        <div className="flex flex-1 flex-col">
          {view === "month" && (
            <MonthView
              currentDate={currentDate}
              events={events}
              onEventCreate={handleEventCreate}
              onEventSelect={handleEventSelect}
            />
          )}
          {view === "week" && (
            <WeekView
              currentDate={currentDate}
              events={events}
              onEventCreate={handleEventCreate}
              onEventSelect={handleEventSelect}
              startHour={startHour}
              endHour={endHour}
            />
          )}
          {view === "day" && (
            <DayView
              currentDate={currentDate}
              events={events}
              onEventCreate={handleEventCreate}
              onEventSelect={handleEventSelect}
              startHour={startHour}
              endHour={endHour}
            />
          )}
          {view === "agenda" && (
            <AgendaView
              currentDate={currentDate}
              events={events}
              onEventSelect={handleEventSelect}
            />
          )}
        </div>

        <CalendarEventDialog
          key={
            selectedEvent
              ? `${selectedEvent.id || "new"}-${new Date(selectedEvent.start).toISOString()}-${new Date(selectedEvent.end).toISOString()}`
              : "event-dialog-empty"
          }
          event={selectedEvent}
          isOpen={isEventDialogOpen}
          onClose={() => {
            setIsEventDialogOpen(false);
            setSelectedEvent(null);
          }}
          onDelete={handleEventDelete}
          onSave={handleEventSave}
          onToggleTracking={
            onEventStartTracking && onEventStopTracking
              ? (eventId) => {
                  const event = events.find((e) => e.id === eventId);
                  if (!event) return;
                  if (event.isTracking) {
                    void Promise.resolve(onEventStopTracking(eventId)).then(() => {
                      setSelectedEvent((prev) =>
                        prev
                          ? {
                              ...prev,
                              isTracking: false,
                            }
                          : prev
                      );
                    }).catch((error: unknown) => {
                      toast.error(error instanceof Error ? error.message : "Failed to update tracking");
                    });
                  } else {
                    void Promise.resolve(onEventStartTracking(eventId)).then(() => {
                      setSelectedEvent((prev) =>
                        prev
                          ? {
                              ...prev,
                              isTracking: true,
                            }
                          : prev
                      );
                    }).catch((error: unknown) => {
                      toast.error(error instanceof Error ? error.message : "Failed to update tracking");
                    });
                  }
                }
              : undefined
          }
          isTrackingActionPending={isMutating}
        />
      </CalendarDndProvider>
    </div>
  );
}
