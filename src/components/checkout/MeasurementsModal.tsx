"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Measurements, MeasurementUnit } from "@/types/order";

interface Props {
  onClose: () => void;
  onAdd: (measurements: Measurements) => void;
}

const FIELDS: {
  key: keyof Omit<Measurements, "unit">;
  label: string;
  hint: string;
}[] = [
  { key: "chest",    label: "Chest",          hint: "Around the fullest part" },
  { key: "waist",    label: "Waist",           hint: "Around your natural waist" },
  { key: "hips",     label: "Hips",            hint: "Around the fullest part of hips" },
  { key: "length",   label: "Shirt Length",    hint: "Shoulder top to desired hem" },
  { key: "shoulder", label: "Shoulder Width",  hint: "Point to point across shoulders" },
];

// Reference guide values in cm
const SIZE_GUIDE = [
  { size: "XS", chest: "81–86",   waist: "66–71",  hips: "81–86",   length: "66", shoulder: "40" },
  { size: "S",  chest: "86–91",   waist: "71–76",  hips: "86–91",   length: "68", shoulder: "42" },
  { size: "M",  chest: "91–96",   waist: "76–81",  hips: "91–96",   length: "70", shoulder: "44" },
  { size: "L",  chest: "96–101",  waist: "81–86",  hips: "96–101",  length: "72", shoulder: "46" },
  { size: "XL", chest: "101–106", waist: "86–91",  hips: "101–106", length: "74", shoulder: "48" },
];

function cmToIn(val: string) {
  return val
    .split("–")
    .map((v) => Math.round(parseFloat(v) / 2.54))
    .join("–");
}

const EMPTY: Omit<Measurements, "unit"> = {
  chest: 0, waist: 0, hips: 0, length: 0, shoulder: 0,
};

export default function MeasurementsModal({ onClose, onAdd }: Props) {
  const [unit, setUnit] = useState<MeasurementUnit>("cm");
  const [values, setValues] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof EMPTY, boolean>>>({});
  const [guideOpen, setGuideOpen] = useState(false);

  const setField = (key: keyof typeof EMPTY, raw: string) => {
    const n = parseFloat(raw);
    setValues((v) => ({ ...v, [key]: isNaN(n) ? 0 : n }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: false }));
  };

  const handleAdd = () => {
    const newErrors: typeof errors = {};
    for (const f of FIELDS) {
      if (!values[f.key] || values[f.key] <= 0) newErrors[f.key] = true;
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onAdd({ ...values, unit });
  };

  const guideRow = (row: (typeof SIZE_GUIDE)[0]) =>
    unit === "cm"
      ? [row.size, row.chest, row.waist, row.hips, row.length, row.shoulder]
      : [row.size, cmToIn(row.chest), cmToIn(row.waist), cmToIn(row.hips), cmToIn(row.length), cmToIn(row.shoulder)];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-[32px] border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="max-h-[90vh] overflow-y-auto p-8">
          {/* Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="font-display text-3xl font-light text-white">
                Your Measurements
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                For a perfect fit — all fields required.
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/10 text-zinc-400 transition hover:border-white/20 hover:text-white"
            >
              ×
            </button>
          </div>

          {/* Unit toggle */}
          <div className="mb-6 flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 w-fit">
            {(["cm", "in"] as MeasurementUnit[]).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                  unit === u
                    ? "bg-white text-zinc-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {u}
              </button>
            ))}
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-2 gap-3">
            {FIELDS.map((f, i) => {
              const isFullWidth = i === FIELDS.length - 1 && FIELDS.length % 2 !== 0;
              return (
                <div key={f.key} className={isFullWidth ? "col-span-2" : ""}>
                  <label className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-zinc-500">
                    {f.label}
                  </label>
                  <div
                    className={`flex items-center rounded-2xl border px-4 py-3 transition ${
                      errors[f.key]
                        ? "border-red-500/60 bg-red-500/5"
                        : "border-white/10 bg-white/[0.04] focus-within:border-white/25"
                    }`}
                  >
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={values[f.key] || ""}
                      onChange={(e) => setField(f.key, e.target.value)}
                      placeholder="0"
                      className="w-full bg-transparent text-base font-light text-white outline-none placeholder:text-zinc-700"
                    />
                    <span className="ml-2 flex-shrink-0 text-sm text-zinc-600">
                      {unit}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">{f.hint}</p>
                  {errors[f.key] && (
                    <p className="mt-1 text-xs text-red-400">Required</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Size guide toggle */}
          <div className="mt-6">
            <button
              onClick={() => setGuideOpen((o) => !o)}
              className="flex items-center gap-2 text-xs text-zinc-500 transition hover:text-zinc-300"
            >
              <motion.span
                animate={{ rotate: guideOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="inline-block"
              >
                ↓
              </motion.span>
              Size reference guide
            </button>

            <AnimatePresence>
              {guideOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 overflow-x-auto rounded-2xl border border-white/[0.07] bg-white/[0.03]">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/[0.07]">
                          {["Size", "Chest", "Waist", "Hips", "Length", "Shoulder"].map((h) => (
                            <th
                              key={h}
                              className="px-3 py-2.5 text-left font-medium uppercase tracking-wider text-zinc-600"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {SIZE_GUIDE.map((row) => (
                          <tr key={row.size} className="border-b border-white/[0.04] last:border-0">
                            {guideRow(row).map((cell, ci) => (
                              <td
                                key={ci}
                                className={`px-3 py-2.5 text-zinc-400 ${ci === 0 ? "font-medium text-white" : ""}`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="px-3 py-2 text-[10px] text-zinc-700">
                      All values in {unit}. Use as a starting point — your actual measurements take priority.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* CTA */}
          <button
            onClick={handleAdd}
            className="mt-6 w-full rounded-full bg-white py-3.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-100 active:scale-[0.98]"
          >
            Add to cart →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
