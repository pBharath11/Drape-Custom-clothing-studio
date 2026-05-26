"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, isConfigured } from "@/lib/supabase";

export interface AuthState {
  user: User | null;
  loading: boolean;
  configured: boolean;
}

export function useAuth(): AuthState & {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
} {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!isConfigured) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: typeof window !== "undefined" ? window.location.origin : "",
      },
    });
  };

  const signOut = async () => {
    if (!isConfigured) return;
    await supabase.auth.signOut();
  };

  return { user, loading, configured: isConfigured, signInWithGoogle, signOut };
}
