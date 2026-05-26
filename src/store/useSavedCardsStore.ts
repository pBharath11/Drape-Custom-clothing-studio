import { create } from "zustand";
import type { SavedCard } from "@/types/order";

type StripeCard = Omit<SavedCard, "id" | "addedAt">;

interface SavedCardsStore {
  cards: SavedCard[];
  addCard: (card: StripeCard) => void;
  /** Replace the local list with the authoritative Stripe-fetched list */
  syncCards: (stripeCards: StripeCard[]) => void;
  removeCard: (id: string) => void;
}

export const useSavedCardsStore = create<SavedCardsStore>()((set) => ({
  cards: [],
  addCard: (card) =>
    set((state) => {
      if (
        card.stripePaymentMethodId &&
        state.cards.some((c) => c.stripePaymentMethodId === card.stripePaymentMethodId)
      ) {
        return state;
      }
      return {
        cards: [
          {
            ...card,
            id: card.stripePaymentMethodId ?? crypto.randomUUID(),
            addedAt: new Date().toISOString(),
          },
          ...state.cards,
        ],
      };
    }),
  syncCards: (stripeCards) =>
    set({
      cards: stripeCards.map((card) => ({
        ...card,
        id: card.stripePaymentMethodId ?? crypto.randomUUID(),
        addedAt: new Date().toISOString(),
      })),
    }),
  removeCard: (id) =>
    set((state) => ({ cards: state.cards.filter((c) => c.id !== id) })),
}));
