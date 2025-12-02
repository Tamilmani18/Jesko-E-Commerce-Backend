// server/routes/orders.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");

/**
 * Simple order number generator: JSKO-YYYY-XXXXX (timestamp based)
 * Not guaranteed sequential, but stable enough for dev/demo.
 */
function generateOrderNumber() {
  const y = new Date().getFullYear();
  const tail = String(Date.now() % 100000).padStart(5, "0");
  return `JSKO-${y}-${tail}`;
}

/**
 * POST /api/orders
 * Body: { items: [{ productId, qty, unitPrice, title, customization, snapshot }], shippingAddress?, userEmail? }
 *
 * This route is tolerant of demo items where productId is not a valid ObjectId.
 * - If productId is a valid ObjectId and product exists: use DB product title & price (snapshot)
 * - Otherwise: do NOT put productId into the item (omit it) and use payload values (snapshot) instead.
 */
router.post("/", async (req, res) => {
  try {
    const { items = [], shippingAddress = null, userEmail = null } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }

    const resolvedItems = [];

    for (const it of items) {
      const {
        productId,
        qty = 1,
        unitPrice,
        title,
        customization,
        snapshot,
      } = it;

      const safeQty = Math.max(1, Number(qty || 1));
      const safeUnitPrice = Number(
        unitPrice ?? (snapshot && snapshot.price) ?? 0
      );

      // If productId looks like a Mongo ObjectId, try to fetch the product
      if (productId && mongoose.Types.ObjectId.isValid(productId)) {
        try {
          const prod = await Product.findById(productId).lean();
          if (prod) {
            resolvedItems.push({
              // include productId only when valid/object exists
              productId: prod._id,
              title: prod.title,
              qty: safeQty,
              unitPrice: Number(prod.price ?? safeUnitPrice),
              customization: customization || undefined,
              snapshot: {
                title: prod.title,
                images: prod.images || [],
                slug: prod.slug || "",
              },
            });
            continue;
          }
          // if product not found, fall through to fallback below
        } catch (e) {
          console.warn(
            "Product lookup failed for id",
            productId,
            e?.message || e
          );
          // fall through to fallback
        }
      }

      // Fallback for demo / external items: do NOT set productId (avoid CastError)
      const fallbackItem = {
        // no productId property here when using demo/external payload
        title: title || (snapshot && snapshot.title) || "Unknown item",
        qty: safeQty,
        unitPrice: safeUnitPrice,
        customization: customization || undefined,
        snapshot: snapshot || {},
      };
      resolvedItems.push(fallbackItem);
    }

    // compute total
    const totalAmount = resolvedItems.reduce(
      (s, it) => s + Number(it.unitPrice || 0) * Number(it.qty || 1),
      0
    );

    // create order payload
    const orderPayload = {
      orderNumber: generateOrderNumber(),
      items: resolvedItems,
      totalAmount,
      shippingAddress,
      userEmail,
      paymentStatus: "pending",
      fulfillmentStatus: "Processing",
      createdAt: new Date(),
    };

    const order = new Order(orderPayload);
    await order.save();

    return res.json(order);
  } catch (err) {
    console.error("Create order error", err);
    return res
      .status(500)
      .json({ error: err.message || "Could not create order" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid order id" });
    }

    const order = await Order.findById(id).lean();
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Optionally: remove sensitive fields (payment intent secrets, webhooks etc) if present
    // e.g., delete order.someSensitiveField

    return res.json(order);
  } catch (err) {
    console.error("GET order error", err);
    return res.status(500).json({ error: "Could not load order" });
  }
});

module.exports = router;
