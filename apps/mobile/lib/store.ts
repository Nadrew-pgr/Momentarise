import { create } from "zustand";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuthenticated: (value: boolean) => void;
  setLoading: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setLoading: (value) => set({ isLoading: value }),
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
