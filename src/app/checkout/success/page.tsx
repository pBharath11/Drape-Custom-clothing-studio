"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { useOrderStore } from "@/store/useOrderStore";
import { supabase } from "@/lib/supabase";
import { useSavedCardsStore } from "@/store/useSavedCardsStore";
import { useStripeCustomerStore } from "@/store/useStripeCustomerStore";
import { PENDING_CHECKOUT_KEY } from "@/components/checkout/CheckoutPage";
import type { Order } from "@/types/order";

function formatPence(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clear } = useCartStore();
  const { addOrder } = useOrderStore();
  const { syncCards } = useSavedCardsStore();
  const { setCustomerId } = useStripeCustomerStore();
  const processedRef = useRef(false);
  const [order, setOrder] = useState<Pick<Order, "total" | "items"> | null>(null);

  useEffect(() => {
    if (processedRef.current) return;

    const raw = sessionStorage.getItem(PENDING_CHECKOUT_KEY);
    if (!raw) return;

    const redirectStatus = searchParams.get("redirect_status");
    const paymentIntentId = searchParams.get("payment_intent") ?? undefined;

    const isSuccess = redirectStatus === "succeeded" || !redirectStatus;
    if (!isSuccess) return;

    processedRef.current = true;

    let saveCard = false;
    let customerId: string | undefined;

    try {
      const pending = JSON.parse(raw);
      saveCard = !!pending.saveCard;
      customerId = pending.customerId;

      const orderId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      addOrder({
        paymentIntentId,
        status: "processing",
        items: pending.items,
        address: pending.address,
        subtotal: pending.subtotal,
        delivery: pending.delivery,
        total: pending.total,
        customerEmail: pending.customerEmail,
        customerName: pending.customerName,
      });
      setOrder({ total: pending.total, items: pending.items });

      // Save order to Supabase (fire-and-forget)
      supabase.auth.getSession().then(({ data: { session } }) => {
        fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            id: orderId,
            paymentIntentId,
            createdAt,
            status: "processing",
            items: pending.items,
            address: pending.address,
            subtotal: pending.subtotal,
            delivery: pending.delivery,
            total: pending.total,
            customerEmail: pending.customerEmail ?? null,
            customerName: pending.customerName ?? null,
          }),
        }).catch(() => null);
      }).catch(() => null);

      // Send confirmation email (fire-and-forget)
      if (pending.customerEmail) {
        fetch("/api/emails/order-confirmation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order: {
              id: orderId,
              paymentIntentId,
              createdAt,
              status: "processing",
              items: pending.items,
              address: pending.address,
              subtotal: pending.subtotal,
              delivery: pending.delivery,
              total: pending.total,
              customerEmail: pending.customerEmail,
              customerName: pending.customerName,
            },
          }),
        }).catch(() => null);
      }
    } catch {
      // Malformed session data — still show success
    }

    clear();
    sessionStorage.removeItem(PENDING_CHECKOUT_KEY);

    if (!saveCard) return;

    if (customerId) {
      // Persist the Customer ID for future Payment tab syncs
      setCustomerId(customerId);
      // Sync all saved cards for this customer from Stripe
      fetch(`/api/stripe/payment-methods?customerId=${customerId}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => { if (data?.cards) syncCards(data.cards); })
        .catch(() => null);
    } else if (paymentIntentId) {
      // Fallback: retrieve the single card from the PaymentIntent
      fetch("/api/checkout/get-payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIntentId }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((card) => {
          if (card?.last4) {
            syncCards([{
              stripePaymentMethodId: undefined,
              brand: card.brand,
              last4: card.last4,
              expMonth: card.expMonth,
              expYear: card.expYear,
            }]);
          }
        })
        .catch(() => null);
    }
  }, [searchParams, addOrder, clear, syncCards, setCustomerId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-2xl text-emerald-400">
        ✓
      </div>
      <h1 className="font-display text-4xl font-light text-white">
        Order placed
      </h1>
      {order && (
        <p className="mt-2 text-sm font-medium text-white">
          {formatPence(order.total)}
          <span className="ml-1.5 text-zinc-500">
            · {order.items.reduce((s, i) => s + i.quantity, 0)} item
            {order.items.reduce((s, i) => s + i.quantity, 0) !== 1 ? "s" : ""}
          </span>
        </p>
      )}
      <p className="mt-3 max-w-[300px] text-sm text-zinc-500">
        We'll send a confirmation email and keep you updated as your order
        moves to production.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100"
        >
          Back to shop
        </button>
        <button
          onClick={() => router.push("/?openProfile=orders")}
          className="text-sm text-zinc-500 underline underline-offset-4 transition hover:text-white"
        >
          View your orders →
        </button>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
