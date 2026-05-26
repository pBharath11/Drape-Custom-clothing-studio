"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { useCartStore } from "@/store/useCartStore";
import { useAuth } from "@/hooks/useAuth";
import CartDrawer from "./CartDrawer";
import ProfilePanel from "./ProfilePanel";

type ProfileTab = "profile" | "orders" | "addresses" | "payment";

const NAV_LINKS = [
  { id: "collection", label: "Shop" },
  { id: "about",      label: "About Us" },
  { id: "production", label: "Our Production" },
  { id: "faq",        label: "FAQ" },
] as const;

function BagIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// Isolated so useSearchParams doesn't block SSR for the whole nav
function DeepLinkHandler({ onOpenProfile }: { onOpenProfile: (tab: ProfileTab) => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const tab = searchParams.get("openProfile") as ProfileTab | null;
    if (tab === "orders" || tab === "profile" || tab === "addresses" || tab === "payment") {
      onOpenProfile(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("openProfile");
      const newUrl = params.size > 0 ? `${pathname}?${params}` : pathname;
      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, pathname, router, onOpenProfile]);

  return null;
}

export default function GlobalNav() {
  const [cartOpen, setCartOpen]       = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTab, setProfileTab]   = useState<ProfileTab>("profile");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [scrolled, setScrolled]       = useState(false);

  const pathname = usePathname();

  const handleOpenProfile = (tab: ProfileTab) => {
    setProfileTab(tab);
    setProfileOpen(true);
  };

  const totalItems = useCartStore((s) =>
    s.items.reduce((sum, i) => sum + i.quantity, 0)
  );
  const { user } = useAuth();

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initials = ((user?.user_metadata?.full_name ?? user?.email ?? "") as string)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Navbar background + active section on scroll
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);

      if (pathname !== "/") { setActiveSection(null); return; }

      const ids = ["collection", "about", "production", "faq"];
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.5) current = id;
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  // Smooth scroll on homepage; navigate to /#section on other pages
  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
      if (pathname === "/") {
        e.preventDefault();
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      }
    },
    [pathname]
  );

  return (
    <>
      <Suspense fallback={null}>
        <DeepLinkHandler onOpenProfile={handleOpenProfile} />
      </Suspense>

      <nav
        className={`fixed left-0 right-0 top-0 z-40 flex items-center justify-between px-6 transition-all duration-300 ${
          scrolled ? "border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-md" : ""
        }`}
        style={{ paddingTop: "10px", paddingBottom: "10px" }}
      >
        {/* Logo */}
        <Link href="/" className="shrink-0">
          <Image
            src="/images/drape-logo.png"
            alt="Drape"
            height={96}
            width={410}
            className="object-contain object-left"
            style={{ width: "auto", height: "52px" }}
          />
        </Link>

        {/* Center links — absolutely centered relative to the nav */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-8">
          {NAV_LINKS.map(({ id, label }) => (
            <a
              key={id}
              href={`/#${id}`}
              onClick={(e) => handleNavClick(e, id)}
              className={`font-mono text-xs uppercase tracking-[0.2em] transition-colors duration-200 ${
                activeSection === id
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label}
            </a>
          ))}
        </div>

        {/* Right: Cart + Profile */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setCartOpen(true)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/80 px-4 py-2 text-sm text-zinc-300 backdrop-blur-sm transition hover:border-white/20 hover:text-white"
            aria-label="Open cart"
          >
            <BagIcon />
            <span>Cart</span>
            {totalItems > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-zinc-950">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </button>

          <button
            onClick={() => { setProfileTab("profile"); setProfileOpen(true); }}
            className="relative h-9 w-9 overflow-hidden rounded-full border border-white/10 bg-zinc-950/80 backdrop-blur-sm transition hover:border-white/20"
            aria-label="Open account"
          >
            {avatarUrl ? (
              <Image src={avatarUrl} alt="avatar" fill className="object-cover" sizes="36px" />
            ) : initials ? (
              <span className="flex h-full w-full items-center justify-center text-xs font-medium text-white">
                {initials}
              </span>
            ) : (
              <span className="flex h-full w-full items-center justify-center text-zinc-300">
                <PersonIcon />
              </span>
            )}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {profileOpen && (
          <ProfilePanel onClose={() => setProfileOpen(false)} initialTab={profileTab} />
        )}
      </AnimatePresence>
    </>
  );
}
