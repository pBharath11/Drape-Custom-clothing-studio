import { create } from "zustand";

interface TransitionState {
  active: boolean;
  rect: DOMRect | null;
  href: string;
  modelBasePath: string;
  modelFilename: string;
  begin: (rect: DOMRect, href: string, modelBasePath: string, modelFilename: string) => void;
  clear: () => void;
}

export const useTransitionStore = create<TransitionState>((set) => ({
  active: false,
  rect: null,
  href: "",
  modelBasePath: "",
  modelFilename: "",
  begin: (rect, href, modelBasePath, modelFilename) =>
    set({ active: true, rect, href, modelBasePath, modelFilename }),
  clear: () => set({ active: false, rect: null, href: "", modelBasePath: "", modelFilename: "" }),
}));
