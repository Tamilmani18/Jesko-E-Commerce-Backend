// server/routes/orders.js
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const { nanoid } = require("nanoid");

// POST /api/orders
// Create order record (before payment). In many flows you create order after payment webhook.
// Here we support creating an order and returning the order id.
router.post("/", async (req, res) => {
  try {
    const {
      items = [],
      userEmail,
      shippingAddress,
      paymentIntentId = null,
    } = req.body;

    // Compute totals from server product prices
    let total = 0;
    const detailedItems = [];

    for (const it of items) {
      const product = await Product.findById(it.productId).lean();
      const unit = product ? product.price : it.unitPrice || 0;
      const qty = it.qty || 1;
      total += unit * qty;
      detailedItems.push({
        productId: product ? product._id : null,
        title: product ? product.title : it.title,
        qty,
        unitPrice: unit,
        customization: it.customization || null,
      });
    }

    const orderNumber = `ORD-${nanoid(10).toUpperCase()}`;
    const order = new Order({
      orderNumber,
      userEmail,
      items: detailedItems,
      shippingAddress,
      paymentIntentId,
      totalAmount: total,
    });

    await order.save();
    res.json(order);
  } catch (err) {
    console.error("Create order error", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/:id
router.get("/:id", async (req, res) => {
  const order = await Order.findById(req.params.id).lean();
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json(order);
});

module.exports = router;
