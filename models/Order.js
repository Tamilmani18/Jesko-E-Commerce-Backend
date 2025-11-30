// server/models/Order.js
const mongoose = require('mongoose')

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  title: String,
  qty: Number,
  unitPrice: Number, // rupees
  customization: mongoose.Schema.Types.Mixed, // saved design/options
}, { _id: false })

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  userEmail: String,
  items: [orderItemSchema],
  shippingAddress: mongoose.Schema.Types.Mixed,
  paymentIntentId: String,
  paymentStatus: { type: String, default: 'pending' }, // pending, succeeded, failed
  fulfillmentStatus: { type: String, default: 'Processing' }, // Processing, Shipped, Delivered
  totalAmount: Number, // rupees
}, { timestamps: true })

module.exports = mongoose.model('Order', orderSchema)
