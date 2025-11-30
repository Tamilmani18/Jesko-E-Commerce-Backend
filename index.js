// server/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const path = require("path");

const productRoutes = require("./routes/products");
const orderRoutes = require("./routes/orders");
const paymentRoutes = require("./routes/payments");
const adminRoutes = require("./routes/admin");
const uploadRoutes = require("./routes/upload");

const app = express();
const PORT = process.env.PORT || 5000;

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error(
    "MONGODB_URI not set in .env. Please add it and restart the server."
  );
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    // keep process alive? choose to exit so dev notices the problem
    process.exit(1);
  });
// --------------------------------------------------------------------

/* Middlewares */
app.use(cors());
app.use(morgan("dev"));
app.use(express.json()); // json for most routes

// API routes
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api", paymentRoutes); // contains /create-payment-intent and /webhook
app.use("/api/admin", adminRoutes); // admin-only routes (protected in route file)
app.use("/api/upload", uploadRoutes);

// Health
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
