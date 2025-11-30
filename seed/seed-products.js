// server/seed/seed-products.js
require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/Product");

const PRODUCTS = [
  {
    title: "Custom Name Board",
    slug: "custom-name-board",
    description: "Laser-cut customizable name board",
    price: 899,
    category: "nameboard",
    isCustomizable: true,
    customizationSchema: {
      text: { type: "text", label: "Text", default: "Your Name" },
      fontFamily: {
        type: "select",
        label: "Font",
        options: ["serif", "sans-serif", "monospace"],
        default: "serif",
      },
      fontSize: {
        type: "range",
        label: "Size",
        min: 18,
        max: 120,
        default: 48,
      },
      color: { type: "color", label: "Color", default: "#111827" },
      material: {
        type: "select",
        label: "Material",
        options: ["Plywood", "Acrylic", "Metal"],
        default: "Plywood",
      },
    },
  },
  {
    title: "Engraved Gift Box",
    slug: "engraved-gift-box",
    description: "Personalized gift box",
    price: 499,
    category: "gift",
    isCustomizable: true,
    customizationSchema: {
      text: { type: "text", label: "Message", default: "Happy Birthday" },
      fontFamily: {
        type: "select",
        label: "Font",
        options: ["serif", "sans-serif"],
        default: "sans-serif",
      },
      color: { type: "color", label: "Ink Color", default: "#111827" },
    },
  },
  {
    title: "Precision Gear",
    slug: "precision-gear",
    description: "High precision component",
    price: 1299,
    category: "component",
    isCustomizable: false,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  await Product.deleteMany({});
  await Product.insertMany(PRODUCTS);
  console.log("Seed complete");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed error", err);
  process.exit(1);
});
