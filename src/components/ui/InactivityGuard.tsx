"use client";

import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";

export default function InactivityGuard() {
  useInactivityTimeout();
  return null;
}
