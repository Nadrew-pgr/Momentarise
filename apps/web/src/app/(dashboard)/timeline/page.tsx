"use client";

import { CossCalendarAdapter } from "@/features/calendar/adapters/coss/CossCalendarAdapter";
import { useCalendarController } from "@/features/calendar/core/use-calendar-controller";
import { CalendarPageShell } from "@/features/calendar/ui/CalendarPageShell";

export default function TimelinePage() {
  const controller = useCalendarController();

  return (
    <CalendarPageShell
      error={controller.error}
      isLoading={controller.isLoading}
      isFetching={controller.isFetching}
      onRetry={() => {
        void controller.refetch();
      }}
    >
      <CossCalendarAdapter
        events={controller.events}
        onRangeChange={controller.onRangeChange}
        onCreate={controller.createEvent}
        onUpdate={controller.updateEvent}
        onDelete={controller.deleteEvent}
        onStartTracking={controller.startTracking}
        onStopTracking={controller.stopTracking}
        startHour={controller.startHour}
        endHour={controller.endHour}
        onDisplayHoursChange={controller.updateCalendarPreferences}
        isMutating={controller.isMutating}
      />
    </CalendarPageShell>
  );
}
