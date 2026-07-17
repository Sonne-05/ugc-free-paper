const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  adsenseEnabled: {
    type: Boolean,
    default: true
  },
  passPercentage: {
    type: Number,
    default: 40
  },
  timerDuration: {
    type: Number,
    default: 120
  }
}, { timestamps: true });

// Transform _id to id when sending to frontend
settingSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

module.exports = mongoose.model('Setting', settingSchema);
