const bookingService = require('../services/booking.service');
const { requireFields } = require('../utils/validate');

async function create(req, res) {
  requireFields(req.body, ['slotId']);
  res.status(201).json(await bookingService.bookSlot(req.params.regNo, req.body.slotId));
}

async function list(req, res) {
  res.json(await bookingService.listBookings(req.params.regNo));
}

async function remove(req, res) {
  await bookingService.cancelBooking(req.params.regNo, req.params.slotId);
  res.status(204).end();
}

module.exports = { create, list, remove };
