@AGENTS.md
# My Clothing Store — Project Context for Claude Code

## What This Project Is
A full-stack e-commerce website for customized clothing with 3D live preview. Users can select a clothing type, customize it (print, texture, material, color) live on a 3D model, then place an order with measurements.

## Aesthetic Reference
https://totem.itsoffbrand.com/ — dark background, large typography, smooth scroll transitions, subtle grain overlays, high-end fashion feel.

## Tech Stack
- **Framework:** Next.js 16.2.4 (App Router, TypeScript strict mode)
- **Runtime:** React 19.2.4
- **Styling:** Tailwind CSS v4 — uses `@import "tailwindcss"` in globals.css; **no tailwind.config.js**
- **3D Viewer:** Three.js 0.184.0 (direct, not React Three Fiber)
- **Animations:** Framer Motion 12.38.0 (parallax cards, scroll-driven carousel, whileInView)
- **State Management:** Zustand 5.0.13
- **Auth + Database:** Supabase (Google login, session management, Postgres tables)
- **Payments:** Stripe (checkout, saved payment methods, webhooks)
- **Email:** Resend (order confirmation)
- **Hosting:** Vercel

## Project Structure
```
/my-clothing-store
├── /public
│   ├── /images
│   │   ├── drape-logo.png
│   │   ├── card-long-sleeve.jpg
│   │   ├── card-tshirt.jpg
│   │   ├── card-hoodie.jpg
│   │   └── carousel_image1-5.jpg        ← hero 3D carousel images
│   └── /models
│       ├── /long-sleeve-shirt
│       │   ├── Shirt_Long_Sleeves.glb
│       │   └── Shirt_Texture_Black_Diffuse.jpg
│       ├── hoodie.glb                    ← single-zone model
│       └── basic_t-shirt.glb            ← single-zone model
├── /supabase
│   └── schema.sql                       ← all table definitions + RLS policies
├── /src
│   ├── /app
│   │   ├── page.tsx                     ← Home page (hero, carousel, collection, about, production, faq, footer)
│   │   ├── layout.tsx                   ← Root layout + GlobalNav
│   │   ├── globals.css                  ← Tailwind v4 + grain animation + perf hints
│   │   ├── /customize/[type]/page.tsx   ← Customizer page per clothing type
│   │   ├── /checkout
│   │   │   ├── page.tsx
│   │   │   └── /success/page.tsx
│   │   └── /api
│   │       ├── /addresses
│   │       │   ├── route.ts             ← GET / POST addresses (auth required)
│   │       │   └── /[id]/route.ts       ← DELETE address
│   │       ├── /orders
│   │       │   └── route.ts             ← GET / POST orders with status history
│   │       ├── /checkout
│   │       │   ├── /create-payment-intent/route.ts
│   │       │   └── /get-payment-method/route.ts
│   │       ├── /stripe
│   │       │   ├── /customer/route.ts
│   │       │   ├── /payment-methods/route.ts
│   │       │   ├── /setup-save-card/route.ts
│   │       │   └── /webhook/route.ts    ← Stripe webhook (order status updates)
│   │       └── /emails
│   │           └── /order-confirmation/route.ts
│   ├── /components
│   │   ├── /viewer
│   │   │   ├── ShirtViewer.tsx
│   │   │   ├── useShirtMaterials.ts
│   │   │   └── useGLTFLoader.ts
│   │   ├── /customizer
│   │   │   └── CustomizerPage.tsx       ← includes back-to-home button under logo
│   │   ├── /shop
│   │   │   └── ClothingCard.tsx
│   │   ├── /checkout
│   │   │   ├── CheckoutPage.tsx
│   │   │   └── MeasurementsModal.tsx
│   │   └── /ui
│   │       ├── GlobalNav.tsx            ← full-width nav: logo | Shop/About/Production/FAQ | cart+profile
│   │       ├── CartDrawer.tsx
│   │       └── ProfilePanel.tsx
│   ├── /hooks
│   │   └── useAuth.ts
│   ├── /lib
│   │   ├── supabase.ts                  ← browser client
│   │   └── supabase-server.ts           ← createServiceClient + getUserFromRequest
│   ├── /store
│   │   ├── useCartStore.ts
│   │   ├── useCustomizerStore.ts
│   │   ├── useOrderStore.ts
│   │   ├── useAddressStore.ts           ← includes setAddresses()
│   │   ├── useSavedCardsStore.ts
│   │   └── useStripeCustomerStore.ts
│   └── /types
│       ├── clothing.ts
│       └── order.ts
├── CLAUDE.md
├── .env.local
└── next.config.ts
```

