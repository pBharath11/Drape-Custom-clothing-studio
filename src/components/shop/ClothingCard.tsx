"use client";

import { useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  motion,
  useMotionValue,
  useTransform,
  useSpring,
  useMotionTemplate,
} from "framer-motion";
import type { ClothingModelConfig } from "@/types/clothing";
import { useTransitionStore } from "@/store/useTransitionStore";

interface Props {
  config: ClothingModelConfig;
  index: number;
  imageSrc?: string;
}

export default function ClothingCard({ config, index, imageSrc }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const begin = useTransitionStore((s) => s.begin);
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const rotX = useSpring(useTransform(mouseY, [0, 1], [4, -4]), {
    stiffness: 300,
    damping: 30,
  });
  const rotY = useSpring(useTransform(mouseX, [0, 1], [-4, 4]), {
    stiffness: 300,
    damping: 30,
  });

  const glareX = useTransform(mouseX, [0, 1], [0, 100]);
  const glareY = useTransform(mouseY, [0, 1], [0, 100]);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.08) 0%, transparent 55%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const num = String(index + 1).padStart(2, "0");

  const handleClick = () => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      begin(rect, `/customize/${config.type}`, config.modelBasePath, config.modelFilename);
    } else {
      router.push(`/customize/${config.type}`);
    }
  };

  return (
    <motion.div
      ref={cardRef}
      style={{ rotateX: rotX, rotateY: rotY, transformPerspective: 1200 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 60 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      viewport={{ once: true, margin: "-60px" }}
      className="group relative overflow-hidden rounded-[28px]"
    >
      {/* Background image */}
      {imageSrc && (
        <div className="absolute inset-0">
          <Image
            src={imageSrc}
            alt={config.label}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {/* Multi-layer gradient for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
          <div className="absolute inset-0 bg-zinc-950/20" />
        </div>
      )}

      {/* No-image fallback background */}
      {!imageSrc && (
        <div className="absolute inset-0 bg-zinc-900 border border-white/[0.07] rounded-[28px]" />
      )}

      {/* Specular glare */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10"
        style={{ background: glare }}
      />

      {/* Border overlay */}
      <div className="absolute inset-0 rounded-[28px] border border-white/10 transition-colors duration-300 group-hover:border-white/20 pointer-events-none z-20" />

      <div
        role="link"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === "Enter") handleClick(); }}
        className="relative z-10 flex min-h-[520px] flex-col p-8 lg:min-h-[580px] cursor-pointer"
      >
        {/* Top row */}
        <div className="flex items-start justify-between">
          <span className="font-mono text-xs tracking-[0.25em] text-white/40">{num}</span>
          <span className="text-white/40 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/80">
            ↗
          </span>
        </div>

        {/* Decorative number (only when no image) */}
        {!imageSrc && (
          <div
            aria-hidden
            className="pointer-events-none absolute right-4 top-2 select-none font-display text-[180px] font-light leading-none text-white/[0.025]"
          >
            {num}
          </div>
        )}

        {/* Bottom content */}
        <div className="mt-auto space-y-4">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">
            Clothing
          </p>

          <h2 className="font-display text-[2.6rem] font-light leading-[1.1] tracking-tight text-white transition-all duration-300">
            {config.label}
          </h2>

          <div className="h-px w-12 bg-white/20 transition-all duration-500 group-hover:w-24 group-hover:bg-white/40" />

          <p className="text-sm text-white/50">
            {config.colorOptions.length} colors &middot;{" "}
            {config.designOptions.length} designs
          </p>

          {/* Color swatches */}
          <div className="flex flex-wrap items-center gap-1.5">
            {config.colorOptions.slice(0, 9).map((color) => (
              <div
                key={color.id}
                title={color.label}
                style={{ backgroundColor: color.hex }}
                className="h-[14px] w-[14px] rounded-full border border-white/20 transition-transform duration-200 hover:scale-110"
              />
            ))}
            {config.colorOptions.length > 9 && (
              <span className="text-xs text-white/40">
                +{config.colorOptions.length - 9}
              </span>
            )}
          </div>

          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm text-white backdrop-blur-sm transition-all duration-200 group-hover:border-white/30 group-hover:bg-white/15">
            Customize
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
