const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended'],
    default: 'Active'
  },
  attempts: {
    type: Array,
    default: []
  },
  progress: {
    type: Array,
    default: []
  },
  streak: {
    type: Number,
    default: 0
  },
  hoursStudied: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Transform _id to id when sending to frontend
userSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

module.exports = mongoose.model('User', userSchema);
