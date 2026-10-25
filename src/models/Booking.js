const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
  },
  { timestamps: true, versionKey: false }
);

// A student cannot book the same slot twice; the database enforces it too.
bookingSchema.index({ student: 1, slot: 1 }, { unique: true });
bookingSchema.index({ slot: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
