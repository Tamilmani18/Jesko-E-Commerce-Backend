// server/routes/payments.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Product = require("../models/Product");
const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
let stripe = null;
if (stripeSecret) stripe = require("stripe")(stripeSecret);
else
  console.warn(
    "STRIPE_SECRET_KEY not set — payment-intent retrieval will fail"
  );

/**
 * Helper: compute total amount (in smallest currency unit) from items.
 * items expected: [{ productId?, qty, unitPrice, title, snapshot? }]
 * If productId is valid ObjectId and exists we use DB price; otherwise we use item.unitPrice.
 */
async function computeTotalAmount(items = []) {
  let total = 0;
  for (const it of items) {
    const qty = Math.max(1, Number(it.qty || 1));
    let price = 0;

    // If productId looks like a Mongo id, try DB lookup (safe with isValid)
    if (it.productId && mongoose.Types.ObjectId.isValid(it.productId)) {
      try {
        const prod = await Product.findById(it.productId).lean();
        if (prod && typeof prod.price !== "undefined") {
          price = Number(prod.price || 0);
        } else {
          // fallback to provided unitPrice / snapshot
          price = Number(
            it.unitPrice ?? (it.snapshot && it.snapshot.price) ?? 0
          );
        }
      } catch (e) {
        console.warn(
          "Product lookup failed in payment calc for id",
          it.productId,
          e?.message || e
        );
        price = Number(it.unitPrice ?? (it.snapshot && it.snapshot.price) ?? 0);
      }
    } else {
      // demo/external item — use provided unitPrice or snapshot
      price = Number(it.unitPrice ?? (it.snapshot && it.snapshot.price) ?? 0);
    }

    total += price * qty;
  }

  // Stripe expects amount in smallest currency unit (e.g., paise for INR)
  const amountInPaisa = Math.round(total * 100);
  return amountInPaisa;
}

/**
 * GET /api/payment-intent/:id
 * Retrieves PaymentIntent by id (server-side), returns safe summary including metadata.
 * Example: GET /api/payment-intent/pi_1JXXXXXX
 */

router.get("/payment-intent/:id", async (req, res) => {
  try {
    if (!stripe)
      return res.status(500).json({ error: "Stripe not configured on server" });
    const { id } = req.params;
    if (!id)
      return res.status(400).json({ error: "Missing payment intent id" });

    // Only allow ids that look like a stripe payment intent id (start with 'pi_')
    if (!id.startsWith("pi_"))
      return res.status(400).json({ error: "Invalid payment intent id" });

    const pi = await stripe.paymentIntents.retrieve(id);
    // return minimal safe info
    return res.json({
      id: pi.id,
      amount: pi.amount,
      currency: pi.currency,
      status: pi.status,
      metadata: pi.metadata || {},
    });
  } catch (err) {
    console.error("payment intent retrieve error", err);
    const msg =
      err?.raw?.message || err?.message || "Could not retrieve payment intent";
    return res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/create-payment-intent
 * Body: { items: [...], metadata?: {...}, currency?: 'inr' | 'usd' ... }
 */
router.post("/create-payment-intent", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({
        error: "Stripe not configured on server (STRIPE_SECRET_KEY missing)",
      });
    }

    const { items = [], metadata = {}, currency = "inr" } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }

    // compute amount defensively
    const amount = await computeTotalAmount(items);
    if (amount <= 0) {
      return res.status(400).json({ error: "Computed amount is zero" });
    }

    // create PaymentIntent
    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      // optional: enable automatic payment methods for flexibility
      automatic_payment_methods: { enabled: true },
      metadata: metadata || {},
    });

    return res.json({ clientSecret: pi.client_secret, paymentIntentId: pi.id });
  } catch (err) {
    console.error("create-payment-intent error", err);
    // expose safe error info to client for debugging
    const msg =
      err?.raw?.message || err?.message || "Payment intent creation failed";
    return res.status(500).json({ error: msg });
  }
});

module.exports = router;
