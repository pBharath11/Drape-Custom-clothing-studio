"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useAnimationFrame,
  useMotionValueEvent,
  type MotionValue,
} from "framer-motion";
import { clothingModels } from "@/types/clothing";
import ClothingCard from "@/components/shop/ClothingCard";
import BackgroundShader from "@/components/ui/BackgroundShader";
import Image from "next/image";

const HERO_WORDS = ["Your Vision.", "Your Fabric.", "Your Fit."];

const CAROUSEL_IMAGES = [
  { src: "/images/carousel_image1.jpg", label: "Editorial" },
  { src: "/images/carousel_image2.jpg", label: "Couture" },
  { src: "/images/carousel_image3.jpg", label: "Luxury" },
  { src: "/images/carousel_image4.jpg", label: "Avant-garde" },
  { src: "/images/carousel_image5.jpg", label: "Bespoke" },
];

const CARD_W = 230;
const CARD_H = 335;
const RADIUS  = 320;

function HeroCarousel({ scrollYProgress }: { scrollYProgress: MotionValue<number> }) {
  const count = CAROUSEL_IMAGES.length;
  const angleStep = 360 / count;
  const rotateY = useMotionValue(0);
  const prevScroll = useRef(0);

  // Auto-spin: ~20 deg/sec (one full rotation every 18 s)
  useAnimationFrame((_t, delta) => {
    rotateY.set(rotateY.get() - delta * 0.02);
  });

  // Scroll boost: scrolling through the hero adds ~500 deg of extra spin
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const delta = latest - prevScroll.current;
    rotateY.set(rotateY.get() - delta * 100);
    prevScroll.current = latest;
  });

  return (
    <div style={{ perspective: "900px" }}>
      <motion.div
        style={{ transformStyle: "preserve-3d", width: 0, height: 0, rotateX: 4, rotateZ: 8, rotateY, willChange: "transform" }}
      >
        {CAROUSEL_IMAGES.map((img, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              transform: `rotateY(${i * angleStep}deg) translateZ(${RADIUS}px)`,
              width: `${CARD_W}px`,
              height: `${CARD_H}px`,
              marginLeft: `-${CARD_W / 2}px`,
              marginTop: `-${CARD_H / 2}px`,
            }}
          >
            <div
              className="relative h-full w-full overflow-hidden rounded-3xl border border-white/20"
              style={{
                boxShadow: "0 32px 64px rgba(0,0,0,0.75), 0 8px 24px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.4)",
                backfaceVisibility: "hidden",
                willChange: "transform",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.label}
                className="h-full w-full object-cover"
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <p className="absolute bottom-3 left-3 font-mono text-[9px] uppercase tracking-[0.2em] text-white/50">
                {img.label}
              </p>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <div className="grain min-h-screen text-white">
      <BackgroundShader />

      {/* All page content sits above the fixed shader canvas */}
      <div className="relative" style={{ zIndex: 1 }}>

      {/* Hero */}
      <section
        ref={heroRef}
        className="relative flex min-h-screen flex-col justify-end overflow-hidden px-8 pb-20 pt-32"
      >
        {/* 3D spinning carousel — right half, desktop only */}
        <motion.div
          style={{ opacity: heroOpacity }}
          className="pointer-events-none absolute bottom-0 right-0 top-0 hidden w-1/2 items-center justify-center lg:flex"
          aria-hidden="true"
        >
          <HeroCarousel scrollYProgress={scrollYProgress} />
        </motion.div>

        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 space-y-2">
          {HERO_WORDS.map((word, i) => (
            <motion.h1
              key={word}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.1 + i * 0.15,
                duration: 0.9,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="font-display text-[clamp(4rem,12vw,9rem)] font-light leading-[0.92] tracking-tight text-white"
            >
              {word}
            </motion.h1>
          ))}

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 max-w-sm text-sm leading-7 text-zinc-400"
          >
            Design a garment as unique as you are. Choose your fabric, set your
            print, perfect your fit — all before it leaves our studio.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-10 flex items-center gap-6"
          >
            <a
              href="#collection"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("collection")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-medium text-zinc-950 transition hover:bg-zinc-100"
            >
              Start designing
              <span>→</span>
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-8 right-8 flex flex-col items-center gap-2"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-600">
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="h-4 w-px bg-zinc-700"
          />
        </motion.div>
      </section>

      {/* Collection */}
      <section id="collection" className="px-8 pb-32 pt-16">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 flex items-end justify-between border-b border-white/[0.06] pb-6"
        >
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.35em] text-white">
              The Collection
            </p>
            <h2 className="font-display text-4xl font-light text-zinc-500">
              Choose your style
            </h2>
          </div>
          <span className="font-mono text-xs text-zinc-600">
            {clothingModels.length} item{(clothingModels.length as number) !== 1 ? "s" : ""}
          </span>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {clothingModels.map((config, i) => (
            <ClothingCard
              key={config.type}
              config={config}
              index={i}
              imageSrc={config.cardImageSrc}
            />
          ))}
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="border-t border-white/[0.06] px-8 pb-32 pt-20">

        {/* Header */}
        <div className="mb-16 border-b border-white/[0.06] pb-6">
          <motion.p
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3 font-mono text-xs uppercase tracking-[0.35em] text-white"
          >
            About Us
          </motion.p>
          {/* whileInView on the visible wrapper; variants propagate to child spans */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="overflow-hidden">
              <motion.span
                variants={{
                  hidden: { y: "110%" },
                  visible: { y: "0%", transition: { duration: 0.75, delay: 0.06, ease: [0.16, 1, 0.3, 1] } },
                }}
                className="block font-display text-5xl lg:text-6xl font-light text-zinc-500"
              >
                Made for you.
              </motion.span>
            </div>
            <div className="overflow-hidden">
              <motion.span
                variants={{
                  hidden: { y: "110%" },
                  visible: { y: "0%", transition: { duration: 0.75, delay: 0.15, ease: [0.16, 1, 0.3, 1] } },
                }}
                className="block font-display text-5xl lg:text-6xl font-light text-zinc-500"
              >
                Made to last.
              </motion.span>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
          {/* Left column — slides in from the left */}
          <motion.div
            initial={{ opacity: 0, x: -52 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-5"
          >
            <p className="text-sm leading-8 text-zinc-400">
              Drape was founded on a single belief: clothing should fit the person,
              not the other way around. Every garment we make is built from scratch —
              designed by you through our 3D customizer, cut and sewn by our studio
              team, and delivered directly to your door.
            </p>
            <p className="text-sm leading-8 text-zinc-400">
              We don&apos;t keep inventory. We don&apos;t run mass-production lines.
              Each piece is a one-off, made to the exact measurements you provide —
              which means zero waste, zero compromise, and a garment that actually fits.
            </p>
          </motion.div>

          {/* Right column — slides in from the right (mirrors the left) */}
          <motion.div
            initial={{ opacity: 0, x: 52 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-2 gap-px border border-white/[0.06] bg-white/[0.06]"
          >
            {[
              { value: "100%", label: "Made to order" },
              { value: "0",    label: "Excess inventory" },
              { value: "14",   label: "Days to your door" },
              { value: "∞",    label: "Design combinations" },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col gap-1 bg-zinc-950 p-8">
                <span className="font-display text-4xl font-light text-white">{value}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Our Production */}
      <section id="production" className="border-t border-white/[0.06] px-8 pb-32 pt-20">

        {/* Header */}
        <div className="mb-16 border-b border-white/[0.06] pb-6">
          <motion.p
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3 font-mono text-xs uppercase tracking-[0.35em] text-white"
          >
            Our Production
          </motion.p>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <div className="overflow-hidden">
              <motion.span
                variants={{
                  hidden: { y: "110%" },
                  visible: { y: "0%", transition: { duration: 0.75, delay: 0.06, ease: [0.16, 1, 0.3, 1] } },
                }}
                className="block font-display text-5xl lg:text-6xl font-light text-zinc-500"
              >
                From your screen
              </motion.span>
            </div>
            <div className="overflow-hidden">
              <motion.span
                variants={{
                  hidden: { y: "110%" },
                  visible: { y: "0%", transition: { duration: 0.75, delay: 0.15, ease: [0.16, 1, 0.3, 1] } },
                }}
                className="block font-display text-5xl lg:text-6xl font-light text-zinc-500"
              >
                to your wardrobe.
              </motion.span>
            </div>
          </motion.div>
        </div>

        {/* Steps — cascade from left, each card 120 ms after the previous */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              num: "01",
              title: "Design",
              body: "Open the 3D customizer, choose your fabric, colour, pattern and print. See every change live on the model before you commit to a single stitch.",
            },
            {
              num: "02",
              title: "Measure",
              body: "Enter your exact body measurements or follow the interactive size guide. Chest, waist, hips, shoulders, length — every dimension recorded.",
            },
            {
              num: "03",
              title: "Craft",
              body: "Your order goes straight to our studio floor. Each garment is cut individually and hand-sewn by our team. No batch runs. No shortcuts.",
            },
            {
              num: "04",
              title: "Deliver",
              body: "After a thorough quality check, your finished piece is carefully packaged and shipped directly to your door within 14 business days.",
            },
          ].map(({ num, title, body }, i) => (
            <motion.div
              key={num}
              initial={{ opacity: 0, x: -56 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.75, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              className="border-t border-white/[0.08] pt-6"
            >
              <span className="font-mono text-[10px] text-zinc-500">{num}</span>
              <h3 className="mb-3 mt-2 font-display text-xl font-light text-white">{title}</h3>
              <p className="text-xs leading-7 text-zinc-400">{body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-white/[0.06] px-8 pb-32 pt-20">
        <div className="mb-16 border-b border-white/[0.06] pb-6">
          <motion.p
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-3 font-mono text-xs uppercase tracking-[0.35em] text-white"
          >
            FAQ
          </motion.p>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="overflow-hidden">
              <motion.span
                variants={{
                  hidden: { y: "110%" },
                  visible: { y: "0%", transition: { duration: 0.75, delay: 0.06, ease: [0.16, 1, 0.3, 1] } },
                }}
                className="block font-display text-5xl lg:text-6xl font-light text-zinc-500"
              >
                Questions,
              </motion.span>
            </div>
            <div className="overflow-hidden">
              <motion.span
                variants={{
                  hidden: { y: "110%" },
                  visible: { y: "0%", transition: { duration: 0.75, delay: 0.15, ease: [0.16, 1, 0.3, 1] } },
                }}
                className="block font-display text-5xl lg:text-6xl font-light text-zinc-500"
              >
                answered.
              </motion.span>
            </div>
          </motion.div>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {[
            {
              q: "How long does delivery take?",
              a: "Each garment is handcrafted to order. Allow 14 business days from order confirmation to delivery at your door.",
            },
            {
              q: "What print file formats do you accept?",
              a: "We accept PNG files with a transparent background, up to 10 MB. For the sharpest result, use a minimum resolution of 2000 × 2000 px.",
            },
            {
              q: "Can I update my measurements after ordering?",
              a: "Reach out within 24 hours of placing your order and we will do our best to accommodate the change. After that, production has already begun.",
            },
            {
              q: "Do you ship internationally?",
              a: "We currently ship to the UK, EU, India and United States. More regions are on the way — sign up to be notified when yours is added.",
            },
            {
              q: "How should I care for my garment?",
              a: "Care instructions tailored to the fabric you selected are included with every order. When in doubt, cold wash and lay flat to dry.",
            },
          ].map(({ q, a }, i) => (
            <motion.div
              key={q}
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 gap-3 py-7 lg:grid-cols-2 lg:gap-16"
            >
              <p className="text-sm font-light text-white">{q}</p>
              <p className="text-sm leading-7 text-zinc-500">{a}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-8 pt-16 pb-8">
        {/* Top row: logo + tagline */}
        <div className="mb-12 flex flex-col gap-3">
          <Image
            src="/images/drape-logo.png"
            alt="Drape"
            height={96}
            width={410}
            className="object-contain object-left"
            style={{ width: "auto", height: "52px" }}
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400">
            Bespoke clothing, made to your measurements.
          </p>
        </div>

        {/* Nav + Socials + Address columns */}
        <div className="mb-12 grid grid-cols-2 gap-10 sm:grid-cols-4">

          {/* Navigate */}
          <div>
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">
              Navigate
            </p>
            <ul className="space-y-3">
              {[
                { label: "Home",           href: "/" },
                { label: "Shop",           href: "/#collection" },
                { label: "About Us",       href: "/#about" },
                { label: "Our Production", href: "/#production" },
                { label: "FAQ",            href: "/#faq" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="text-xs text-zinc-500 transition-colors duration-200 hover:text-white">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Spacer on mobile, empty on sm+ */}
          <div className="hidden sm:block" />

          {/* Socials */}
          <div>
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">
              Follow Us
            </p>
            <ul className="space-y-3">
              {[
                { label: "Instagram", href: "https://instagram.com" },
                { label: "TikTok",    href: "https://tiktok.com" },
                { label: "Pinterest", href: "https://pinterest.com" },
                { label: "X",         href: "https://x.com" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-500 transition-colors duration-200 hover:text-white"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Address */}
          <div>
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-400">
              Studio
            </p>
            <address className="not-italic space-y-1">
              <p className="text-xs text-zinc-500">Drape Studio</p>
              <p className="text-xs text-zinc-500">12 Fabric Lane</p>
              <p className="text-xs text-zinc-500">London, E1 6RF</p>
              <p className="text-xs text-zinc-500">United Kingdom</p>
              <a
                href="mailto:contact@drape.studio"
                className="mt-3 block text-xs text-zinc-500 transition-colors duration-200 hover:text-white"
              >
                contact@drape.studio
              </a>
            </address>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-start justify-between gap-3 border-t border-white/[0.06] pt-8 sm:flex-row sm:items-center">
          <span className="font-mono text-[10px] text-zinc-500">
            © {new Date().getFullYear()} Drape. All rights reserved.
          </span>
          <span className="font-mono text-[10px] text-zinc-500">
            3D customization powered by Three.js
          </span>
        </div>
      </footer>
      </div> {/* end z-[1] content wrapper */}
    </div>
  );
}
