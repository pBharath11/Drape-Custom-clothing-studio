import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function GET(req: Request) {
  try {
    const customerId = new URL(req.url).searchParams.get("customerId");
    if (!customerId) {
      return NextResponse.json({ error: "customerId required" }, { status: 400 });
    }

    const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card" });

    const cards = pms.data.map((pm) => ({
      stripePaymentMethodId: pm.id,
      brand: pm.card!.brand,
      last4: pm.card!.last4,
      expMonth: pm.card!.exp_month,
      expYear: pm.card!.exp_year,
    }));

    return NextResponse.json({ cards });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
