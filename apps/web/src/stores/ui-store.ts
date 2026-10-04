import { create } from "zustand";

interface UiState {
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;
  activity: string | null;
  setActivity: (activity: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedAgentId: null,
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  activity: null,
  setActivity: (activity) => set({ activity }),
}));
