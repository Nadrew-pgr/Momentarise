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
  open: () => void;
  close: () => void;
}

export const useCreateSheet = create<CreateSheetState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

interface ItemDetailSheetState {
  itemId: string | null;
  open: (itemId: string) => void;
  close: () => void;
}

export const useItemDetailSheet = create<ItemDetailSheetState>((set) => ({
  itemId: null,
  open: (itemId) => set({ itemId }),
  close: () => set({ itemId: null }),
}));
