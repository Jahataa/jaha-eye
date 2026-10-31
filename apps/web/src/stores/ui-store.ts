import { create } from "zustand";

export type DocsDrawerState = {
  slug: string;
  anchor?: string;
};

interface UiState {
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;
  activity: string | null;
  setActivity: (activity: string | null) => void;
  docsDrawer: DocsDrawerState | null;
  openDocDrawer: (target: DocsDrawerState) => void;
  closeDocDrawer: () => void;
  docsSearchOpen: boolean;
  setDocsSearchOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedAgentId: null,
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
  activity: null,
  setActivity: (activity) => set({ activity }),
  docsDrawer: null,
  openDocDrawer: (target) => set({ docsDrawer: { ...target } }),
  closeDocDrawer: () => set({ docsDrawer: null }),
  docsSearchOpen: false,
  setDocsSearchOpen: (open) => set({ docsSearchOpen: open }),
}));
