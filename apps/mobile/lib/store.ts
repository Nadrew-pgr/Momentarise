import { create } from "zustand";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setHasCompletedOnboarding: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  hasCompletedOnboarding: false,
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setLoading: (value) => set({ isLoading: value }),
  setHasCompletedOnboarding: (value) => set({ hasCompletedOnboarding: value }),
}));

interface CreateSheetState {
  isOpen: boolean;
  openNonce: number;
  open: () => void;
  close: () => void;
}

export const useCreateSheet = create<CreateSheetState>((set) => ({
  isOpen: false,
  openNonce: 0,
  open: () =>
    set((state) => ({
      isOpen: true,
      openNonce: state.openNonce + 1,
    })),
  close: () => set({ isOpen: false }),
}));

export type DraftEvent = {
  id?: string;
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: "sky" | "amber" | "violet" | "rose" | "emerald" | "orange";
  isTracking?: boolean;
  updatedAt?: string | null;
};

interface EventSheetState {
  isOpen: boolean;
  openNonce: number;
  draftEvent: DraftEvent | null;
  open: (draft: DraftEvent) => void;
  close: () => void;
}

export const useEventSheet = create<EventSheetState>((set) => ({
  isOpen: false,
  openNonce: 0,
  draftEvent: null,
  open: (draft) =>
    set((state) => ({
      isOpen: true,
      openNonce: state.openNonce + 1,
      draftEvent: draft,
    })),
  close: () => set({ isOpen: false }),
}));

interface AppToastState {
  visible: boolean;
  message: string;
  actionLabel: string | null;
  onAction: (() => void) | null;
  show: (params: {
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  }) => void;
  hide: () => void;
}

export const useAppToast = create<AppToastState>((set) => ({
  visible: false,
  message: "",
  actionLabel: null,
  onAction: null,
  show: ({ message, actionLabel, onAction }) =>
    set({
      visible: true,
      message,
      actionLabel: actionLabel ?? null,
      onAction: onAction ?? null,
    }),
  hide: () =>
    set({
      visible: false,
      message: "",
      actionLabel: null,
      onAction: null,
    }),
}));
