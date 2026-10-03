import { create } from "zustand";

interface UiState {
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedAgentId: null,
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
}));
