const mongoose = require('mongoose');

const trafficSchema = new mongoose.Schema({
  path: {
    type: String,
    required: true
  },
  ip: {
    type: String,
    required: true
  },
  userAgent: {
    type: String
  },
  referrer: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    expires: '30d'
  }
});

// Transform _id to id when sending to frontend
trafficSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

module.exports = mongoose.model('Traffic', trafficSchema);
