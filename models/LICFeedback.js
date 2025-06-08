const mongoose = require('mongoose');

const licFeedbackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  feedback: { type: String, required: true },
}, { timestamps: true });

const LICFeedback = mongoose.model('LICFeedback', licFeedbackSchema);

module.exports = LICFeedback;