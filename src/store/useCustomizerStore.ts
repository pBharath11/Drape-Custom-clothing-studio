import { create } from "zustand";

export interface CustomizerStore {
  frontPrint?: string;
  backPrint?: string;
  colorId: string;
  fabricId: string;
  designId: string;
  setColor: (colorId: string) => void;
  setFabric: (fabricId: string) => void;
  setDesign: (designId: string) => void;
  setFrontPrint: (dataUrl?: string) => void;
  setBackPrint: (dataUrl?: string) => void;
  reset: () => void;
}

export const useCustomizerStore = create<CustomizerStore>((set) => ({
  frontPrint: undefined,
  backPrint: undefined,
  colorId: "black",
  fabricId: "black",
  designId: "none",
  setColor: (colorId) => set({ colorId }),
  setFabric: (fabricId) => set({ fabricId }),
  setDesign: (designId) => set({ designId }),
  setFrontPrint: (frontPrint) => set({ frontPrint }),
  setBackPrint: (backPrint) => set({ backPrint }),
  reset: () =>
    set({
      frontPrint: undefined,
      backPrint: undefined,
      colorId: "black",
      fabricId: "black",
      designId: "none",
    }),
}));
