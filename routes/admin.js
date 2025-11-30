// server/routes/admin.js
const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Order = require("../models/Order");
const auth0 = require("../middleware/auth0");
const checkAdmin = require("../middleware/checkAdmin");

// If auth0 middleware is null (not configured), we allow access in dev — be careful.
const requireAuth =
  auth0 && typeof auth0 === "function" ? auth0 : (req, res, next) => next();

/**
 * GET /api/admin/products
 * GET /api/admin/products/:id (not implemented here but can be added)
 */
router.get("/products", requireAuth, checkAdmin, async (req, res) => {
  const products = await Product.find().lean();
  res.json(products);
});

router.post("/products", requireAuth, checkAdmin, async (req, res) => {
  try {
    const p = new Product(req.body);
    await p.save();
    res.json(p);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/products/:id", requireAuth, checkAdmin, async (req, res) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(p);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/admin/orders
 * Supports server-side pagination, searching:
 *  - query params: page (1-based), pageSize, q
 * Returns: { total, page, pageSize, orders }
 */
router.get("/orders", requireAuth, checkAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.max(
      1,
      Math.min(100, parseInt(req.query.pageSize || "10", 10))
    );
    const q = (req.query.q || "").trim();

    const filter = {};
    if (q) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); // escape and case-insensitive
      filter.$or = [{ orderNumber: re }, { userEmail: re }];
    }

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    res.json({ total, page, pageSize, orders });
  } catch (err) {
    console.error("admin orders list error", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Update order fulfillment status (admin)
 */
router.put("/orders/:id/status", requireAuth, checkAdmin, async (req, res) => {
  try {
    const status = req.body.status || req.body.fulfillmentStatus;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { fulfillmentStatus: status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
