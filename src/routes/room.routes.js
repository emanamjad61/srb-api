const { Router } = require('express');
const rooms = require('../controllers/room.controller');

const router = Router();

router.route('/').get(rooms.list).post(rooms.create);
router.route('/:roomCode').get(rooms.getOne).put(rooms.replace).patch(rooms.update).delete(rooms.remove);

module.exports = router;
