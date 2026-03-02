"use client";

import { cn } from "@/lib/utils";
import { getEventColorClasses } from "@/components/event-calendar/utils";

interface CalendarEventChipProps {
  title: string;
  timeText?: string;
  isPast?: boolean;
  isTracking?: boolean;
  color?: string;
  viewType?: string;
  durationMinutes?: number;
  isAllDay?: boolean;
}

export function CalendarEventChip({
  title,
  timeText,
  isPast = false,
  isTracking = false,
  color,
  viewType,
  durationMinutes = 60,
  isAllDay = false,
}: CalendarEventChipProps) {
  const isMonthView = viewType === "dayGridMonth";

  if (isMonthView || isAllDay) {
    return (
      <div
        className={cn(
          "fc-event-chip flex size-full select-none items-center overflow-hidden px-1 text-left text-[10px] font-medium outline-none sm:px-2 sm:text-xs",
          getEventColorClasses(color),
          isPast && "is-past-event opacity-70 line-through",
          isTracking && "is-tracking shadow-[inset_0_0_0_1px_rgba(5,150,105,0.45)]"
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {timeText && !isAllDay ? (
            <span className="truncate font-normal opacity-70 sm:text-[11px]">
              {timeText}{" "}
            </span>
          ) : null}
          {title}
        </span>
      </div>
    );
  }

  // Time grid views (Week/Day)
  return (
    <div
      className={cn(
        "fc-event-chip flex size-full select-none overflow-hidden px-1 py-1 text-left font-medium outline-none backdrop-blur-md sm:px-2",
        durationMinutes < 45 ? "items-center" : "flex-col",
        viewType === "timeGridWeek" ? "text-[10px] sm:text-xs" : "text-xs",
        getEventColorClasses(color),
        isPast && "is-past-event opacity-70 line-through",
        isTracking && "is-tracking shadow-[inset_0_0_0_1px_rgba(5,150,105,0.45)]"
      )}
    >
      {durationMinutes < 45 ? (
        <div className="truncate">
          {title}{" "}
          {timeText && (
            <span className="opacity-70">{timeText}</span>
          )}
        </div>
      ) : (
        <>
          <div className="truncate font-medium">{title}</div>
          {timeText && (
            <div className="truncate font-normal opacity-70 sm:text-[11px]">
              {timeText}
            </div>
          )}
        </>
      )}
    </div>
  );
}
