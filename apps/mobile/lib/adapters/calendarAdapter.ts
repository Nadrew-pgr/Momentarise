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

function toCalendarTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toISOString().slice(0, 10);
  const time = d.toISOString().slice(11, 19).replace("T", " ");
  return `${date} ${time}`;
}

/**
 * Convert API timeline events to the format expected by react-native-calendars TimelineList.
 * events prop: { [date: string]: CalendarEvent[] }
 */
export function eventsToCalendarFormat(
  response: TimelineResponse
): EventsByDate {
  const byDate: EventsByDate = {};
  for (const ev of response.events) {
    const dateKey = response.date;
    if (!byDate[dateKey]) byDate[dateKey] = [];
    byDate[dateKey].push({
      id: ev.id,
      start: toCalendarTime(ev.start_at),
      end: toCalendarTime(ev.end_at),
      title: ev.title,
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
  };
}
