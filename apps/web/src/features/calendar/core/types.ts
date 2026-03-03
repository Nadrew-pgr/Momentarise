import type { EventOut } from "@momentarise/shared";
import type { EventColor } from "@momentarise/shared";

export interface CalendarRangeChange {
  from: Date;
  to: Date;
  view?: string;
  currentDate?: Date;
}

export interface CalendarCreateInput {
  title?: string;
  description?: string | null;
  start: Date;
  end: Date;
  allDay?: boolean;
  location?: string | null;
  color?: EventColor;
  rrule?: string;
  seriesId?: string;
  projectId?: string;
}

export interface CalendarUpdateInput {
  eventId: string;
  title?: string;
  description?: string | null;
  start: Date;
  end: Date;
  allDay?: boolean;
  location?: string | null;
  lastKnownUpdatedAt?: string;
  color?: EventColor;
  rrule?: string;
  seriesId?: string;
  projectId?: string;
  updateMode?: "single" | "future" | "all";
}

export interface CalendarController {
  events: EventOut[];
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  isMutating: boolean;
  startHour: number;
  endHour: number;
  visibleRange: { from: string; to: string };
  refetch: () => Promise<unknown>;
  onRangeChange: (range: CalendarRangeChange) => void;
  updateCalendarPreferences: (startHour: number, endHour: number) => Promise<void>;
  createEvent: (input: CalendarCreateInput) => Promise<EventOut>;
  updateEvent: (input: CalendarUpdateInput) => Promise<EventOut>;
  deleteEvent: (eventId: string) => Promise<void>;
  startTracking: (eventId: string) => Promise<void>;
  stopTracking: (eventId: string) => Promise<void>;
}
