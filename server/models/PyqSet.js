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
  }
}, { timestamps: true });

// Transform _id to id when sending to frontend
pyqSetSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    delete ret._id;
  }
});

module.exports = mongoose.model('PyqSet', pyqSetSchema);
