import { create } from "zustand";
import type { CalendarEvent } from "@/components/event-calendar/types";

interface EventDialogState {
  isOpen: boolean;
  event: CalendarEvent | null;
  isTrackingActionPending: boolean;
  onClose: () => void;
  onSave?: (event: CalendarEvent) => Promise<CalendarEvent>;
  onDelete?: (eventId: string) => Promise<void>;
  onToggleTracking?: (eventId: string) => void;
}

interface EventDialogStore extends EventDialogState {
  open: (
    event: CalendarEvent,
    callbacks: {
      onSave: (event: CalendarEvent) => Promise<CalendarEvent>;
      onDelete: (eventId: string) => Promise<void>;
      onToggleTracking?: (eventId: string) => void;
    }
  ) => void;
  close: () => void;
  setTrackingActionPending: (pending: boolean) => void;
}

export const useEventDialog = create<EventDialogStore>((set) => ({
  isOpen: false,
  event: null,
  isTrackingActionPending: false,
  onSave: undefined,
  onDelete: undefined,
  onToggleTracking: undefined,
  onClose: () => set({ isOpen: false, event: null }),
  open: (event, callbacks) =>
    set({
      isOpen: true,
      event,
      ...callbacks,
    }),
  close: () => set({ isOpen: false, event: null }),
  setTrackingActionPending: (pending) => set({ isTrackingActionPending: pending }),
}));
