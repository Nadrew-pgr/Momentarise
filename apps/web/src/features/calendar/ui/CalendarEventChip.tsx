"use client";

import { cn } from "@/lib/utils";

interface CalendarEventChipProps {
  title: string;
  timeText?: string;
  isPast?: boolean;
  isTracking?: boolean;
}

/** Parity with Coss EventItem. One line to use full card width; title first (priority), then time. */
export function CalendarEventChip({
  title,
  timeText,
  isPast = false,
  isTracking = false,
}: CalendarEventChipProps) {
  return (
    <div
      className={cn(
        "fc-event-chip flex h-full w-full min-h-0 min-w-0 items-center overflow-hidden px-1 py-0.5 sm:px-2",
        isPast && "is-past-event",
        isTracking && "is-tracking"
      )}
    >
      <span className="min-w-0 flex-1 truncate text-[10px] sm:text-[11px]">
        <span className="font-medium">{title}</span>
        {timeText ? (
          <span className="ml-1 font-normal opacity-70">· {timeText}</span>
        ) : null}
      </span>
    </div>
  );
}
