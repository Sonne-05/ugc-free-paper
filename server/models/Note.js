const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  unitId: {
    type: String,
    required: true,
    unique: true
  },
  unitTitle: {
    type: String
  },
  subtitle: {
    type: String
  },
  htmlContent: {
    type: String
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Note', NoteSchema);
