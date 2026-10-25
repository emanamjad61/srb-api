const Room = require('../models/Room');
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const ApiError = require('../utils/ApiError');
const { requireBody, requireFields, pick } = require('../utils/validate');

const EDITABLE = ['name', 'building', 'seats'];

function normalizeCode(roomCode) {
  return String(roomCode).trim().toUpperCase();
}

function rejectCodeChange(roomCode, body) {
  if (body.roomCode !== undefined && normalizeCode(body.roomCode) !== roomCode) {
    throw ApiError.unprocessable('roomCode cannot be changed after the room is created', 'ROOM_CODE_IMMUTABLE');
  }
}

async function listRooms() {
  return Room.find().sort({ roomCode: 1 });
}

async function getRoom(roomCode) {
  const room = await Room.findOne({ roomCode: normalizeCode(roomCode) });
  if (!room) throw ApiError.notFound(`Room ${roomCode} not found`, 'ROOM_NOT_FOUND');
  return room;
}

async function createRoom(body) {
  requireFields(body, ['roomCode', 'name', 'building', 'seats']);
  return Room.create(pick(body, ['roomCode', ...EDITABLE]));
}

// PUT: the whole room (except roomCode) is replaced, so every field is required.
async function replaceRoom(roomCode, body) {
  const code = normalizeCode(roomCode);
  requireBody(body);
  rejectCodeChange(code, body);
  requireFields(body, EDITABLE);
  const room = await Room.findOneAndUpdate({ roomCode: code }, pick(body, EDITABLE), {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!room) throw ApiError.notFound(`Room ${roomCode} not found`, 'ROOM_NOT_FOUND');
  return room;
}

// PATCH: only the fields that were sent are changed.
async function updateRoom(roomCode, body) {
  const code = normalizeCode(roomCode);
  requireBody(body);
  rejectCodeChange(code, body);
  const changes = pick(body, EDITABLE);
  if (Object.keys(changes).length === 0) {
    throw ApiError.badRequest(`Send at least one of: ${EDITABLE.join(', ')}`);
  }
  const room = await Room.findOneAndUpdate({ roomCode: code }, changes, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!room) throw ApiError.notFound(`Room ${roomCode} not found`, 'ROOM_NOT_FOUND');
  return room;
}

// A room with booked seats cannot be removed; otherwise its empty slots go with it.
async function deleteRoom(roomCode) {
  const room = await getRoom(roomCode);
  const slots = await Slot.find({ roomCode: room.roomCode }, { _id: 1, booked: 1 });
  if (slots.some((s) => s.booked > 0)) {
    throw ApiError.conflict(`Room ${room.roomCode} has booked slots and cannot be deleted`, 'ROOM_HAS_BOOKINGS');
  }
  const slotIds = slots.map((s) => s._id);
  await Booking.deleteMany({ slot: { $in: slotIds } });
  await Slot.deleteMany({ _id: { $in: slotIds } });
  await room.deleteOne();
}

module.exports = { listRooms, getRoom, createRoom, replaceRoom, updateRoom, deleteRoom };
