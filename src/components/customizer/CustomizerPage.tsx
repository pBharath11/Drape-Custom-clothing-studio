"use client";

import { ChangeEvent, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import ShirtViewer from "@/components/viewer/ShirtViewer";
import MeasurementsModal from "@/components/checkout/MeasurementsModal";
import BackgroundShader from "@/components/ui/BackgroundShader";
import { useCustomizerStore } from "@/store/useCustomizerStore";
import { useCartStore } from "@/store/useCartStore";
import { ClothingModelConfig } from "@/types/clothing";
import type { Measurements } from "@/types/order";

interface CustomizerPageProps {
  modelConfig: ClothingModelConfig;
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read image file."));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function CustomizerPage({ modelConfig }: CustomizerPageProps) {
  const [showMeasurements, setShowMeasurements] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  const {
    frontPrint,
    backPrint,
    colorId,
    fabricId,
    designId,
    setFrontPrint,
    setBackPrint,
    setColor,
    setFabric,
    setDesign,
    reset,
  } = useCustomizerStore();

  const addItem = useCartStore((s) => s.addItem);

  const handleAddToCart = (measurements: Measurements) => {
    addItem({
      clothingType: modelConfig.type,
      clothingLabel: modelConfig.label,
      colorId: activeColor.id,
      colorHex: activeColor.hex,
      fabricId: activeFabric.id,
      designId: activeDesign.id,
      frontPrint,
      backPrint,
      measurements,
      quantity: 1,
    });
    setShowMeasurements(false);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const activeColor =
    modelConfig.colorOptions.find((item) => item.id === colorId) ||
    modelConfig.colorOptions[0];
  const activeFabric =
    modelConfig.fabricOptions.find((item) => item.id === fabricId) ||
    modelConfig.fabricOptions[0];
  const activeDesign =
    modelConfig.designOptions.find((item) => item.id === designId) ||
    modelConfig.designOptions[0];

  const hasFrontZone = modelConfig.materialRoles.front.length > 0;
  const hasBackZone = modelConfig.materialRoles.back.length > 0;

  const handlePrintUpload =
    (setter: (dataUrl?: string) => void) =>
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      try {
        const encoded = await readImageFile(file);
        setter(encoded);
      } catch (error) {
        console.error("Unable to read uploaded image", error);
      }
    };

  return (
    <div className="grain min-h-screen text-white">
      <BackgroundShader freezeAfter={1500} />

      <div className="relative" style={{ zIndex: 1 }}>

        {/* Back button — sits just below the GlobalNav bar */}
        <div className="fixed left-6 top-[72px] z-30">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-400 transition hover:border-white/20 hover:text-white"
          >
            ← Back to home
          </Link>
        </div>

        <div className="mx-auto max-w-screen-2xl px-6 pb-12" style={{ paddingTop: "100px" }}>

          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mb-10"
          >
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-zinc-500 mb-3">
              Drape Studio
            </p>
            <h1 className="font-display text-[clamp(2.8rem,6vw,5rem)] font-light leading-[0.95] tracking-tight text-white mb-4">
              Live Customization
            </h1>
            <p className="max-w-lg text-sm leading-7 text-zinc-400">
              Upload a front or back print, choose fabric and color, and preview your{" "}
              {modelConfig.label.toLowerCase()} in 3D.
            </p>
          </motion.header>

          <div className="grid gap-5 lg:grid-cols-[380px_1fr]">

            {/* ── Controls panel ── */}
            <motion.aside
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6 rounded-[28px] border border-white/[0.07] bg-black/40 p-6 backdrop-blur-sm"
            >

              {/* Fabric */}
              <section className="space-y-3">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">Fabric</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {modelConfig.fabricOptions.map((fabric) => (
                    <button
                      key={fabric.id}
                      type="button"
                      onClick={() => setFabric(fabric.id)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        fabricId === fabric.id
                          ? "border-white/50 bg-white/10"
                          : "border-white/[0.07] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="block text-sm font-medium text-white">
                        {fabric.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <div className="h-px bg-white/[0.06]" />

              {/* Color */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">Color</p>
                  <span className="text-xs text-zinc-500">{activeColor.label}</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {modelConfig.colorOptions.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setColor(color.id)}
                      title={color.label}
                      style={{ backgroundColor: color.hex }}
                      className={`h-10 w-full rounded-xl border-2 transition ${
                        colorId === color.id
                          ? "border-white scale-110"
                          : "border-white/10 hover:border-white/40 hover:scale-105"
                      }`}
                    />
                  ))}
                </div>
              </section>

              <div className="h-px bg-white/[0.06]" />

              {/* Design */}
              <section className="space-y-3">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">Design</p>
                <div className="grid grid-cols-2 gap-2">
                  {modelConfig.designOptions.map((design) => (
                    <button
                      key={design.id}
                      type="button"
                      onClick={() => setDesign(design.id)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        designId === design.id
                          ? "border-white/50 bg-white/10"
                          : "border-white/[0.07] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="block text-sm font-medium text-white">
                        {design.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {(hasFrontZone || hasBackZone) && <div className="h-px bg-white/[0.06]" />}

              {/* Front print */}
              {hasFrontZone && (
                <section className="space-y-3">
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">Front Print</p>
                  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 transition hover:border-white/20 hover:bg-white/[0.06]">
                    <span className="text-sm text-zinc-300">
                      {frontPrint ? "Change image" : "Choose file"}
                    </span>
                    <span className="font-mono text-xs text-zinc-500">PNG / JPG</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePrintUpload(setFrontPrint)}
                      className="hidden"
                    />
                  </label>
                  {frontPrint ? (
                    <div className="relative">
                      <img
                        src={frontPrint}
                        alt="Front print preview"
                        className="h-24 w-full rounded-2xl object-contain bg-white/5"
                      />
                      <button
                        onClick={() => setFrontPrint(undefined)}
                        className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-zinc-400 hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600">Placed on the front panel of the garment.</p>
                  )}
                </section>
              )}

              {/* Back print */}
              {hasBackZone && (
                <section className="space-y-3">
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">Back Print</p>
                  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 transition hover:border-white/20 hover:bg-white/[0.06]">
                    <span className="text-sm text-zinc-300">
                      {backPrint ? "Change image" : "Choose file"}
                    </span>
                    <span className="font-mono text-xs text-zinc-500">PNG / JPG</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePrintUpload(setBackPrint)}
                      className="hidden"
                    />
                  </label>
                  {backPrint ? (
                    <div className="relative">
                      <img
                        src={backPrint}
                        alt="Back print preview"
                        className="h-24 w-full rounded-2xl object-contain bg-white/5"
                      />
                      <button
                        onClick={() => setBackPrint(undefined)}
                        className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-zinc-400 hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-600">Placed on the back panel of the garment.</p>
                  )}
                </section>
              )}

              <div className="h-px bg-white/[0.06]" />

              {/* CTAs */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowMeasurements(true)}
                  className={`w-full rounded-full px-4 py-3.5 text-sm font-medium transition ${
                    addedToCart
                      ? "bg-zinc-800 text-zinc-500"
                      : "bg-white text-zinc-950 hover:bg-zinc-100"
                  }`}
                >
                  {addedToCart ? "✓ Added to cart" : "Add to cart →"}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="w-full rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm font-medium text-zinc-400 transition hover:border-white/20 hover:text-white"
                >
                  Reset
                </button>
              </div>

            </motion.aside>

            {/* ── 3D Viewer panel ── */}
            <motion.main
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col rounded-[28px] border border-white/[0.07] bg-black/40 p-6 backdrop-blur-sm"
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">
                    3D Preview
                  </p>
                  <h2 className="font-display text-3xl font-light text-white">
                    {modelConfig.label}
                  </h2>
                </div>
                <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-2 font-mono text-xs text-zinc-500">
                  Drag to rotate · scroll to zoom
                </span>
              </div>

              <div className="flex-1 rounded-[20px] border border-white/[0.06] overflow-hidden" style={{ minHeight: "640px" }}>
                <ShirtViewer
                  modelBasePath={modelConfig.modelBasePath}
                  modelFilename={modelConfig.modelFilename}
                  frontPrint={frontPrint}
                  backPrint={backPrint}
                  colorRgb={activeColor.rgb}
                  fabricTexture={activeFabric.texturePath}
                  designId={activeDesign.id}
                  materialRoles={modelConfig.materialRoles}
                />
              </div>
            </motion.main>

          </div>
        </div>
      </div>

      <AnimatePresence>
        {showMeasurements && (
          <MeasurementsModal
            onClose={() => setShowMeasurements(false)}
            onAdd={handleAddToCart}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
