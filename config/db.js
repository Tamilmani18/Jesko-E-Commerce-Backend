// server/config/db.js
const mongoose = require('mongoose')

async function connect(uri) {
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  console.log('Connected to MongoDB')
}

module.exports = { connect }
