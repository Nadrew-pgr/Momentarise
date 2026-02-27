"use client";

import { cn } from "@/lib/utils";

interface CalendarEventChipProps {
  title: string;
  timeText?: string;
  isPast?: boolean;
}

export function CalendarEventChip({ title, timeText, isPast = false }: CalendarEventChipProps) {
  return (
    <div className={cn("fc-event-chip flex min-w-0 flex-col overflow-hidden px-0.5 py-0.5", isPast && "is-past-event")}>
      <span className="truncate text-[10px] opacity-90">{timeText}</span>
      <span className="truncate text-xs font-semibold">{title}</span>
    </div>
  );
}