## The 3D Model — Critical Details
**File:** `Shirt_Long_Sleeves.glb` (single GLB binary). The loader in `useGLTFLoader.ts` tries `.glb` first and falls back to `.gltf` — always prefer GLB for new models.

**Named Materials (these are the key to print placement):**
- `Front.001` → shirt front panel — this is where the front print goes
- `Back.001` → shirt back panel — this is where the back print goes
- `Sleeve_Right.001` → right sleeve
- `Sleeve_Left.001` → left sleeve
- `Cuffs_Boundary.001` → cuffs/collar trim
- `Bottons.001` → buttons (plain color, no canvas texture)
- `Bottons_Threads` → button threads (plain color, no canvas texture)

**Material roles** are declared in `ClothingModelConfig.materialRoles` (`MaterialRoles` interface):
- `front` — gets canvas texture + front print overlay
- `back` — gets canvas texture + back print overlay
- `accent` — gets plain color only (no fabric texture, no pattern)
- _(anything not listed)_ — body: gets canvas texture + design pattern, no print

**Single-zone models (hoodie, t-shirt):** Use empty `materialRoles` (`{front:[], back:[], accent:[]}`). The entire model is treated as `body` zone. Front/back print UI is hidden via `hasFrontZone`/`hasBackZone` flags in `CustomizerPage.tsx`.

**Texture files (all in /public/models/long-sleeve-shirt/):**
- `Shirt_Texture_Black_Diffuse.jpg` → fabric base texture (used for all material zones)

**How rendering works (canvas compositing pipeline):**
1. Fill canvas with the chosen `rgb` color
2. Draw fabric texture over it using `overlay` composite — preserves light colors (white stays white); `multiply` would darken white to ~gray
3. Draw design pattern (`horizontal-stripes`, `vertical-stripes`, `grid`, `dots`) using `source-over` at `globalAlpha = 0.55` with black/white auto-selected by luminance
4. Draw print PNG overlay centered (front/back panels only)
5. Wrap result in `THREE.CanvasTexture`, set `flipY = false`

**Pattern tiling — CRITICAL:** Sleeve materials have very narrow UV ranges. Without wrapping, the entire sleeve UV range may land inside a single stripe/gap, making the pattern invisible. Fix: always set `THREE.RepeatWrapping` + `texture.repeat` per design:
- `vertical-stripes` → `wrapS = RepeatWrapping`, `repeat.x = 4`
- `horizontal-stripes` → `wrapT = RepeatWrapping`, `repeat.y = 4`
- `grid` / `dots` → both axes, `repeat.set(4, 4)`

**IMPORTANT — Past issues to avoid:**
- Do NOT manipulate UV coordinates — the model's UVs are already correct
- Do NOT split mesh geometry — it breaks the model
- Do NOT use DecalGeometry — causes deformation
- Do NOT use planar UV reprojection — causes double copy issues
- Do NOT use `multiply` composite for the fabric overlay — white becomes gray; use `overlay`
- Do NOT use `"map" in material` guards before setting `.map` — GLTF materials may not have `map` as an own-property even though the cast works fine
- The correct approach is canvas texture compositing per named material

## 3D Viewer Implementation Notes
- Use Three.js directly (not React Three Fiber)
- Load with `GLTFLoader` from `three/examples/jsm/loaders/GLTFLoader`
- `useGLTFLoader.ts` handles dynamic import of the loader; do NOT use script tags
- The loader must be given the correct base path (e.g. `/models/long-sleeve-shirt/`)
- `ShirtViewer.tsx` wires Three.js scene, `OrbitControls`, resize observer, and animation loop
- Orbit controls: left drag = rotate, right drag = pan, scroll = zoom, double-click = reset camera
- `useShirtMaterials.ts` (`refreshShirtMaterials`) handles all canvas compositing; it takes a `Map<string, Material>` and `MaterialRoles` — no hardcoded material names

## User Flow
1. **Home page** — hero with 3D spinning carousel, collection cards, About Us, Our Production, FAQ, footer
2. **Select clothing type** → card click → customizer page
3. **Customizer page** — 3D model viewer on right, control panel on left; back-to-home button under logo
4. **Confirm** → measurements popup
5. **Add to cart** → cart drawer
6. **Checkout** → address step → payment step (Stripe)
7. **Success page** → order saved to Supabase + localStorage, confirmation email sent
8. **Account (ProfilePanel)** → orders (from Supabase), addresses (from Supabase), saved cards (from Stripe)

## Auth & Session
- Google login via Supabase Auth
- Bearer token pattern for API routes: client calls `supabase.auth.getSession()`, passes token as `Authorization: Bearer <token>`, server verifies with `admin.auth.getUser(token)` in `supabase-server.ts`
- Session inactivity timeout: **not yet built**

