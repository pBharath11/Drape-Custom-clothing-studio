import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: Request) {
  try {
    const {
      clientSecret,
      customerEmail,
      customerName,
    }: { clientSecret: string; customerEmail: string; customerName?: string } =
      await req.json();

    const piId = clientSecret.split("_secret_")[0];

    const existing = await stripe.customers.list({ email: customerEmail, limit: 10 });
    let customer: Stripe.Customer;
    if (existing.data.length > 0) {
      customer = existing.data[0];
      for (const c of existing.data) {
        const pms = await stripe.paymentMethods.list({ customer: c.id, type: "card" });
        if (pms.data.length > 0) { customer = c; break; }
      }
    } else {
      customer = await stripe.customers.create({
        email: customerEmail,
        ...(customerName ? { name: customerName } : {}),
      });
    }

    await stripe.paymentIntents.update(piId, {
      customer: customer.id,
      setup_future_usage: "off_session",
    });

    return NextResponse.json({ customerId: customer.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
