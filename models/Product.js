// server/models/Product.js
const mongoose = require("mongoose");

const customizationFieldSchema = new mongoose.Schema(
  {
    type: { type: String }, // text, select, color, range
    label: String,
    default: mongoose.Schema.Types.Mixed,
    options: [String], // for select
    min: Number,
    max: Number,
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: String,
    price: { type: Number, required: true }, // price in rupees
    category: String,
    images: [String],
    isCustomizable: { type: Boolean, default: false },
    customizationSchema: {
      type: Map,
      of: customizationFieldSchema,
      default: {},
    },
    inventoryCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
