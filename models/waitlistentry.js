const mongoose = require('mongoose');

const WaitlistEntrySchema = new mongoose.Schema({
  name: String,
  email: String,
  make: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WaitlistEntry', WaitlistEntrySchema);