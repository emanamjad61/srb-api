const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Slot = require('../models/Slot');
const ApiError = require('../utils/ApiError');
const { requireObjectId } = require('../utils/validate');
const studentService = require('./student.service');
const events = require('./events');

function announce(slot) {
  events.emit('slot:updated', {
    slotId: String(slot._id),
    roomCode: slot.roomCode,
    seatsLeft: slot.seats - slot.booked,
  });
}

// Bookings of one student joined with their slot and room, in one aggregation.
async function listBookingsForStudentId(studentId) {
  return Booking.aggregate([
    { $match: { student: studentId } },
    { $lookup: { from: 'slots', localField: 'slot', foreignField: '_id', as: 'slot' } },
    { $unwind: '$slot' },
    { $lookup: { from: 'rooms', localField: 'slot.roomCode', foreignField: 'roomCode', as: 'room' } },
    { $unwind: { path: '$room', preserveNullAndEmptyArrays: true } },
    { $sort: { 'slot.date': 1, 'slot.startHour': 1 } },
    {
      $project: {
        _id: 0,
        slotId: { $toString: '$slot._id' },
        roomCode: '$slot.roomCode',
        roomName: '$room.name',
        date: '$slot.date',
        startHour: '$slot.startHour',
        bookedAt: '$createdAt',
      },
    },
  ]);
}

async function listBookings(regNo) {
  const student = await studentService.getStudent(regNo);
  return listBookingsForStudentId(student._id);
}

async function bookSlot(regNo, slotId) {
  requireObjectId(slotId, 'slotId');
  const student = await studentService.getStudent(regNo);
  if (!(await Slot.exists({ _id: slotId }))) {
    throw ApiError.notFound(`Slot ${slotId} not found`, 'SLOT_NOT_FOUND');
  }
  if (await Booking.exists({ student: student._id, slot: slotId })) {
    throw ApiError.conflict('Student has already booked this slot', 'ALREADY_BOOKED');
  }

  // Atomic seat grab: the filter and the $inc run as one operation inside MongoDB,
  // so two students racing for the last seat cannot both succeed.
  const slot = await Slot.findOneAndUpdate(
    { _id: slotId, $expr: { $lt: ['$booked', '$seats'] } },
    { $inc: { booked: 1 } },
    { returnDocument: 'after' }
  );
  if (!slot) throw ApiError.conflict('This slot has no free seats', 'SLOT_FULL');

  let booking;
  try {
    booking = await Booking.create({ student: student._id, slot: slot._id });
  } catch (err) {
    // Give the seat back if the booking row could not be written
    // (for example the same student sent two requests at the same moment).
    await Slot.updateOne({ _id: slot._id, booked: { $gt: 0 } }, { $inc: { booked: -1 } });
    if (err.code === 11000) throw ApiError.conflict('Student has already booked this slot', 'ALREADY_BOOKED');
    throw err;
  }

  announce(slot);
  const room = await Room.findOne({ roomCode: slot.roomCode }, { name: 1 });
  return {
    slotId: String(slot._id),
    roomCode: slot.roomCode,
    roomName: room ? room.name : null,
    date: slot.date,
    startHour: slot.startHour,
    seatsLeft: slot.seats - slot.booked,
    bookedAt: booking.createdAt,
  };
}

async function cancelBooking(regNo, slotId) {
  requireObjectId(slotId, 'slotId');
  const student = await studentService.getStudent(regNo);
  const booking = await Booking.findOneAndDelete({ student: student._id, slot: slotId });
  if (!booking) throw ApiError.notFound('This student has no booking for that slot', 'BOOKING_NOT_FOUND');

  const slot = await Slot.findOneAndUpdate(
    { _id: slotId, booked: { $gt: 0 } },
    { $inc: { booked: -1 } },
    { returnDocument: 'after' }
  );
  if (slot) announce(slot);
  return true;
}

module.exports = { bookSlot, cancelBooking, listBookings, listBookingsForStudentId };
