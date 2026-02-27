"use client";

import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type EventResizeDoneArg } from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { format } from "date-fns";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventDropArg,
  EventInput,
} from "@fullcalendar/core";
import type { EventOut } from "@momentarise/shared";
import { AgendaView } from "@/components/event-calendar/agenda-view";
import type { CalendarEvent } from "@/components/event-calendar/types";
import { CalendarEventChip } from "../../ui/CalendarEventChip";
import {
  fullCalendarViewFrom,
  getCalendarViewTitle,
  getRangeForCalendarView,
  shiftCalendarDate,
  type CalendarViewKind,
} from "../../core/view-types";
import { CalendarEventDialog } from "../../ui/CalendarEventDialog";
import { CalendarToolbar } from "../../ui/CalendarToolbar";
import type {
  CalendarCreateInput,
  CalendarRangeChange,
  CalendarUpdateInput,
} from "../../core/types";

interface FullCalendarAdapterProps {
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

function fallbackEnd(start: Date): Date {
  return new Date(start.getTime() + 60 * 60 * 1000);
}

function toCalendarEvent(source: EventOut): CalendarEvent {
  return {
    id: source.id,
    title: source.title,
    start: new Date(source.start_at),
    end: new Date(source.end_at),
    allDay: false,
    color: source.color,
    isTracking: source.is_tracking,
  };
}

export function FullCalendarAdapter({
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
}: FullCalendarAdapterProps) {
  const calendarRef = useRef<FullCalendar | null>(null);
  const [view, setView] = useState<CalendarViewKind>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const eventsById = useMemo(() => {
    return new Map(events.map((event) => [event.id, event]));
  }, [events]);

  const fullCalendarEvents = useMemo<EventInput[]>(() => {
    return events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start_at,
      end: event.end_at,
      allDay: false,
      classNames: [
        `event-color-${event.color}`,
        event.is_tracking ? "is-tracking" : "is-standard",
      ],
      extendedProps: {
        updatedAt: event.updated_at,
        color: event.color,
      },
    }));
  }, [events]);

  const agendaEvents = useMemo<CalendarEvent[]>(() => {
    return events.map(toCalendarEvent);
  }, [events]);

  const viewTitle = useMemo(() => getCalendarViewTitle(currentDate, view), [currentDate, view]);

  const syncRangeForAgenda = (date: Date) => {
    const range = getRangeForCalendarView(date, "agenda");
    onRangeChange({
      from: range.from,
      to: range.to,
      view: "agenda",
      currentDate: date,
    });
  };

  const handleDatesSet = (arg: DatesSetArg) => {
    if (view === "agenda") return;

    onRangeChange({
      from: arg.start,
      to: new Date(arg.end.getTime() - 24 * 60 * 60 * 1000),
      view,
      currentDate,
    });
  };

  const handleToolbarToday = () => {
    const next = new Date();
    setCurrentDate(next);

    if (view === "agenda") {
      syncRangeForAgenda(next);
      return;
    }

    const api = calendarRef.current?.getApi();
    api?.today();
  };

  const handleToolbarShift = (direction: "prev" | "next") => {
    const next = shiftCalendarDate(currentDate, view, direction);
    setCurrentDate(next);

    if (view === "agenda") {
      syncRangeForAgenda(next);
      return;
    }

    const api = calendarRef.current?.getApi();
    if (direction === "next") {
      api?.next();
    } else {
      api?.prev();
    }
  };

  const handleViewChange = (nextView: CalendarViewKind) => {
    setView(nextView);

    if (nextView === "agenda") {
      syncRangeForAgenda(currentDate);
      return;
    }

    const api = calendarRef.current?.getApi();
    api?.changeView(fullCalendarViewFrom(nextView), currentDate);
  };

  const openCreateDialog = () => {
    const start = new Date(currentDate);
    start.setHours(startHour, 0, 0, 0);

    setSelectedEvent({
      id: "",
      title: "",
      start,
      end: fallbackEnd(start),
      allDay: false,
      color: "sky",
      isTracking: false,
    });
    setIsDialogOpen(true);
  };

  const handleSelect = (arg: DateSelectArg) => {
    setSelectedEvent({
      id: "",
      title: "",
      start: arg.start,
      end: arg.end,
      allDay: false,
      color: "sky",
      isTracking: false,
    });
    setIsDialogOpen(true);
    arg.view.calendar.unselect();
  };

  const openExistingEvent = (eventId: string) => {
    const source = eventsById.get(eventId);
    if (!source) return;
    setSelectedEvent(toCalendarEvent(source));
    setIsDialogOpen(true);
  };

  const handleEventClick = (arg: EventClickArg) => {
    openExistingEvent(arg.event.id);
  };

  const handleDrop = (arg: EventDropArg) => {
    const start = arg.event.start ?? new Date();
    const end = arg.event.end ?? fallbackEnd(start);
    const source = eventsById.get(arg.event.id);

    void onUpdate({
      eventId: arg.event.id,
      title: arg.event.title,
      start,
      end,
      lastKnownUpdatedAt: source?.updated_at,
      color: source?.color,
    }).catch((err) => {
      arg.revert();
      toast.error(err instanceof Error ? err.message : "Failed to update event");
    });
  };

  const handleResize = (arg: EventResizeDoneArg) => {
    const start = arg.event.start ?? new Date();
    const end = arg.event.end ?? fallbackEnd(start);
    const source = eventsById.get(arg.event.id);

    void onUpdate({
      eventId: arg.event.id,
      title: arg.event.title,
      start,
      end,
      lastKnownUpdatedAt: source?.updated_at,
      color: source?.color,
    }).catch((err) => {
      arg.revert();
      toast.error(err instanceof Error ? err.message : "Failed to update event");
    });
  };

  const handleDialogSave = (event: CalendarEvent) => {
    if (!event.id) {
      void onCreate({
        title: event.title,
        start: event.start,
        end: event.end,
        color: event.color,
      })
        .then(() => {
          setIsDialogOpen(false);
          setSelectedEvent(null);
        })
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : "Failed to create event");
        });
      return;
    }

    const source = eventsById.get(event.id);
    void onUpdate({
      eventId: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      lastKnownUpdatedAt: source?.updated_at,
      color: event.color,
    })
      .then(() => {
        setIsDialogOpen(false);
        setSelectedEvent(null);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to update event");
      });
  };

  const handleDialogDelete = (eventId: string) => {
    void onDelete(eventId)
      .then(() => {
        setIsDialogOpen(false);
        setSelectedEvent(null);
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to delete event");
      });
  };

  const handleToggleTracking = (eventId: string) => {
    const source = eventsById.get(eventId);
    if (!source) return;

    const action = source.is_tracking ? onStopTracking : onStartTracking;
    void action(eventId)
      .then(() => {
        setSelectedEvent((prev) =>
          prev
            ? {
                ...prev,
                isTracking: !source.is_tracking,
              }
            : prev
        );
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Failed to update tracking");
      });
  };

  return (
    <div className="calendar-parity flex min-h-0 flex-1 flex-col">
      <CalendarToolbar
        view={view}
        title={viewTitle}
        onToday={handleToolbarToday}
        onPrevious={() => handleToolbarShift("prev")}
        onNext={() => handleToolbarShift("next")}
        onViewChange={handleViewChange}
        onCreate={openCreateDialog}
        startHour={startHour}
        endHour={endHour}
        onDisplayHoursChange={onDisplayHoursChange}
        disableActions={isMutating}
        shortcutsEnabled={!isDialogOpen}
      />

      <div className="calendar-full min-h-0 flex-1">
        {view === "agenda" ? (
          <AgendaView
            currentDate={currentDate}
            events={agendaEvents}
            onEventSelect={(event) => {
              setSelectedEvent(event);
              setIsDialogOpen(true);
            }}
          />
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={fullCalendarViewFrom(view)}
            headerToolbar={false}
            events={fullCalendarEvents}
            datesSet={handleDatesSet}
            selectable
            editable
            eventDurationEditable
            eventStartEditable
            nowIndicator
            timeZone="local"
            slotMinTime={`${String(startHour).padStart(2, "0")}:00:00`}
            slotMaxTime={`${String(endHour).padStart(2, "0")}:00:00`}
            scrollTime={`${String(startHour).padStart(2, "0")}:00:00`}
            slotDuration="00:15:00"
            slotLabelInterval="01:00:00"
            select={handleSelect}
            eventClick={handleEventClick}
            eventDrop={handleDrop}
            eventResize={handleResize}
            dayHeaderContent={(arg) => (
              <span className="fc-day-header-label">
                {view === "month" ? format(arg.date, "EEE") : format(arg.date, "EEE dd")}
              </span>
            )}
            eventClassNames={(arg) => {
              const eventEnd = arg.event.end ?? arg.event.start;
              if (!eventEnd) return [];
              return eventEnd < new Date() ? ["is-past-event"] : [];
            }}
            eventContent={(arg) => {
              const eventEnd = arg.event.end ?? arg.event.start;
              return (
                <CalendarEventChip
                  title={arg.event.title}
                  timeText={arg.timeText}
                  isPast={!!eventEnd && eventEnd < new Date()}
                />
              );
            }}
          />
        )}
      </div>

      <CalendarEventDialog
        key={
          selectedEvent
            ? `${selectedEvent.id || "new"}-${new Date(selectedEvent.start).toISOString()}-${new Date(selectedEvent.end).toISOString()}`
            : "calendar-dialog-empty"
        }
        event={selectedEvent}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedEvent(null);
        }}
        onSave={handleDialogSave}
        onDelete={handleDialogDelete}
        onToggleTracking={handleToggleTracking}
        isTrackingActionPending={isMutating}
      />
    </div>
  );
}
