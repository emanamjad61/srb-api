const slotService = require('../services/slot.service');

async function create(req, res) {
  res.status(201).json(await slotService.createSlot(req.body));
}

async function getOne(req, res) {
  res.json(await slotService.getSlot(req.params.id));
}

async function list(req, res) {
  res.json(await slotService.listSlots(req.query));
}

module.exports = { create, getOne, list };
