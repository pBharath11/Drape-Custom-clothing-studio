import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Order } from "@/types/order";

interface OrderStore {
  orders: Order[];
  addOrder: (order: Omit<Order, "id" | "createdAt">) => void;
}

export const useOrderStore = create<OrderStore>()(
  persist(
    (set) => ({
      orders: [],
      addOrder: (order) =>
        set((state) => ({
          orders: [
            { ...order, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
            ...state.orders,
          ],
        })),
    }),
    { name: "clothing-orders" }
  )
);
