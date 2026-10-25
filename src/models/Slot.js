const mongoose = require('mongoose');

const START_HOURS = [8, 10, 12, 14, 16];

function isRealDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const slotSchema = new mongoose.Schema(
  {
    roomCode: { type: String, required: true, uppercase: true, trim: true },
    // Stored as YYYY-MM-DD so filtering by ?date= is an exact match with no timezone issues.
    date: {
      type: String,
      required: true,
      validate: { validator: isRealDate, message: 'date must be a real date in YYYY-MM-DD format' },
    },
    startHour: {
      type: Number,
      required: true,
      enum: { values: START_HOURS, message: 'startHour must be one of 8, 10, 12, 14 or 16' },
    },
    seats: { type: Number, required: true, min: 1 },
    booked: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, versionKey: false }
);

// One slot per room, date and start hour.
slotSchema.index({ roomCode: 1, date: 1, startHour: 1 }, { unique: true });

slotSchema.virtual('seatsLeft').get(function seatsLeft() {
  return this.seats - this.booked;
});

slotSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

const Slot = mongoose.model('Slot', slotSchema);
Slot.START_HOURS = START_HOURS;
Slot.isRealDate = isRealDate;

module.exports = Slot;
