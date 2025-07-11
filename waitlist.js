const mongoose = require('mongoose');

const waitlistEntrySchema = new mongoose.Schema({
  name: String,
  email: String,
  make: String,
  agreed: Boolean,
  timestamp: String,
});

module.exports = mongoose.model('WaitlistEntry', waitlistEntrySchema);