import type { EventOut, TimelineResponse } from "@momentarise/shared";

export interface CalendarEvent {
  id?: string;
  start: string;
  end: string;
  title: string;
  summary?: string;
  color?: string;
}

/**
 * Map of date (YYYY-MM-DD) to array of events in react-native-calendars format.
 */
export type EventsByDate = Record<string, CalendarEvent[]>;

const EVENT_COLOR_MAP: Record<
  EventOut["color"],
  string
> = {
  sky: "#38bdf8",
  amber: "#f59e0b",
  violet: "#8b5cf6",
  rose: "#f43f5e",
  emerald: "#10b981",
  orange: "#f97316",
};

function toCalendarTime(iso: string): string {
  const d = new Date(iso);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(
    2,
    "0"
  )}:${String(d.getSeconds()).padStart(2, "0")}`;
  return `${date} ${time}`;
}

function toLocalDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/**
 * Convert API timeline events to the format expected by react-native-calendars TimelineList.
 * events prop: { [date: string]: CalendarEvent[] }
 */
export function eventsToCalendarFormat(
  response: TimelineResponse
): EventsByDate {
  const byDate: EventsByDate = { [response.date]: [] };
  for (const ev of response.events) {
    const dateKey = toLocalDateKey(ev.start_at);
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push({
      id: ev.id,
      start: toCalendarTime(ev.start_at),
      end: toCalendarTime(ev.end_at),
      title: ev.title,
      color: EVENT_COLOR_MAP[ev.color],
    });
  }
  return byDate;
}

/**
 * Convert a single API EventOut to CalendarEvent (e.g. for custom list rendering).
 */
export function eventToCalendarEvent(ev: EventOut): CalendarEvent {
  return {
    id: ev.id,
    start: toCalendarTime(ev.start_at),
    end: toCalendarTime(ev.end_at),
    title: ev.title,
    color: EVENT_COLOR_MAP[ev.color],
  };
}
