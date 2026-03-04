import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";

export type CalendarViewKind = "month" | "week" | "day" | "agenda";

export function getCalendarViewTitle(date: Date, view: CalendarViewKind): string {
  if (view === "month") return format(date, "MMMM yyyy");

  if (view === "week") {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });
    if (isSameMonth(start, end)) return format(start, "MMMM yyyy");
    return `${format(start, "MMM")} - ${format(end, "MMM yyyy")}`;
  }

  if (view === "day") return format(date, "EEE MMMM d, yyyy");

  const agendaEnd = addDays(date, 29);
  if (isSameMonth(date, agendaEnd)) return format(date, "MMMM yyyy");
  return `${format(date, "MMM")} - ${format(agendaEnd, "MMM yyyy")}`;
}

export function getRangeForCalendarView(date: Date, view: CalendarViewKind): {
  from: Date;
  to: Date;
} {
  if (view === "month") {
    return {
      from: startOfWeek(startOfMonth(date), { weekStartsOn: 1 }),
      to: endOfWeek(endOfMonth(date), { weekStartsOn: 1 }),
    };
  }

  if (view === "week") {
    return {
      from: startOfWeek(date, { weekStartsOn: 1 }),
      to: endOfWeek(date, { weekStartsOn: 1 }),
    };
  }

  if (view === "day") {
    return {
      from: date,
      to: date,
    };
  }

  return {
    from: date,
    to: addDays(date, 29),
  };
}

export function shiftCalendarDate(date: Date, view: CalendarViewKind, direction: "prev" | "next"): Date {
  if (view === "month") return direction === "next" ? addMonths(date, 1) : subMonths(date, 1);
  if (view === "week") return direction === "next" ? addWeeks(date, 1) : subWeeks(date, 1);
  if (view === "day") return direction === "next" ? addDays(date, 1) : addDays(date, -1);
  return direction === "next" ? addDays(date, 30) : addDays(date, -30);
}

export function fullCalendarViewFrom(view: CalendarViewKind): "dayGridMonth" | "timeGridWeek" | "timeGridDay" {
  if (view === "month") return "dayGridMonth";
  if (view === "week") return "timeGridWeek";
  return "timeGridDay";
}
