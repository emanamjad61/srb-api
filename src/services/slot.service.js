const Slot = require('../models/Slot');
const ApiError = require('../utils/ApiError');
const { requireFields, requireObjectId } = require('../utils/validate');
const roomService = require('./room.service');

const SORT = { date: 1, startHour: 1, roomCode: 1 };

function buildFilter({ roomCode, date, hasSeats } = {}) {
  const filter = {};
  if (roomCode) filter.roomCode = String(roomCode).trim().toUpperCase();
  if (date) {
    if (!Slot.isRealDate(date)) throw ApiError.badRequest('date must be in YYYY-MM-DD format');
    filter.date = date;
  }
  if (hasSeats === true || hasSeats === 'true') {
    filter.$expr = { $lt: ['$booked', '$seats'] };
  }
  return filter;
}

function parsePositiveInt(value, name, fallback, max) {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw ApiError.badRequest(`${name} must be a positive whole number`);
  return max ? Math.min(n, max) : n;
}

async function createSlot(body) {
  requireFields(body, ['roomCode', 'date', 'startHour']);
  const room = await roomService.getRoom(body.roomCode);
  // seats is copied from the room at creation time; booked always starts at 0.
  return Slot.create({
    roomCode: room.roomCode,
    date: body.date,
    startHour: body.startHour,
    seats: room.seats,
    booked: 0,
  });
}

async function getSlot(id) {
  requireObjectId(id, 'slot id');
  const slot = await Slot.findById(id);
  if (!slot) throw ApiError.notFound(`Slot ${id} not found`, 'SLOT_NOT_FOUND');
  return slot;
}

async function listSlots(query = {}) {
  const filter = buildFilter(query);
  const page = parsePositiveInt(query.page, 'page', 1);
  const limit = parsePositiveInt(query.limit, 'limit', 10, 100);
  const [data, total] = await Promise.all([
    Slot.find(filter).sort(SORT).skip((page - 1) * limit).limit(limit),
    Slot.countDocuments(filter),
  ]);
  return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
}

// Unpaginated version used by GraphQL and the live board.
async function findSlots(filters = {}) {
  return Slot.find(buildFilter(filters)).sort(SORT);
}

module.exports = { createSlot, getSlot, listSlots, findSlots };
