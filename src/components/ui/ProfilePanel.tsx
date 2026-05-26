"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";
import { useAddressStore } from "@/store/useAddressStore";
import { useOrderStore } from "@/store/useOrderStore";
import { useSavedCardsStore } from "@/store/useSavedCardsStore";
import { useStripeCustomerStore } from "@/store/useStripeCustomerStore";
import { supabase } from "@/lib/supabase";
import type { Address } from "@/types/order";
import type { OrderWithHistory } from "@/app/api/orders/route";

type Tab = "profile" | "orders" | "addresses" | "payment";

const TABS: { id: Tab; label: string }[] = [
  { id: "profile",   label: "Profile"   },
  { id: "orders",    label: "Orders"    },
  { id: "addresses", label: "Addresses" },
  { id: "payment",   label: "Payment"   },
];

const ORDER_STATUSES: Record<string, { label: string; color: string }> = {
  processing:    { label: "Processing",    color: "bg-zinc-700 text-zinc-300" },
  confirmed:     { label: "Confirmed",     color: "bg-blue-900/60 text-blue-300" },
  in_production: { label: "In Production", color: "bg-amber-900/60 text-amber-300" },
  shipped:       { label: "Shipped",       color: "bg-purple-900/60 text-purple-300" },
  delivered:     { label: "Delivered",     color: "bg-emerald-900/60 text-emerald-300" },
  cancelled:     { label: "Cancelled",     color: "bg-red-900/60 text-red-300" },
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function Avatar({ user }: { user: NonNullable<ReturnType<typeof useAuth>["user"]> }) {
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const name = (user.user_metadata?.full_name ?? user.email ?? "U") as string;
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={56}
        height={56}
        className="h-14 w-14 rounded-full border border-white/10 object-cover"
      />
    );
  }
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-700 text-lg font-medium text-white">
      {initials}
    </div>
  );
}

