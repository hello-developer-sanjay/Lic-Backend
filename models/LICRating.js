const mongoose = require('mongoose');

const licRatingSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  rating: { type: Number, required: true, min: 0, max: 5 },
}, { timestamps: true });

const LICRating = mongoose.model('LICRating', licRatingSchema);

module.exports = LICRating;