import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

const PLANS: Record<string, { name: string; price: number }> = {
  starter: { name: "Starter Plan", price: 19700 },
  popular: { name: "Most Popular Plan", price: 29700 },
  premium: { name: "Premium Plan", price: 39700 },
};

export async function POST(request: Request) {
  try {
    const { plan, email, name } = await request.json();

    const planData = PLANS[plan];
    if (!planData) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email,
      metadata: { plan, customerName: name },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `SlimRx ${planData.name}`,
              description: "Doctor-Guided GLP-1 Weight Loss Program",
            },
            unit_amount: planData.price,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout?plan=${plan}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
