"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { useTransitionStore } from "@/store/useTransitionStore";

export default function CardTransitionOverlay() {
  const { active, rect, href, modelBasePath, modelFilename, clear } = useTransitionStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!active || !href) return;

    // Preload model into browser cache while the loading screen is shown.
    // GLTFLoader fetches basePath+filename — hitting the same URLs warms the cache.
    if (modelBasePath && modelFilename) {
      const toGlb = (f: string) => f.replace(/\.gltf$/i, ".glb");
      const toGltf = (f: string) => f.replace(/\.glb$/i, ".gltf");
      [modelFilename, toGlb(modelFilename), toGltf(modelFilename)]
        .filter((v, i, a) => a.indexOf(v) === i)
        .forEach((f) => fetch(modelBasePath + f).catch(() => {}));
    }

    const t = setTimeout(() => router.push(href), 3000);
    return () => clearTimeout(t);
  }, [active, href, modelBasePath, modelFilename, router]);

  useEffect(() => {
    if (!active) return;
    if (pathname.startsWith("/customize/")) {
      const t = setTimeout(clear, 500);
      return () => clearTimeout(t);
    }
  }, [pathname, active, clear]);

  return (
    <AnimatePresence>
      {active && rect && (
        <motion.div
          key="card-transition"
          style={{ position: "fixed", overflow: "hidden", zIndex: 9999 }}
          initial={{
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            borderRadius: 28,
          }}
          animate={{
            left: 0,
            top: 0,
            width: window.innerWidth,
            height: window.innerHeight,
            borderRadius: 0,
          }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="bg-zinc-950 flex items-center justify-center"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="loader" />
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-zinc-400">
              Preparing your studio
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
