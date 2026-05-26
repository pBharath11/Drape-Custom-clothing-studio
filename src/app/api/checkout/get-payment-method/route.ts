import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: Request) {
  try {
    const { paymentIntentId }: { paymentIntentId: string } = await req.json();

    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["payment_method"],
    });

    const pm = pi.payment_method;
    if (!pm || typeof pm === "string" || pm.type !== "card" || !pm.card) {
      return NextResponse.json({ error: "No card payment method found" }, { status: 400 });
    }

    return NextResponse.json({
      brand: pm.card.brand,
      last4: pm.card.last4,
      expMonth: pm.card.exp_month,
      expYear: pm.card.exp_year,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
