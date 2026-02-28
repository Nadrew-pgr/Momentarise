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

const CALENDAR_VIEW_STORAGE_KEY = "momentarise-calendar-view";

function getStoredCalendarView(): CalendarViewKind {
  if (typeof window === "undefined") return "month";
  try {
    const stored = window.localStorage.getItem(CALENDAR_VIEW_STORAGE_KEY);
    if (stored === "month" || stored === "week" || stored === "day" || stored === "agenda")
      return stored;
  } catch {
    /* ignore */
  }
  return "month";
}
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

function fallbackEnd(start: Date): Date {
  return new Date(start.getTime() + 60 * 60 * 1000);
}

function toCalendarEvent(source: EventOut): CalendarEvent {
  return {
    id: source.id,
    itemId: source.item_id,
    updatedAt: source.updated_at,
    title: source.title,
    description: source.description ?? undefined,
    start: new Date(source.start_at),
    end: new Date(source.end_at),
    allDay: source.all_day,
    location: source.location ?? undefined,
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
  const [view, setView] = useState<CalendarViewKind>(getStoredCalendarView);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const lastEmittedRangeRef = useRef<{ from: string; to: string } | null>(null);

  const hasAllDayEvents = useMemo(() => events.some((e) => e.all_day), [events]);

  const eventsById = useMemo(() => {
    return new Map(events.map((event) => [event.id, event]));
  }, [events]);

  const fullCalendarEvents = useMemo<EventInput[]>(() => {
    return events.map((event) => ({
      id: event.id,
      title: event.title,
      start: event.start_at,
      end: event.end_at,
      allDay: event.all_day,
      classNames: [
        `event-color-${event.color}`,
        event.is_tracking ? "is-tracking" : "is-standard",
      ],
      extendedProps: {
        updatedAt: event.updated_at,
        color: event.color,
        description: event.description,
        location: event.location,
        itemId: event.item_id,
        allDay: event.all_day,
        is_tracking: event.is_tracking,
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

    const fromKey = format(arg.start, "yyyy-MM-dd");
    const endExclusive = arg.end;
    const toDate = new Date(endExclusive.getTime() - 24 * 60 * 60 * 1000);
    const toKey = format(toDate, "yyyy-MM-dd");

    if (
      lastEmittedRangeRef.current?.from === fromKey &&
      lastEmittedRangeRef.current?.to === toKey
    ) {
      return;
    }
    lastEmittedRangeRef.current = { from: fromKey, to: toKey };

    onRangeChange({
      from: arg.start,
      to: toDate,
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
    try {
      window.localStorage.setItem(CALENDAR_VIEW_STORAGE_KEY, nextView);
    } catch {
      /* ignore */
    }

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
      allDay: arg.allDay,
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
      description: source?.description ?? null,
      start,
      end,
      lastKnownUpdatedAt: source?.updated_at,
      allDay: source?.all_day ?? arg.event.allDay,
      location: source?.location ?? null,
      color: source?.color,
    }).catch((err) => {
      arg.revert();
      toast.error(err instanceof Error ? err.message : "Failed to update moment");
    });
  };

  const handleResize = (arg: EventResizeDoneArg) => {
    const start = arg.event.start ?? new Date();
    const end = arg.event.end ?? fallbackEnd(start);
    const source = eventsById.get(arg.event.id);

    void onUpdate({
      eventId: arg.event.id,
      title: arg.event.title,
      description: source?.description ?? null,
      start,
      end,
      lastKnownUpdatedAt: source?.updated_at,
      allDay: source?.all_day ?? arg.event.allDay,
      location: source?.location ?? null,
      color: source?.color,
    }).catch((err) => {
      arg.revert();
      toast.error(err instanceof Error ? err.message : "Failed to update moment");
    });
  };

  const handleDialogSave = async (event: CalendarEvent): Promise<CalendarEvent> => {
    if (!event.id) {
      try {
        const created = await onCreate({
          title: event.title,
          description: event.description,
          start: event.start,
          end: event.end,
          allDay: event.allDay,
          location: event.location,
          color: event.color,
        });
        return toCalendarEvent(created);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create moment");
        throw err;
      }
    }

    const source = eventsById.get(event.id);
    try {
      const updated = await onUpdate({
        eventId: event.id,
        title: event.title,
        description: event.description,
        start: event.start,
        end: event.end,
        lastKnownUpdatedAt: source?.updated_at,
        allDay: event.allDay,
        location: event.location,
        color: event.color,
      });
      return toCalendarEvent(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update moment");
      throw err;
    }
  };

  const handleDialogDelete = async (eventId: string) => {
    try {
      await onDelete(eventId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete moment");
      throw err;
    }
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
            initialDate={currentDate}
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
            slotLabelFormat={{ hour: "numeric", meridiem: "short", omitZeroMinute: true }}
            slotLabelContent={(arg) => {
              const h = arg.date.getHours();
              const suffix = h >= 12 ? "PM" : "AM";
              const hour = h % 12 || 12;
              return `${hour} ${suffix}`;
            }}
            dayMaxEvents={4}
            dayMaxEventRows={4}
            allDaySlot={hasAllDayEvents}
            select={handleSelect}
            eventClick={handleEventClick}
            eventDrop={handleDrop}
            eventResize={handleResize}
            dayHeaderContent={(arg) => (
              <span className="fc-day-header-label">
                {view === "month"
                  ? format(arg.date, "EEE")
                  : `${format(arg.date, "E")} ${format(arg.date, "d")}`}
              </span>
            )}
            eventClassNames={(arg) => {
              const eventEnd = arg.event.end ?? arg.event.start;
              if (!eventEnd) return [];
              return eventEnd < new Date() ? ["is-past-event"] : [];
            }}
            eventContent={(arg) => {
              const eventEnd = arg.event.end ?? arg.event.start;
              const isPast = !!eventEnd && eventEnd < new Date();
              const isTracking = arg.event.extendedProps?.is_tracking === true;
              return (
                <CalendarEventChip
                  title={arg.event.title}
                  timeText={arg.timeText}
                  isPast={isPast}
                  isTracking={isTracking}
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
