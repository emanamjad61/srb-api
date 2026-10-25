const roomService = require('../services/room.service');

// Express 5 forwards rejected promises to the error handler, so no try/catch is needed here.

async function list(_req, res) {
  res.json(await roomService.listRooms());
}

async function getOne(req, res) {
  res.json(await roomService.getRoom(req.params.roomCode));
}

async function create(req, res) {
  res.status(201).json(await roomService.createRoom(req.body));
}

async function replace(req, res) {
  res.json(await roomService.replaceRoom(req.params.roomCode, req.body));
}

async function update(req, res) {
  res.json(await roomService.updateRoom(req.params.roomCode, req.body));
}

async function remove(req, res) {
  await roomService.deleteRoom(req.params.roomCode);
  res.status(204).end();
}

module.exports = { list, getOne, create, replace, update, remove };
