import { create } from "zustand";
import { persist } from "zustand/middleware";

interface StripeCustomerStore {
  customerId: string | null;
  setCustomerId: (id: string) => void;
}

export const useStripeCustomerStore = create<StripeCustomerStore>()(
  persist(
    (set) => ({
      customerId: null,
      setCustomerId: (id) => set({ customerId: id }),
    }),
    { name: "stripe-customer" }
  )
);
