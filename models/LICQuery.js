const mongoose = require('mongoose');

const licQuerySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  query: { type: String, required: true },
}, { timestamps: true });

const LICQuery = mongoose.model('LICQuery', licQuerySchema);

module.exports = LICQuery;