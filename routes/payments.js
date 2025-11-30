// server/routes/payments.js
const express = require("express");
const Stripe = require("stripe");
const bodyParser = require("body-parser");
const Product = require("../models/Product");
const Order = require("../models/Order");

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/create-payment-intent
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { items = [], metadata = {} } = req.body;

    // Validate and compute total server-side
    let total = 0;
    for (const it of items) {
      if (it.productId) {
        const product = await Product.findById(it.productId).lean();
        if (!product)
          return res
            .status(400)
            .json({ error: `Invalid productId ${it.productId}` });
        total += product.price * (it.qty || 1);
      } else {
        total += (it.unitPrice || 0) * (it.qty || 1);
      }
    }

    const amount = Math.round(total * 100);
    if (amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "inr",
      automatic_payment_methods: { enabled: true },
      metadata: {
        ...metadata,
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error("create-payment-intent error", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Webhook endpoint
 * Use raw body for signature verification.
 */
router.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        // Fallback for environments without webhook secret (not recommended)
        event = JSON.parse(req.body.toString());
      }
    } catch (err) {
      console.error("Webhook signature verification failed.", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case "payment_intent.succeeded": {
          const pi = event.data.object;
          const metadata = pi.metadata || {};
          const orderId = metadata.orderId || null;

          console.log("PaymentIntent succeeded:", pi.id, "orderId:", orderId);

          // If orderId provided via metadata, find that order and update
          if (orderId) {
            const order = await Order.findById(orderId);
            if (order) {
              order.paymentIntentId = pi.id;
              order.paymentStatus = "succeeded";
              await order.save();
              console.log(`Order ${order._id} marked as succeeded`);
            } else {
              console.warn(
                "Webhook: orderId metadata provided but order not found:",
                orderId
              );
            }
          } else {
            // Try to find order by paymentIntentId (older flows)
            const order = await Order.findOne({ paymentIntentId: pi.id });
            if (order) {
              order.paymentStatus = "succeeded";
              await order.save();
              console.log(
                `Order ${order._id} marked as succeeded (matched by paymentIntentId)`
              );
            } else {
              console.warn("Webhook: no order found for paymentIntent:", pi.id);
            }
          }
          break;
        }

        case "payment_intent.payment_failed": {
          const pi = event.data.object;
          const metadata = pi.metadata || {};
          const orderId = metadata.orderId || null;
          console.log("PaymentIntent failed:", pi.id, "orderId:", orderId);
          if (orderId) {
            await Order.findByIdAndUpdate(orderId, { paymentStatus: "failed" });
          } else {
            await Order.findOneAndUpdate(
              { paymentIntentId: pi.id },
              { paymentStatus: "failed" }
            );
          }
          break;
        }

        default:
          console.log(`Unhandled stripe event: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Error handling webhook event:", err);
      res.status(500).send("Server error handling webhook");
    }
  }
);

module.exports = router;
