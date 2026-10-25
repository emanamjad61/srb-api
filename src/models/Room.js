const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: [true, 'roomCode is required'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^ROOM-\d{2,}$/, 'roomCode must look like ROOM-01'],
    },
    name: { type: String, required: [true, 'name is required'], trim: true },
    building: { type: String, required: [true, 'building is required'], trim: true },
    seats: {
      type: Number,
      required: [true, 'seats is required'],
      min: [1, 'seats must be at least 1'],
      validate: { validator: Number.isInteger, message: 'seats must be a whole number' },
    },
  },
  { timestamps: true, versionKey: false }
);

roomSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Room', roomSchema);
