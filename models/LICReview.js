const mongoose = require('mongoose');

const licReviewSchema = new mongoose.Schema({
  username: { type: String, required: true },
  comment: { type: String, required: true },
}, { timestamps: true });

const LICReview = mongoose.model('LICReview', licReviewSchema);

module.exports = LICReview;