"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const TIMEOUT_MS = 15 * 60 * 1000;
const EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;

export function useInactivityTimeout() {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  useEffect(() => {
    const signOut = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    };

    const reset = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(signOut, TIMEOUT_MS);
    };

    reset();
    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true }));

    return () => {
      clearTimeout(timerRef.current);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [router]);
}
