// server/models/Design.js
const mongoose = require('mongoose')

const designSchema = new mongoose.Schema({
  userEmail: String,
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  options: mongoose.Schema.Types.Mixed, // JSON of customization
  previewUrl: String, // optional S3/Cloudinary URL
}, { timestamps: true })

module.exports = mongoose.model('Design', designSchema)
