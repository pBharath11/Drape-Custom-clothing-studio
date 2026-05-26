import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
});

/** GET /api/stripe/customer?email=xxx
 * Finds a Stripe Customer by email and returns their saved cards.
 * Returns { customerId: null, cards: [] } if no customer found.
 */
export async function GET(req: Request) {
  try {
    const email = new URL(req.url).searchParams.get("email");
    if (!email) return NextResponse.json({ customerId: null, cards: [] });

    const customers = await stripe.customers.list({ email, limit: 10 });
    if (customers.data.length === 0) {
      return NextResponse.json({ customerId: null, cards: [] });
    }

    // Find the customer that actually has payment methods attached
    for (const customer of customers.data) {
      const pms = await stripe.paymentMethods.list({ customer: customer.id, type: "card" });
      if (pms.data.length > 0) {
        const cards = pms.data.map((pm) => ({
          stripePaymentMethodId: pm.id,
          brand: pm.card!.brand,
          last4: pm.card!.last4,
          expMonth: pm.card!.exp_month,
          expYear: pm.card!.exp_year,
        }));
        return NextResponse.json({ customerId: customer.id, cards });
      }
    }

    // No customer has PMs yet — return the most recent one
    return NextResponse.json({ customerId: customers.data[0].id, cards: [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
