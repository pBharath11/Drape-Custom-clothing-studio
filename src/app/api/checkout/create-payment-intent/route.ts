import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getClothingModelConfig } from "@/types/clothing";
import type { CartItem } from "@/types/order";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

const DELIVERY_PENCE = 699;
const FREE_DELIVERY_THRESHOLD = 15000;

export async function POST(req: Request) {
  try {
    const {
      items,
      customerEmail,
      customerName,
      customerId,
    }: { items: CartItem[]; customerEmail?: string; customerName?: string; customerId?: string } =
      await req.json();

    const subtotal = items.reduce((sum, item) => {
      const config = getClothingModelConfig(item.clothingType);
      return sum + (config?.basePrice ?? 0) * item.quantity;
    }, 0);

    const delivery = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_PENCE;
    const total = subtotal + delivery;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: "gbp",
      ...(customerEmail ? { receipt_email: customerEmail } : {}),
      ...(customerName ? { description: `Order for ${customerName}` } : {}),
      // Attach customer when known so saved PMs can be confirmed against it
      ...(customerId ? { customer: customerId } : {}),
      automatic_payment_methods: { enabled: true },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      subtotal,
      delivery,
      total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
