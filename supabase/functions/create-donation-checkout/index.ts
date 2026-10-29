import Stripe from "https://esm.sh/stripe@17.7.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const { amount, currency = "eur", successUrl, cancelUrl } = await req.json();

    if (!amount || amount < 100) {
      return new Response(
        JSON.stringify({ error: "Mindestbetrag ist 1,00 €" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (amount > 100000) {
      return new Response(
        JSON.stringify({ error: "Maximalbetrag ist 1.000,00 €" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only allow redirects back to trusted CritiCore domains to prevent
    // post-payment phishing via attacker-supplied success/cancel URLs.
    const ALLOWED_ORIGINS = [
      "https://criticore.cc",
      "https://www.criticore.cc",
      "https://criticore.tgn.news",
    ];
    const safeUrl = (value: unknown, fallback: string): string => {
      if (typeof value !== "string") return fallback;
      try {
        const parsed = new URL(value);
        return ALLOWED_ORIGINS.includes(parsed.origin) ? value : fallback;
      } catch {
        return fallback;
      }
    };
    const safeSuccessUrl = safeUrl(successUrl, "https://criticore.cc/spenden?success=true");
    const safeCancelUrl = safeUrl(cancelUrl, "https://criticore.cc/spenden?canceled=true");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-01-27.acacia" });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: "CritiCore Spende",
              description: "Unterstütze CritiCore – werbefrei und unabhängig!",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: safeSuccessUrl,
      cancel_url: safeCancelUrl,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Donation checkout error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