function SignedOutView({ onSignIn, configured }: { onSignIn: () => void; configured: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-3xl text-zinc-600">
        ○
      </div>
      <h3 className="font-display text-xl font-light text-white">
        {configured ? "Sign in to continue" : "Auth not configured"}
      </h3>
      <p className="mt-2 max-w-[240px] text-sm text-zinc-500">
        {configured
          ? "Access your orders, saved addresses and payment methods."
          : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local."}
      </p>
      {configured && (
        <button
          onClick={onSignIn}
          className="mt-8 flex items-center gap-3 rounded-full border border-white/10 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100"
        >
          <GoogleIcon />
          Sign in with Google
        </button>
      )}
      <p className="mt-6 text-xs text-zinc-700">
        Your cart is saved locally and will sync when you sign in.
      </p>
    </div>
  );
}

function ProfileTab({ user, onSignOut }: { user: NonNullable<ReturnType<typeof useAuth>["user"]>; onSignOut: () => void }) {
  const name = (user.user_metadata?.full_name ?? "—") as string;
  const email = user.email ?? "—";
  const createdAt = new Date(user.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Avatar user={user} />
        <div>
          <p className="text-base font-medium text-white">{name}</p>
          <p className="text-sm text-zinc-500">{email}</p>
          <p className="mt-0.5 text-xs text-zinc-700">Member since {createdAt}</p>
        </div>
      </div>
      <div className="h-px bg-white/[0.06]" />
      <button
        onClick={onSignOut}
        className="w-full rounded-full border border-white/10 bg-white/[0.04] py-2.5 text-sm text-zinc-400 transition hover:border-white/20 hover:text-white"
      >
        Sign out
      </button>
    </div>
  );
}

function OrdersTab({ userId }: { userId: string }) {
  const { orders: localOrders } = useOrderStore();
  const [orders, setOrders] = useState<OrderWithHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch("/api/orders", {
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setOrders(data.orders ?? []);
          return;
        }
      } catch { /* ignore */ }
      if (!cancelled) setOrders(localOrders.map((o) => ({ ...o, statusHistory: [] })));
    })().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-3 text-3xl opacity-20">◻</div>
        <p className="text-sm font-medium text-white">No orders yet</p>
        <p className="mt-1 text-xs text-zinc-600">
          Orders will appear here once you place them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-6">
      {orders.map((order) => {
        const status = ORDER_STATUSES[order.status];
        const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
        const summary = order.items
          .map((i) => `${i.quantity}× ${i.clothingLabel}`)
          .join(", ");
        const date = new Date(order.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        return (
          <div
            key={order.id}
            className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-zinc-600">{date}</p>
                <p className="mt-0.5 text-sm font-medium text-white truncate max-w-[200px]">
                  {summary}
                </p>
                <p className="text-xs text-zinc-500">
                  {itemCount} item{itemCount !== 1 ? "s" : ""} ·{" "}
                  £{(order.total / 100).toFixed(2)}
                </p>
              </div>
              <span
                className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${status?.color ?? "bg-zinc-700 text-zinc-300"}`}
              >
                {status?.label ?? order.status}
              </span>
            </div>

            <div className="flex gap-1.5">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  className="h-3 w-3 rounded-full border border-white/20"
                  style={{ backgroundColor: item.colorHex }}
                  title={item.clothingLabel}
                />
              ))}
            </div>

            {order.address && (
              <p className="text-xs text-zinc-600">
                {order.address.city}, {order.address.postcode}
              </p>
            )}

            {order.statusHistory.length > 0 && (
              <div className="space-y-1 border-t border-white/[0.05] pt-2.5">
                {order.statusHistory.map((entry, idx) => {
                  const s = ORDER_STATUSES[entry.status];
                  const entryDate = new Date(entry.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short",
                  });
                  const isLatest = idx === order.statusHistory.length - 1;
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${isLatest ? "bg-white/60" : "bg-white/20"}`} />
                      <span className={`text-[11px] ${isLatest ? "text-zinc-400" : "text-zinc-600"}`}>
                        {s?.label ?? entry.status}
                      </span>
                      <span className="ml-auto text-[10px] text-zinc-700">{entryDate}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

type AddressFormData = Omit<Address, "id">;
const EMPTY_FORM: AddressFormData = {
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  postcode: "",
  country: "United Kingdom",
};

function AddressField({
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
      <label className="mb-1 block text-[11px] uppercase tracking-[0.15em] text-zinc-600">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20 focus:bg-white/[0.06]"
      />
    </div>
  );
}

function AddressesTab({ userId }: { userId: string }) {
  const { addresses, setAddresses } = useAddressStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddressFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/addresses", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses ?? []);
      }
    })().catch(() => null);
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const getAuthHeader = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : {};
  };

  const field = (key: keyof AddressFormData) => ({
    value: form[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const valid =
    form.fullName.trim() && form.line1.trim() && form.city.trim() &&
    form.postcode.trim() && form.country.trim();

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const authHeader = await getAuthHeader();
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses([...addresses, data.address]);
      }
    } catch { /* ignore */ } finally {
      setSaving(false);
      setForm(EMPTY_FORM);
      setShowForm(false);
    }
  };

  const handleRemove = async (id: string) => {
    setAddresses(addresses.filter((a) => a.id !== id));
    const authHeader = await getAuthHeader();
    fetch(`/api/addresses/${id}`, { method: "DELETE", headers: authHeader }).catch(() => null);
  };

  return (
    <div className="p-6 space-y-4">
      <button
        onClick={() => setShowForm((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 py-3 text-sm text-zinc-500 transition hover:border-white/20 hover:text-zinc-300"
      >
        <span>+</span> Add address
      </button>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pb-2">
              <AddressField label="Full name" {...field("fullName")} />
              <AddressField label="Address line 1" {...field("line1")} />
              <AddressField label="Address line 2 (optional)" {...field("line2")} />
              <div className="grid grid-cols-2 gap-3">
                <AddressField label="City" {...field("city")} />
                <AddressField label="Postcode" {...field("postcode")} />
              </div>
              <AddressField label="Country" {...field("country")} />
              <button
                onClick={handleSave}
                disabled={!valid || saving}
                className="w-full rounded-full bg-white py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save address"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {addresses.length === 0 && !showForm && (
        <div className="flex flex-col items-center py-8 text-center">
          <p className="text-sm text-zinc-600">No saved addresses yet.</p>
          <p className="mt-1 text-xs text-zinc-700">
            Add one above or complete a checkout.
          </p>
        </div>
      )}

      {addresses.map((addr) => (
        <div
          key={addr.id}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm">
              <p className="font-medium text-white">{addr.fullName}</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}
              </p>
              <p className="text-xs text-zinc-500">{addr.city}, {addr.postcode}</p>
              <p className="text-xs text-zinc-600">{addr.country}</p>
            </div>
            <button
              onClick={() => handleRemove(addr.id)}
              className="text-zinc-700 transition hover:text-red-400"
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const CARD_BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
  jcb: "JCB",
  unionpay: "UnionPay",
  diners: "Diners",
};

function CardBrandPill({ brand }: { brand: string }) {
  return (
    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
      {CARD_BRAND_LABELS[brand] ?? brand}
    </span>
  );
}

function PaymentTab({ userEmail }: { userEmail: string }) {
  const { cards, syncCards, removeCard } = useSavedCardsStore();
  const { customerId, setCustomerId } = useStripeCustomerStore();
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    if (!userEmail) return;
    fetchedRef.current = true;
    setLoading(true);

    (async () => {
      try {
        if (customerId) {
          const res = await fetch(`/api/stripe/payment-methods?customerId=${customerId}`);
          const data = res.ok ? await res.json() : null;
          if (data?.cards?.length > 0) {
            syncCards(data.cards);
            return;
          }
        }
        const res = await fetch(`/api/stripe/customer?email=${encodeURIComponent(userEmail)}`);
        const data = res.ok ? await res.json() : null;
        if (data?.customerId) setCustomerId(data.customerId);
        if (Array.isArray(data?.cards)) syncCards(data.cards);
      } catch {
        // ignore network errors
      } finally {
        setLoading(false);
      }
    })();
  }, [userEmail, customerId, syncCards, setCustomerId]);

  const handleDelete = async (localId: string, stripeId?: string) => {
    if (cards.length <= 1) return;
    setDeletingId(localId);
    try {
      if (stripeId) {
        await fetch("/api/stripe/detach-payment-method", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentMethodId: stripeId }),
        });
      }
      removeCard(localId);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      {cards.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="mb-3 text-3xl opacity-20">▭</div>
          <p className="text-sm text-zinc-600">No saved cards yet.</p>
          <p className="mt-1 text-xs text-zinc-700">
            Tick "Save card" during checkout to store a card here.
          </p>
        </div>
      ) : (
        <>
          {cards.map((card) => {
            const isLast = cards.length <= 1;
            const isDeleting = deletingId === card.id;
            return (
              <div
                key={card.id}
                className="flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <CardBrandPill brand={card.brand} />
                  <div>
                    <p className="text-sm text-white">
                      •••• •••• •••• {card.last4}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Expires {String(card.expMonth).padStart(2, "0")}/
                      {String(card.expYear).slice(-2)}
                    </p>
                  </div>
                </div>
                <div className="relative group/del flex-shrink-0">
                  <button
                    onClick={() => handleDelete(card.id, card.stripePaymentMethodId)}
                    disabled={isLast || isDeleting}
                    className={`text-sm transition ${
                      isLast
                        ? "cursor-not-allowed text-zinc-800"
                        : isDeleting
                        ? "text-zinc-600"
                        : "text-zinc-700 hover:text-red-400"
                    }`}
                    aria-label="Remove card"
                  >
                    {isDeleting ? "…" : "×"}
                  </button>
                  {isLast && (
                    <div className="pointer-events-none absolute right-full top-1/2 mr-2 -translate-y-1/2 whitespace-nowrap rounded-xl border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-400 opacity-0 transition group-hover/del:opacity-100">
                      Keep at least 1 card
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <p className="pt-1 text-center text-[10px] text-zinc-700">
            Cards are synced securely from Stripe
          </p>
        </>
      )}
    </div>
  );
}

export default function ProfilePanel({
  onClose,
  initialTab = "profile",
}: {
  onClose: () => void;
  initialTab?: Tab;
}) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const { user, loading, configured, signInWithGoogle, signOut } = useAuth();

  return (
    <>
      <motion.div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.aside
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[400px] flex-col border-l border-white/10 bg-zinc-950"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
          <h2 className="font-display text-2xl font-light text-white">Account</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:border-white/20 hover:text-white"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-sm text-zinc-600">Loading…</div>
          </div>
        ) : !user ? (
          <SignedOutView onSignIn={signInWithGoogle} configured={configured} />
        ) : (
          <>
            {/* Tab bar */}
            <div className="flex border-b border-white/[0.07] px-4">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-3 py-3.5 text-xs font-medium transition ${
                    activeTab === tab.id ? "text-white" : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-px bg-white"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  {activeTab === "profile"   && <ProfileTab user={user} onSignOut={signOut} />}
                  {activeTab === "orders"    && <OrdersTab userId={user.id} />}
                  {activeTab === "addresses" && <AddressesTab userId={user.id} />}
                  {activeTab === "payment"   && <PaymentTab userEmail={user.email ?? ""} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.aside>
    </>
  );
}
