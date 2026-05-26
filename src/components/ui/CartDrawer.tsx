"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/useCartStore";
import { getClothingModelConfig } from "@/types/clothing";
import type { CartItem } from "@/types/order";

interface Props {
  onClose: () => void;
}

function MeasurementRow({ item }: { item: CartItem }) {
  const { chest, waist, hips, length, shoulder, unit } = item.measurements;
  const pairs = [
    ["Chest", chest],
    ["Waist", waist],
    ["Hips", hips],
    ["Length", length],
    ["Shoulder", shoulder],
  ] as const;
  return (
    <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
      <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-zinc-600">
        Measurements ({unit})
      </p>
      <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
        {pairs.map(([label, val]) => (
          <div key={label}>
            <p className="text-[10px] text-zinc-600">{label}</p>
            <p className="text-sm font-light text-white">
              {val}
              <span className="text-xs text-zinc-600"> {unit}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CartItemCard({
  item,
  onRemove,
}: {
  item: CartItem;
  onRemove: () => void;
}) {
  const config = getClothingModelConfig(item.clothingType);
  const colorLabel =
    config?.colorOptions.find((c) => c.id === item.colorId)?.label ?? item.colorId;
  const fabricLabel =
    config?.fabricOptions.find((f) => f.id === item.fabricId)?.label ?? item.fabricId;
  const designLabel =
    config?.designOptions.find((d) => d.id === item.designId)?.label ?? item.designId;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-4"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="h-4 w-4 flex-shrink-0 rounded-full border border-white/20"
            style={{ backgroundColor: item.colorHex }}
          />
          <span className="text-sm font-medium text-white">{item.clothingLabel}</span>
        </div>
        <button
          onClick={onRemove}
          className="flex-shrink-0 text-zinc-600 transition hover:text-white"
          aria-label="Remove item"
        >
          ×
        </button>
      </div>

      {/* Options row */}
      <p className="mt-2 text-xs text-zinc-500">
        {colorLabel}
        {designLabel !== "None" && ` · ${designLabel}`}
        {` · ${fabricLabel}`}
      </p>

      {/* Print thumbnails */}
      {(item.frontPrint || item.backPrint) && (
        <div className="mt-3 flex gap-2">
          {item.frontPrint && (
            <div className="space-y-1">
              <p className="text-[10px] text-zinc-600">Front print</p>
              <img
                src={item.frontPrint}
                alt="Front print"
                className="h-12 w-12 rounded-xl border border-white/10 object-contain bg-white/5"
              />
            </div>
          )}
          {item.backPrint && (
            <div className="space-y-1">
              <p className="text-[10px] text-zinc-600">Back print</p>
              <img
                src={item.backPrint}
                alt="Back print"
                className="h-12 w-12 rounded-xl border border-white/10 object-contain bg-white/5"
              />
            </div>
          )}
        </div>
      )}

      <MeasurementRow item={item} />
    </motion.div>
  );
}

export default function CartDrawer({ onClose }: Props) {
  const { items, removeItem } = useCartStore();
  const router = useRouter();
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.aside
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-[420px] flex-col border-l border-white/10 bg-zinc-950"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-5">
          <div>
            <h2 className="font-display text-2xl font-light text-white">Cart</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              {totalItems} item{totalItems !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:border-white/20 hover:text-white"
          >
            ×
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="text-4xl opacity-20">∅</div>
              <p className="text-sm text-zinc-500">Your cart is empty.</p>
              <button
                onClick={onClose}
                className="mt-2 text-xs text-zinc-400 underline underline-offset-4 hover:text-white"
              >
                Continue browsing
              </button>
            </div>
          ) : (
            <motion.div layout className="space-y-3">
              {items.map((item) => (
                <CartItemCard
                  key={item.id}
                  item={item}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </motion.div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-white/[0.07] px-6 py-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{totalItems} item{totalItems !== 1 ? "s" : ""} · custom order</span>
              <span>Pricing at checkout</span>
            </div>
            <button
              onClick={() => { onClose(); router.push("/checkout"); }}
              className="w-full rounded-full bg-white py-3.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 active:scale-[0.98]"
            >
              Proceed to checkout →
            </button>
          </div>
        )}
      </motion.aside>
    </>
  );
}
