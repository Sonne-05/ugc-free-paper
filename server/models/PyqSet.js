const mongoose = require('mongoose');

const pyqSetSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    required: true
  },
  paperType: {
    type: String,
    enum: ['Paper I', 'Paper II'],
    required: true
  },
  year: {
    type: String,
    required: true
  },
  questionsCount: {
    type: Number,
    required: true,
    default: 100
  },
  questionsLoaded: {
    type: Number,
    default: 0
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'completed', 'complete'],
    default: 'pending'
  },
  subject: {
    type: String,
    default: 'Sociology'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true, strict: false });

// Transform _id to id when sending to frontend
pyqSetSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

module.exports = mongoose.models.PyqSet || mongoose.model('PyqSet', pyqSetSchema);