## Database (Supabase)
All tables defined in `supabase/schema.sql`. Run that file in Supabase SQL Editor to create everything.

| Table | Purpose | RLS |
|---|---|---|
| `addresses` | Saved user addresses | Users manage their own |
| `orders` | Order records with JSONB items + address | Users read their own; writes via service role |
| `order_status_history` | Status change log per order | Users read history for their own orders |
| `stripe_events` | Webhook idempotency log | No RLS — service role only |

**Notes:**
- `orders.items` is JSONB — stores the full cart item array including customization + measurements
- `orders.address` is JSONB — snapshot of delivery address at time of order
- `order_status_history` is populated on order creation (initial status) and by the Stripe webhook on payment events

## Environment Variables (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=           ✅ set
NEXT_PUBLIC_SUPABASE_ANON_KEY=      ✅ set
SUPABASE_SERVICE_ROLE_KEY=          ✅ set (server-side admin ops)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= ✅ set (test mode)
STRIPE_SECRET_KEY=                  ✅ set (test mode)
STRIPE_WEBHOOK_SECRET=              ✅ set (from Stripe CLI / dashboard)
RESEND_API_KEY=                     ✅ set
EMAIL_FROM=                         ✅ set ("My Clothing Store <onboarding@resend.dev>")
EMAIL_TO_OVERRIDE=                  ✅ set (dev/test: routes all emails to Resend account owner)
```
Note: `NEXTAUTH_SECRET` is NOT needed — using Supabase Auth, not NextAuth.
Note: `EMAIL_TO_OVERRIDE` is required in dev because Resend requires a verified domain to send to arbitrary addresses. Remove it in production once a real domain is verified.

## Current Status — What Is Done

### 3D Customizer
- All 10 colors render correctly including white
- All 6 designs work on full shirt including sleeves: none, two-tone shade, horizontal stripes, vertical stripes, tone grid (checkerboard), tonal dots
- Front/back print upload: PNG/JPEG composited onto front/back panel in 3D
- Multi-model architecture: `ClothingModelConfig` + `MaterialRoles` — adding new clothing types requires only a config entry
- 3D viewer: transparent renderer, dark navy studio gradient background, vignette overlay, ACES filmic tone mapping, 4-light studio rig
- **Hoodie + T-Shirt** added as single-zone GLB models (no front/back print zones; full-body fabric/color/pattern only)
- Back-to-home button under logo on customizer page

### Home Page
- Parallax hero with Cormorant Garamond display font, Framer Motion scroll parallax + stagger animations
- Animated film-grain overlay (CSS SVG feTurbulence, 10-step keyframe)
- `ClothingCard` with 3D perspective tilt + specular glare
- **3D spinning carousel** (right half, desktop only): 5 luxury fashion images on a rotating platform; `useMotionValue`-driven `rotateY`, auto-spin via `useAnimationFrame` (~20 deg/sec), scroll-driven speed boost via `useMotionValueEvent`
- **About Us section** (`#about`): brand copy + 2×2 stat grid; label slide-from-left, clip-reveal heading lines, body/stats directional slide-in
- **Our Production section** (`#production`): 4-step process (Design → Measure → Craft → Deliver); cascade-from-left animation with stagger
- **FAQ section** (`#faq`): 5 Q&A pairs in a two-column grid; staggered slide-from-left
- **Footer**: multi-column — Navigate links, Follow Us (socials), Studio address + email; copyright bar

### Global Navigation
- `GlobalNav.tsx` — full-width fixed navbar: Drape logo (links to `/`) on left, center links (Shop, About Us, Our Production, FAQ), cart + profile buttons on right
- Active section highlighting via scroll listener + `getBoundingClientRect` — highlights whichever `#section` has crossed 50% of viewport; no highlight on non-home pages
- Navbar background fades in (`bg-zinc-950/80 backdrop-blur-md`) after scrolling 20px
- Nav links: smooth scroll on homepage (`scrollIntoView`); `href="/#section"` navigation from other pages

### Auth
- `src/lib/supabase.ts` — Supabase browser client
- `src/lib/supabase-server.ts` — `createServiceClient()` + `getUserFromRequest()` (Bearer token verification)
- `src/hooks/useAuth.ts` — auth state hook
- `ProfilePanel.tsx` — 4 tabs: Profile, Orders (from Supabase API), Addresses (from Supabase API), Payment (Stripe)
- Google OAuth working end-to-end via Supabase

### Checkout (Stripe)
- Two-step checkout: Address → Payment
- Saved card selection + new card entry with Stripe `PaymentElement`
- `AbortController` pattern prevents React StrictMode double-PI creation
- `confirmPayment` (not `confirmCardPayment`) used for all confirmation paths

