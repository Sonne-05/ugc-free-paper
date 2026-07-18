const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  setId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PyqSet',
    required: true
  },
  qIndex: {
    type: Number
  },
  type: {
    type: String,
    enum: ['mcq', 'assertion-reason', 'match-column', 'comprehension', 'multiple-statement', 'di'],
    required: true
  },
  text: {
    type: String,
    required: true
  },
  options: {
    type: [String],
    default: []
  },
  statements: {
    type: [String],
    default: []
  },
  correct: {
    type: Number,
    required: true
  },
  assertion: String,
  reason: String,
  passage: String,
  explanation: String,
  subPrompt: String,
  list1: {
    type: [String],
    default: []
  },
  list2: {
    type: [String],
    default: []
  },
  list1Header: String,
  list2Header: String
}, { timestamps: true });

// Transform _id to id when sending to frontend
questionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

module.exports = mongoose.model('Question', questionSchema);
