export type CalendarView = "month" | "week" | "day" | "agenda";

export interface CalendarEvent {
  id: string;
  itemId?: string;
  updatedAt?: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: EventColor;
  location?: string;
  isTracking?: boolean;
}

export type EventColor =
  | "sky"
  | "amber"
  | "violet"
  | "rose"
  | "emerald"
  | "orange";
