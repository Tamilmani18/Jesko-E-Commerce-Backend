// server/routes/products.js
const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

// GET /api/products
router.get("/", async (req, res) => {
  const products = await Product.find().lean();
  res.json(products);
});

// GET /api/products/:slug
router.get("/:slug", async (req, res) => {
  const p = await Product.findOne({ slug: req.params.slug }).lean();
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.json(p);
});

module.exports = router;
