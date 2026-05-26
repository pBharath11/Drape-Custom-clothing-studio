import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Address } from "@/types/order";

interface AddressStore {
  addresses: Address[];
  addAddress: (address: Omit<Address, "id">) => void;
  removeAddress: (id: string) => void;
  setAddresses: (addresses: Address[]) => void;
}

export const useAddressStore = create<AddressStore>()(
  persist(
    (set) => ({
      addresses: [],
      addAddress: (address) =>
        set((state) => ({
          addresses: [...state.addresses, { ...address, id: crypto.randomUUID() }],
        })),
      removeAddress: (id) =>
        set((state) => ({
          addresses: state.addresses.filter((a) => a.id !== id),
        })),
      setAddresses: (addresses) => set({ addresses }),
    }),
    { name: "clothing-addresses" }
  )
);
