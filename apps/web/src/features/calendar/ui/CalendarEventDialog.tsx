"use client";

import type { ComponentProps } from "react";
import { EventDialog } from "@/components/event-calendar/event-dialog";

export type CalendarEventDialogProps = ComponentProps<typeof EventDialog>;

export function CalendarEventDialog(props: CalendarEventDialogProps) {
  return <EventDialog {...props} />;
}
