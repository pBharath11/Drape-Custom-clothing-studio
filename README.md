# Drape — Bespoke Clothing, Made to Order

A full-stack e-commerce platform for customized clothing with live 3D preview. Design a garment (fabric, colour, print, pattern), enter your exact measurements, and have it handcrafted and delivered to your door.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| 3D Viewer | Three.js (direct — no React Three Fiber) |
| Animations | Framer Motion 12 |
| State | Zustand 5 |
| Auth + DB | Supabase (Google OAuth, Postgres) |
| Payments | Stripe (Elements, webhooks) |
| Email | Resend |
| Hosting | Vercel |

## Features

- **3D live customizer** — fabric texture, colour, print patterns, front/back print upload; all changes reflected live on the 3D model
- **Multiple clothing types** — long-sleeve shirt (multi-zone), hoodie, t-shirt (single-zone)
- **Measurements modal** — 5 body measurements, cm/in toggle, collapsible size guide
- **Cart + checkout** — Zustand cart, two-step checkout (address → Stripe payment)
- **Saved cards** — Stripe Customer + `setup_future_usage` for returning customers
- **Order history** — stored in Supabase; synced to local Zustand store
- **Saved addresses** — stored in Supabase; add/remove from profile panel
- **Order confirmation email** — Resend, fires on success page
- **Stripe webhook** — auto-updates order status on payment events
- **Global navbar** — logo, section nav (Shop / About Us / Our Production / FAQ), cart, profile; active section highlighting on scroll
- **Animated homepage** — hero parallax, 3D spinning card carousel, scroll-driven sections with clip-reveal headings and directional slide-ins

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

RESEND_API_KEY=
EMAIL_FROM=Drape <onboarding@resend.dev>
EMAIL_TO_OVERRIDE=your@email.com   # dev only — remove in production
```

### 3. Set up the database

Run `supabase/schema.sql` in your Supabase project → **SQL Editor → New query**. This creates all tables and RLS policies.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Set up the Stripe webhook (local dev)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret it prints and set it as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

## Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Home page
│   ├── customize/[type]/page.tsx # 3D customizer
│   ├── checkout/                 # Checkout + success pages
│   └── api/                      # API routes
│       ├── addresses/
│       ├── orders/
│       ├── checkout/
│       ├── stripe/               # customer, payment-methods, setup-save-card, webhook
│       └── emails/
├── components/
│   ├── viewer/                   # Three.js scene + hooks
│   ├── customizer/               # Customizer UI
│   ├── shop/                     # ClothingCard
│   ├── checkout/                 # CheckoutPage, MeasurementsModal
│   └── ui/                       # GlobalNav, CartDrawer, ProfilePanel
├── hooks/
│   └── useAuth.ts
├── lib/
│   ├── supabase.ts               # Browser client
│   └── supabase-server.ts        # Service role client + auth helper
├── store/                        # Zustand stores
└── types/                        # clothing.ts, order.ts
supabase/
└── schema.sql                    # Database schema + RLS policies
```

## Adding a New Clothing Type

1. Add a GLB file to `/public/models/`
2. Add a card image to `/public/images/`
3. Add a config entry to `src/types/clothing.ts`:

```ts
const myItemConfig: ClothingModelConfig = {
  type: "my-item",
  label: "My Item",
  modelBasePath: "/models/",
  modelFilename: "my-item.glb",
  materialRoles: {
    front: ["FrontMaterial"],   // omit if single-zone
    back: ["BackMaterial"],
    accent: ["ButtonMaterial"],
  },
  colorOptions: sharedColorOptions,
  fabricOptions: sharedFabricOptions,
  designOptions: fullDesignOptions,
  basePrice: 5000,              // in pence/cents
  cardImageSrc: "/images/card-my-item.jpg",
};
```

4. Add it to the `clothingModels` array. That's it — the customizer, cart, and checkout handle it automatically.

## Deployment

Deploy to Vercel. Set all environment variables in the Vercel dashboard. For the Stripe webhook, create a production endpoint in the Stripe dashboard pointing to `https://your-domain.com/api/stripe/webhook` and update `STRIPE_WEBHOOK_SECRET`.

Remove `EMAIL_TO_OVERRIDE` once you have a verified sending domain on Resend.
