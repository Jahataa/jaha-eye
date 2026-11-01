import { create } from "zustand";

type OfficeStore = {
  selectedAgentId: string | null;
  setSelectedAgentId: (agentId: string | null) => void;
  webglAvailable: boolean;
  setWebglAvailable: (available: boolean) => void;
};

export const useOfficeStore = create<OfficeStore>((set) => ({
  selectedAgentId: null,
  setSelectedAgentId: (agentId) => set({ selectedAgentId: agentId }),
  webglAvailable: true,
  setWebglAvailable: (available) => set({ webglAvailable: available }),
}));