### Saved Payment Methods
- `useSavedCardsStore` — no `persist` (avoids localStorage hydration race)
- `useStripeCustomerStore` — persisted Stripe Customer ID
- Duplicate customer handling: searches `limit: 10`, returns customer with actual PMs attached

### Backend (Supabase + Stripe)
- `supabase/schema.sql` — complete schema with RLS policies
- `/api/addresses` (GET/POST) + `/api/addresses/[id]` (DELETE)
- `/api/orders` (GET/POST) — orders with joined `order_status_history`
- `/api/stripe/webhook` — verifies Stripe signature, idempotent via `stripe_events` table, updates order status + inserts history row on `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
- Orders saved to both Supabase (via API) and localStorage (Zustand persist) on success page

### Order Confirmation Email
- Resend SDK; fire-and-forget from success page
- `EMAIL_TO_OVERRIDE` routes all emails to fixed inbox in dev

### Performance
- `will-change: transform` on grain overlay, carousel hub, carousel cards
- `backface-visibility: hidden` on carousel cards (skips GPU rendering of back faces)
- `-webkit-font-smoothing: antialiased` + `text-rendering: optimizeSpeed`
- `scroll-behavior: smooth` + `overscroll-behavior: none` on `html`

## What Is NOT Yet Built
- ClothingCard → customizer zoom/transition animation (card zooms in on click, transitions to customizer)
- 15-minute session inactivity timeout
- `/cart/page.tsx` (dedicated cart page — currently cart is a drawer only)
- Sub-components: `ColorPicker.tsx`, `PrintUploader.tsx`, `TexturePicker.tsx` (currently inlined in `CustomizerPage.tsx`)
- Verified sending domain on Resend (currently using `onboarding@resend.dev`; `EMAIL_TO_OVERRIDE` must remain set until a real domain is verified)

## Stripe & Checkout — Critical Gotchas

- **React StrictMode double PI**: `useEffect` runs twice in dev. Without `AbortController`, two PaymentIntents are created; Elements latches onto the first, but `setup-save-card` updates the second — card is never saved. Fix: abort the first fetch on cleanup.
- **Duplicate Stripe customers**: Placing orders as a guest before logging in can create multiple Stripe Customer records with the same email. Always search `limit: 10` and return the customer that actually has payment methods attached.
- **`useSavedCardsStore` must NOT use `persist`**: Zustand's localStorage hydration fires after mount and silently overwrites the result of `syncCards()`, making the saved cards list appear empty. Cards are always fetched fresh from Stripe.
- **`PaymentTab` must receive `userEmail` as a prop**: If `PaymentTab` calls `useAuth()` itself, the auth state starts as `null`, the `fetchedRef` guard fires on the `customerId` fast-path before the email resolves, and the email fallback is permanently blocked. Pass `userEmail` down from the parent component which already has the resolved user.
- **Stripe Customer email field vs receipt_email**: The `receipt_email` on a PaymentIntent is NOT the same as the `email` on the Customer object. When creating a Stripe Customer, always pass `email` explicitly.
- **`setup_future_usage: "off_session"` requires a Customer**: Call `setup-save-card` before `confirmPayment` so the PI is updated with both `customer` and `setup_future_usage` before Stripe processes it.
- **Saved card confirmation**: Use `stripe.confirmPayment(...)` — NOT `stripe.confirmCardPayment`. PIs with `automatic_payment_methods: { enabled: true }` must use `confirmPayment`; using `confirmCardPayment` causes silent failures.
- **Webhook raw body**: Use `req.text()` in Next.js App Router for the raw body needed by `stripe.webhooks.constructEvent`. Do NOT parse as JSON first.

## Framer Motion — Animation Gotchas

- **`whileInView` on `y: "110%"` elements never fires**: IntersectionObserver uses the element's actual bounding rect (post-transform). An element starting at `y: 110%` has its rect shifted below the viewport, so the observer never sees it enter. Fix: put `whileInView` / `initial="hidden" whileInView="visible"` on the visible `overflow-hidden` wrapper, and use `variants` to cascade the animation to children.
- **Carousel `rotateZ` + `rotateX` compound artifact**: Combining `rotateZ` with `rotateX` on the carousel hub causes cards on the back to appear at skewed/upside-down angles. Use only `rotateX` for the viewing angle. If a horizontal offset is needed, shift the container div instead.

## Coding Conventions
- TypeScript strict mode
- Functional components only
- Custom hooks for all Three.js logic
- No class components
- Tailwind for all styling (no separate CSS files except globals.css)
- Zustand for global state, React state for local component state
