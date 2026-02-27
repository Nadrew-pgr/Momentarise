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
  start: Date;
  end: Date;
  color?: EventColor;
}

export interface CalendarUpdateInput {
  eventId: string;
  title?: string;
  start: Date;
  end: Date;
  lastKnownUpdatedAt?: string;
  color?: EventColor;
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
  createEvent: (input: CalendarCreateInput) => Promise<void>;
  updateEvent: (input: CalendarUpdateInput) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  startTracking: (eventId: string) => Promise<void>;
  stopTracking: (eventId: string) => Promise<void>;
}
