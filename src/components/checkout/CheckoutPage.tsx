"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useCartStore } from "@/store/useCartStore";
import { useAddressStore } from "@/store/useAddressStore";
import { useSavedCardsStore } from "@/store/useSavedCardsStore";
import { useStripeCustomerStore } from "@/store/useStripeCustomerStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { getClothingModelConfig } from "@/types/clothing";
import type { Address, OrderItem, SavedCard } from "@/types/order";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatPence(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

interface PendingCheckout {
  items: OrderItem[];
  address: Address;
  subtotal: number;
  delivery: number;
  total: number;
  customerEmail?: string;
  customerName?: string;
  saveCard?: boolean;
  customerId?: string;
}

export const PENDING_CHECKOUT_KEY = "pending-checkout";

// ─── Address form ────────────────────────────────────────────────────────────

type AddressFormData = Omit<Address, "id">;
const EMPTY_FORM: AddressFormData = {
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  postcode: "",
  country: "United Kingdom",
};

function AddressForm({
  onSave,
  onCancel,
}: {
  onSave: (data: AddressFormData) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<AddressFormData>(EMPTY_FORM);

  const field = (key: keyof AddressFormData) => ({
    value: form[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const valid =
    form.fullName.trim() &&
    form.line1.trim() &&
    form.city.trim() &&
    form.postcode.trim() &&
    form.country.trim();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        <Field label="Full name" {...field("fullName")} />
        <Field label="Address line 1" {...field("line1")} />
        <Field label="Address line 2 (optional)" {...field("line2")} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" {...field("city")} />
          <Field label="Postcode" {...field("postcode")} />
        </div>
        <Field label="Country" {...field("country")} />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => valid && onSave(form)}
          disabled={!valid}
          className="flex-1 rounded-full bg-white py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save address
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-full border border-white/10 px-4 py-2.5 text-sm text-zinc-400 transition hover:text-white"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] uppercase tracking-[0.15em] text-zinc-500">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-white/25 focus:bg-white/[0.06]"
      />
    </div>
  );
}

// ─── Address step ────────────────────────────────────────────────────────────

function AddressStep({ onNext }: { onNext: (address: Address) => void }) {
  const { addresses, addAddress, removeAddress } = useAddressStore();
  const [selected, setSelected] = useState<string | null>(
    addresses[0]?.id ?? null
  );
  const [showForm, setShowForm] = useState(addresses.length === 0);

  const handleSave = (data: AddressFormData) => {
    addAddress(data);
    setShowForm(false);
  };

  useEffect(() => {
    if (!selected && addresses.length > 0) setSelected(addresses[0].id);
    if (selected && !addresses.find((a) => a.id === selected))
      setSelected(addresses[0]?.id ?? null);
  }, [addresses, selected]);

  const canContinue = !!selected && !showForm;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-light text-white">
          Delivery address
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Where should we send your order?
        </p>
      </div>

      {addresses.length > 0 && (
        <div className="space-y-2">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              role="button"
              tabIndex={0}
              onClick={() => { setSelected(addr.id); setShowForm(false); }}
              onKeyDown={(e) => e.key === "Enter" && setSelected(addr.id)}
              className={`group w-full cursor-pointer rounded-2xl border p-4 text-left transition ${
                selected === addr.id && !showForm
                  ? "border-white/30 bg-white/[0.06]"
                  : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{addr.fullName}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}
                  </p>
                  <p className="text-xs text-zinc-500">{addr.city}, {addr.postcode}</p>
                  <p className="text-xs text-zinc-600">{addr.country}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {selected === addr.id && !showForm && (
                    <span className="text-xs text-white opacity-60">✓</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeAddress(addr.id); }}
                    className="text-xs text-zinc-700 transition hover:text-red-400"
                    aria-label="Remove address"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <AddressForm
              onSave={handleSave}
              onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
            />
          </motion.div>
        ) : (
          <motion.button
            key="add-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 py-3 text-sm text-zinc-500 transition hover:border-white/20 hover:text-zinc-300"
          >
            <span>+</span> Add new address
          </motion.button>
        )}
      </AnimatePresence>

      {!showForm && (
        <button
          onClick={() => {
            const addr = addresses.find((a) => a.id === selected);
            if (addr) onNext(addr);
          }}
          disabled={!canContinue}
          className="w-full rounded-full bg-white py-3.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
        >
          Continue to payment →
        </button>
      )}
    </div>
  );
}

// ─── Payment form (inside Elements) ─────────────────────────────────────────

const CARD_BRAND_LABELS: Record<string, string> = {
  visa: "Visa", mastercard: "Mastercard", amex: "Amex",
  discover: "Discover", jcb: "JCB", unionpay: "UnionPay", diners: "Diners",
};

function PaymentForm({
  subtotal,
  delivery,
  total,
  address,
  customerEmail,
  customerName,
  clientSecret,
  savedCards,
  onBack,
}: {
  subtotal: number;
  delivery: number;
  total: number;
  address: Address;
  customerEmail?: string;
  customerName?: string;
  clientSecret: string;
  savedCards: SavedCard[];
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { items } = useCartStore();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which card is selected: a PM ID string for saved cards, or "new" for new entry
  const usableSavedCards = savedCards.filter((c) => !!c.stripePaymentMethodId);
  const [selectedPm, setSelectedPm] = useState<string>(
    usableSavedCards[0]?.stripePaymentMethodId ?? "new"
  );
  const isNewCard = selectedPm === "new";
  const isFirstCard = usableSavedCards.length === 0;
  const [saveCard, setSaveCard] = useState(isFirstCard);

  useEffect(() => {
    if (isFirstCard) setSaveCard(true);
  }, [isFirstCard]);

  const buildPending = (orderItems: OrderItem[], customerId?: string): PendingCheckout => ({
    items: orderItems,
    address,
    subtotal,
    delivery,
    total,
    customerEmail,
    customerName,
    saveCard: isNewCard && saveCard,
    customerId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe) return;
    setSubmitting(true);
    setError(null);

    const orderItems: OrderItem[] = items.map((item) => {
      const config = getClothingModelConfig(item.clothingType);
      return {
        clothingType: item.clothingType,
        clothingLabel: item.clothingLabel,
        colorId: item.colorId,
        colorHex: item.colorHex,
        fabricId: item.fabricId,
        designId: item.designId,
        frontPrint: item.frontPrint,
        backPrint: item.backPrint,
        measurements: item.measurements,
        quantity: item.quantity,
        unitPrice: config?.basePrice ?? 0,
      };
    });

    // ── Saved card path ──────────────────────────────────────────────────────
    if (!isNewCard) {
      sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(buildPending(orderItems)));

      // Must use confirmPayment (not confirmCardPayment) for PIs created with
      // automatic_payment_methods. It always redirects to return_url on success,
      // consistent with the new-card path so the success page processes correctly.
      const { error: stripeError } = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
          payment_method: selectedPm,
        },
      });

      if (stripeError) {
        sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
        setError(stripeError.message ?? "Payment failed. Please try again.");
        setSubmitting(false);
      }
      // On success, Stripe redirects to return_url — no router.push needed
      return;
    }

    // ── New card path ────────────────────────────────────────────────────────
    if (!elements) return;

    const pending = buildPending(orderItems);
    sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(pending));

    if (saveCard && customerEmail) {
      try {
        const res = await fetch("/api/stripe/setup-save-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientSecret, customerEmail, customerName }),
        });
        if (res.ok) {
          const { customerId } = await res.json();
          if (customerId) {
            sessionStorage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify({ ...pending, customerId }));
          }
        }
      } catch {
        // Non-fatal
      }
    }

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
        payment_method_data: {
          billing_details: {
            ...(customerName ? { name: customerName } : {}),
            ...(customerEmail ? { email: customerEmail } : {}),
          },
        },
        shipping: {
          name: address.fullName,
          address: {
            line1: address.line1,
            line2: address.line2 ?? undefined,
            city: address.city,
            postal_code: address.postcode,
            country: "GB",
          },
        },
      },
    });

    if (stripeError) {
      sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
      setError(stripeError.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
    } else {
      router.push("/checkout/success");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-2xl font-light text-white">
          Review & pay
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Delivering to {address.fullName}, {address.city}
        </p>
      </div>

      {/* Order summary */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] divide-y divide-white/[0.05]">
        {items.map((item) => {
          const config = getClothingModelConfig(item.clothingType);
          const unitPrice = config?.basePrice ?? 0;
          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div
                className="h-3.5 w-3.5 flex-shrink-0 rounded-full border border-white/20"
                style={{ backgroundColor: item.colorHex }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{item.clothingLabel}</p>
                <p className="text-xs text-zinc-600">Qty {item.quantity}</p>
              </div>
              <p className="text-sm text-white tabular-nums">
                {formatPence(unitPrice * item.quantity)}
              </p>
            </div>
          );
        })}

        <div className="space-y-1.5 px-4 py-3">
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Subtotal</span><span>{formatPence(subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-zinc-500">
            <span>Delivery</span>
            <span>{delivery === 0 ? "Free" : formatPence(delivery)}</span>
          </div>
          <div className="flex justify-between text-sm font-medium text-white pt-1">
            <span>Total</span><span>{formatPence(total)}</span>
          </div>
        </div>
      </div>

      {/* Delivery address summary */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-xs text-zinc-500 space-y-0.5">
        <p className="text-white text-sm font-medium mb-1">{address.fullName}</p>
        <p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
        <p>{address.city}, {address.postcode}</p>
        <p>{address.country}</p>
        <button type="button" onClick={onBack}
          className="mt-2 text-xs text-zinc-600 underline underline-offset-2 transition hover:text-white">
          Change address
        </button>
      </div>

      {/* ── Payment method selection ── */}
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.15em] text-zinc-500">Payment method</p>

        {/* Saved cards */}
        {usableSavedCards.map((card) => {
          const pmId = card.stripePaymentMethodId!;
          const selected = selectedPm === pmId;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => setSelectedPm(pmId)}
              className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                selected
                  ? "border-white/40 bg-white/[0.06]"
                  : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
              }`}
            >
              {/* Radio dot */}
              <div className={`h-4 w-4 flex-shrink-0 rounded-full border-2 transition ${
                selected ? "border-white bg-white" : "border-zinc-600"
              }`}>
                {selected && <div className="m-auto h-1.5 w-1.5 rounded-full bg-zinc-950 mt-[3px] ml-[3px]" />}
              </div>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white flex-shrink-0">
                {CARD_BRAND_LABELS[card.brand] ?? card.brand}
              </span>
              <span className="text-sm text-white">•••• {card.last4}</span>
              <span className="ml-auto text-xs text-zinc-500 flex-shrink-0">
                {String(card.expMonth).padStart(2, "0")}/{String(card.expYear).slice(-2)}
              </span>
            </button>
          );
        })}

        {/* New card option */}
        <button
          type="button"
          onClick={() => setSelectedPm("new")}
          className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
            isNewCard
              ? "border-white/40 bg-white/[0.06]"
              : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
          }`}
        >
          <div className={`h-4 w-4 flex-shrink-0 rounded-full border-2 transition ${
            isNewCard ? "border-white bg-white" : "border-zinc-600"
          }`}>
            {isNewCard && <div className="m-auto h-1.5 w-1.5 rounded-full bg-zinc-950 mt-[3px] ml-[3px]" />}
          </div>
          <span className="text-sm text-white">
            {usableSavedCards.length > 0 ? "Use a different card" : "Enter card details"}
          </span>
        </button>

        {/* PaymentElement — only when entering a new card */}
        <AnimatePresence>
          {isNewCard && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2">
                <PaymentElement options={{ layout: "tabs" }} />
              </div>

              {/* Save card checkbox */}
              <label className={`mt-4 flex items-start gap-3 ${isFirstCard ? "cursor-not-allowed" : "cursor-pointer"}`}>
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={saveCard}
                    disabled={isFirstCard}
                    onChange={(e) => !isFirstCard && setSaveCard(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="h-4 w-4 rounded border border-white/20 bg-white/[0.04] transition peer-checked:border-white peer-checked:bg-white peer-disabled:opacity-60" />
                  {saveCard && (
                    <svg className="pointer-events-none absolute inset-0 m-auto h-2.5 w-2.5 text-zinc-950" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`text-sm ${isFirstCard ? "text-zinc-400" : "text-zinc-300"}`}>
                    Save card for future payments
                    {isFirstCard && <span className="ml-1.5 text-[10px] text-amber-500 uppercase tracking-wide">Required</span>}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {isFirstCard ? "A saved card is required for your first order." : "Securely stored via Stripe"}
                  </p>
                </div>
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <p className="rounded-xl border border-red-800/40 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !stripe || (isNewCard && !elements)}
        className="w-full rounded-full bg-white py-3.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
      >
        {submitting ? "Processing…" : `Place order · ${formatPence(total)}`}
      </button>
    </form>
  );
}

// ─── Payment step (fetches intent, wraps in Elements) ────────────────────────

function PaymentStep({
  address,
  customerEmail,
  customerName,
  onBack,
}: {
  address: Address;
  customerEmail?: string;
  customerName?: string;
  onBack: () => void;
}) {
  const { items } = useCartStore();
  const { customerId, setCustomerId } = useStripeCustomerStore();
  const { cards, syncCards } = useSavedCardsStore();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [pricing, setPricing] = useState<{
    subtotal: number;
    delivery: number;
    total: number;
  } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchIntent = useCallback(async (signal?: AbortSignal) => {
    setFetchError(null);
    try {
      const res = await fetch("/api/checkout/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, customerEmail, customerName, customerId }),
        signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create payment intent");
      setClientSecret(data.clientSecret);
      setPricing({ subtotal: data.subtotal, delivery: data.delivery, total: data.total });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return; // StrictMode cleanup
      setFetchError(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [items, customerEmail, customerName, customerId]);

  // Sync saved cards from Stripe so PaymentForm shows correct "first card" state
  useEffect(() => {
    if (!customerEmail) return;
    const email = encodeURIComponent(customerEmail);
    fetch(`/api/stripe/customer?email=${email}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!data) return;
        if (data.customerId && !customerId) setCustomerId(data.customerId);
        if (Array.isArray(data.cards)) syncCards(data.cards);
      })
      .catch(() => null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerEmail]);

  // Abort on cleanup so React StrictMode's double-invoke doesn't create two PaymentIntents
  useEffect(() => {
    const controller = new AbortController();
    fetchIntent(controller.signal);
    return () => controller.abort();
  }, [fetchIntent]);

  if (fetchError) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-xl border border-red-800/40 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          {fetchError}
        </p>
        <button onClick={() => fetchIntent()} className="text-sm text-zinc-400 underline underline-offset-4 hover:text-white">
          Retry
        </button>
        <button onClick={onBack} className="text-sm text-zinc-600 hover:text-zinc-400">
          ← Back to address
        </button>
      </div>
    );
  }

  if (!clientSecret || !pricing) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        <p className="text-sm text-zinc-500">Preparing payment…</p>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorBackground: "#18181b",
            colorText: "#ffffff",
            colorTextSecondary: "#a1a1aa",
            colorPrimary: "#ffffff",
            borderRadius: "16px",
            fontSizeBase: "14px",
          },
        },
      }}
    >
      <PaymentForm
        subtotal={pricing.subtotal}
        delivery={pricing.delivery}
        total={pricing.total}
        address={address}
        customerEmail={customerEmail}
        customerName={customerName}
        clientSecret={clientSecret}
        savedCards={cards}
        onBack={onBack}
      />
    </Elements>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({
  step,
  onGoToAddress,
}: {
  step: "address" | "payment";
  onGoToAddress: () => void;
}) {
  const steps = [
    { id: "address", label: "Address" },
    { id: "payment", label: "Payment" },
  ];
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const isActive = s.id === step;
        const isPast = s.id === "address" && step === "payment";
        const isClickable = isPast;
        return (
          <div key={s.id} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-6 bg-white/10" />}
            <div
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onClick={isClickable ? onGoToAddress : undefined}
              onKeyDown={isClickable ? (e) => e.key === "Enter" && onGoToAddress() : undefined}
              className={`flex items-center gap-1.5 transition ${
                isActive ? "text-white" : isPast ? "cursor-pointer text-zinc-400 hover:text-white" : "text-zinc-700"
              }`}
            >
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium transition ${
                  isActive
                    ? "bg-white text-zinc-950"
                    : isPast
                    ? "border border-white/20 text-zinc-500"
                    : "border border-white/10 text-zinc-700"
                }`}
              >
                {isPast ? "✓" : i + 1}
              </div>
              <span className="text-xs font-medium">{s.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();
  const { items } = useCartStore();
  const { user, loading } = useAuth();
  const [step, setStep] = useState<"address" | "payment">("address");
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const customerEmail = user?.email ?? undefined;
  const customerName = (user?.user_metadata?.full_name as string | undefined) ?? undefined;

  useEffect(() => {
    if (items.length === 0) router.replace("/");
  }, [items.length, router]);

  if (items.length === 0) return null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-950 px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-zinc-500">
            Drape Studio
          </p>
          <h2 className="font-display text-4xl font-light text-white">
            Sign in to continue
          </h2>
          <p className="text-sm text-zinc-500">
            You need an account to place an order.
          </p>
          <button
            onClick={() =>
              supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                  redirectTo: typeof window !== "undefined"
                    ? `${window.location.origin}/checkout`
                    : "",
                },
              })
            }
            className="mt-2 flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 pb-8 pt-24 md:px-0">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-white"
          >
            ← Back
          </button>
          <StepIndicator
            step={step}
            onGoToAddress={() => setStep("address")}
          />
        </div>

        <AnimatePresence mode="wait">
          {step === "address" ? (
            <motion.div
              key="address"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <AddressStep
                onNext={(addr) => {
                  setSelectedAddress(addr);
                  setStep("payment");
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <PaymentStep
                address={selectedAddress!}
                customerEmail={customerEmail}
                customerName={customerName}
                onBack={() => setStep("address")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
